import {
  NextRequest,
  NextResponse,
} from "next/server";
import { PDFDocument } from "pdf-lib";
import JSZip from "jszip";
import { isAllowedConversionOrigin } from "@/lib/security/conversionOrigin";

import { checkUsageLimit } from "@/lib/supabase/usageLimit";
import { recordConversionUsage } from "@/lib/supabase/recordUsage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 100 * 1024 * 1024;

type SplitMode =
  | "range"
  | "custom-ranges"
  | "every-n"
  | "equal-parts";

type PageRange = {
  start: number;
  end: number;
};

type PageRangeResult = {
  mode: SplitMode;
  ranges: PageRange[];
  error: string | null;
};

const splitModeLabels: Record<SplitMode, string> = {
  range: "Extract Page Range",
  "custom-ranges": "Custom Ranges",
  "every-n": "Split Every N Pages",
  "equal-parts": "Split into Equal Parts",
};

function getText(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function parsePositiveInteger(value: string) {
  const text = value.trim();

  if (!/^\d+$/.test(text)) {
    return null;
  }

  const number = Number(text);

  return Number.isSafeInteger(number) && number > 0
    ? number
    : null;
}

function validatePageRange(
  start: number | null,
  end: number | null,
  pageCount: number
) {
  if (start === null || end === null) {
    return "Enter both start and end page numbers.";
  }

  if (start < 1 || end < 1) {
    return "Page numbers cannot be below 1.";
  }

  if (start > pageCount || end > pageCount) {
    return `Page numbers cannot be above ${pageCount}.`;
  }

  if (start > end) {
    return "Start page cannot be greater than end page.";
  }

  return null;
}

function parseCustomRanges(
  customRanges: string,
  pageCount: number
): Pick<PageRangeResult, "ranges" | "error"> {
  const text = customRanges.trim();

  if (!text) {
    return {
      ranges: [],
      error: "Enter at least one page range.",
    };
  }

  const segments = text.split(",");

  if (segments.some((segment) => segment.trim() === "")) {
    return {
      ranges: [],
      error: "Remove empty custom range entries.",
    };
  }

  const ranges: PageRange[] = [];

  for (const segment of segments) {
    const cleanSegment = segment.trim();
    const match = cleanSegment.match(/^(\d+)(?:\s*-\s*(\d+))?$/);

    if (!match) {
      return {
        ranges: [],
        error: `Invalid range "${cleanSegment}". Use formats like 1-4 or 7.`,
      };
    }

    const start = parsePositiveInteger(match[1]);
    const end = parsePositiveInteger(match[2] || match[1]);
    const rangeError = validatePageRange(start, end, pageCount);

    if (rangeError) {
      return {
        ranges: [],
        error: `${cleanSegment}: ${rangeError}`,
      };
    }

    ranges.push({
      start: start as number,
      end: end as number,
    });
  }

  return {
    ranges,
    error: null,
  };
}

function buildEveryNRanges(
  everyNText: string,
  pageCount: number
): Pick<PageRangeResult, "ranges" | "error"> {
  const everyN = parsePositiveInteger(everyNText);

  if (everyN === null) {
    return {
      ranges: [],
      error: "Enter how many pages should be placed in each PDF.",
    };
  }

  if (everyN > pageCount) {
    return {
      ranges: [],
      error: `Pages per PDF cannot be more than ${pageCount}.`,
    };
  }

  const ranges: PageRange[] = [];

  for (let start = 1; start <= pageCount; start += everyN) {
    ranges.push({
      start,
      end: Math.min(start + everyN - 1, pageCount),
    });
  }

  return {
    ranges,
    error: null,
  };
}

function buildEqualPartRanges(
  equalPartsText: string,
  pageCount: number
): Pick<PageRangeResult, "ranges" | "error"> {
  const parts = parsePositiveInteger(equalPartsText);

  if (parts === null) {
    return {
      ranges: [],
      error: "Enter how many parts you want.",
    };
  }

  if (parts < 2) {
    return {
      ranges: [],
      error: "Equal parts must be 2 or more.",
    };
  }

  if (parts > pageCount) {
    return {
      ranges: [],
      error: `Parts cannot be more than ${pageCount}.`,
    };
  }

  const ranges: PageRange[] = [];

  for (let index = 0; index < parts; index += 1) {
    const start = Math.floor((index * pageCount) / parts) + 1;
    const end = Math.floor(((index + 1) * pageCount) / parts);

    if (start <= end) {
      ranges.push({
        start,
        end,
      });
    }
  }

  return {
    ranges,
    error: null,
  };
}

function buildPageRanges(
  formData: FormData,
  pageCount: number
): PageRangeResult {
  const requestedMode = getText(formData, "splitMode") as SplitMode;
  const mode = splitModeLabels[requestedMode]
    ? requestedMode
    : "every-n";

  if (mode === "range") {
    const start = parsePositiveInteger(getText(formData, "rangeStart"));
    const end = parsePositiveInteger(getText(formData, "rangeEnd"));
    const rangeError = validatePageRange(start, end, pageCount);

    return {
      mode,
      ranges: rangeError
        ? []
        : [
            {
              start: start as number,
              end: end as number,
            },
          ],
      error: rangeError,
    };
  }

  if (mode === "custom-ranges") {
    const result = parseCustomRanges(
      getText(formData, "customRanges"),
      pageCount
    );

    return {
      mode,
      ...result,
    };
  }

  if (mode === "equal-parts") {
    const result = buildEqualPartRanges(
      getText(formData, "equalParts"),
      pageCount
    );

    return {
      mode,
      ...result,
    };
  }

  const result = buildEveryNRanges(
    getText(formData, "everyN") || "1",
    pageCount
  );

  return {
    mode,
    ...result,
  };
}

function sanitizeFileName(fileName: string) {
  return fileName
    .replace(/\.pdf$/i, "")
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "document";
}

function rangeSlug(range: PageRange) {
  return range.start === range.end
    ? `page-${range.start}`
    : `pages-${range.start}-${range.end}`;
}

function buildOutputFileName(
  cleanOriginalName: string,
  range: PageRange,
  index: number,
  total: number
) {
  if (total === 1) {
    return `${cleanOriginalName}-${rangeSlug(range)}.pdf`;
  }

  return `${String(index + 1).padStart(2, "0")}-${cleanOriginalName}-${rangeSlug(range)}.pdf`;
}

async function createPdfForRange(
  sourcePdf: PDFDocument,
  range: PageRange
) {
  const outputPdf = await PDFDocument.create();
  const pageIndexes = Array.from(
    {
      length: range.end - range.start + 1,
    },
    (_, index) => range.start - 1 + index
  );
  const copiedPages = await outputPdf.copyPages(sourcePdf, pageIndexes);

  copiedPages.forEach((page) => {
    outputPdf.addPage(page);
  });

  return outputPdf.save();
}

export async function POST(
  request: NextRequest
) {
  if (!isAllowedConversionOrigin(request)) {
    return NextResponse.json(
      { error: "Request origin is not allowed." },
      { status: 403 }
    );
  }

  const usage = await checkUsageLimit();

  if (!usage.allowed) {
    return NextResponse.json(
      {
        success: false,
        message: usage.reason,
        remaining: usage.remaining,
        limit: usage.limit,
      },
      {
        status: usage.status ?? 429,
      }
    );
  }

  try {
    const formData = await request.formData();
    const uploadedFile = formData.get("file");

    if (!(uploadedFile instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          message: "Please upload one PDF file.",
        },
        {
          status: 400,
        }
      );
    }

    if (uploadedFile.size === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "The uploaded PDF is empty.",
        },
        {
          status: 400,
        }
      );
    }

    if (uploadedFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          message: "Maximum file size is 100 MB.",
        },
        {
          status: 413,
        }
      );
    }

    const extension = uploadedFile.name.split(".").pop()?.toLowerCase();

    if (extension !== "pdf") {
      return NextResponse.json(
        {
          success: false,
          message: "Only PDF files are allowed.",
        },
        {
          status: 400,
        }
      );
    }

    const uploadedBytes = await uploadedFile.arrayBuffer();
    const sourceBytes = new Uint8Array(uploadedBytes);

    let sourcePdf: PDFDocument;

    try {
      sourcePdf = await PDFDocument.load(sourceBytes, {
        ignoreEncryption: false,
      });
    } catch (error) {
      console.error("Unable to open PDF:", error);

      return NextResponse.json(
        {
          success: false,
          message:
            "The PDF could not be opened. It may be damaged or password-protected.",
        },
        {
          status: 400,
        }
      );
    }

    const pageCount = sourcePdf.getPageCount();

    if (pageCount < 1) {
      return NextResponse.json(
        {
          success: false,
          message: "The uploaded PDF has no pages.",
        },
        {
          status: 400,
        }
      );
    }

    const rangeResult = buildPageRanges(formData, pageCount);

    if (rangeResult.error || rangeResult.ranges.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: rangeResult.error || "Choose a valid split range.",
          pageCount,
        },
        {
          status: 400,
        }
      );
    }

    const cleanOriginalName = sanitizeFileName(uploadedFile.name);
    const rangesHeader = rangeResult.ranges
      .map((range) => `${range.start}-${range.end}`)
      .join(",");

    if (rangeResult.ranges.length === 1) {
      const [range] = rangeResult.ranges;
      const pdfBytes = await createPdfForRange(sourcePdf, range);

      if (pdfBytes.byteLength === 0) {
        throw new Error("PDF generation returned an empty file.");
      }

      const outputFileName = buildOutputFileName(
        cleanOriginalName,
        range,
        0,
        1
      );
      const pdfBuffer = Buffer.from(pdfBytes);

      await recordConversionUsage({
        tool: "split-pdf",
        identityType: usage.identityType,
        identityId: usage.identityId,
      });

      console.log("Split completed:", {
        mode: splitModeLabels[rangeResult.mode],
        pageCount,
        outputCount: 1,
        outputFileName,
      });

      return new Response(pdfBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${outputFileName}"`,
          "Cache-Control": "no-store, no-cache, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
          "X-Split-Mode": splitModeLabels[rangeResult.mode],
          "X-Split-File-Count": "1",
          "X-Split-Ranges": rangesHeader,
        },
      });
    }

    const zip = new JSZip();

    for (const [index, range] of rangeResult.ranges.entries()) {
      const pdfBytes = await createPdfForRange(sourcePdf, range);
      const outputFileName = buildOutputFileName(
        cleanOriginalName,
        range,
        index,
        rangeResult.ranges.length
      );

      zip.file(outputFileName, pdfBytes);
    }

    const zipBytes = await zip.generateAsync({
      type: "uint8array",
      compression: "DEFLATE",
      compressionOptions: {
        level: 6,
      },
    });

    if (zipBytes.byteLength === 0) {
      throw new Error("ZIP generation returned an empty file.");
    }

    const outputFileName = `${cleanOriginalName}-split.zip`;
    const zipBuffer = Buffer.from(zipBytes);

    await recordConversionUsage({
      tool: "split-pdf",
      identityType: usage.identityType,
      identityId: usage.identityId,
    });

    console.log("Split completed:", {
      mode: splitModeLabels[rangeResult.mode],
      pageCount,
      outputCount: rangeResult.ranges.length,
      outputFileName,
    });

    return new Response(zipBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${outputFileName}"`,
        "Cache-Control": "no-store, no-cache, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
        "X-Split-Mode": splitModeLabels[rangeResult.mode],
        "X-Split-File-Count": String(rangeResult.ranges.length),
        "X-Split-Ranges": rangesHeader,
      },
    });
  } catch (error) {
    console.error("Split PDF route error:", error);

    const message =
      error instanceof Error ? error.message : "Unknown server error.";

    return NextResponse.json(
      {
        success: false,
        message: `Unable to split the PDF: ${message}`,
      },
      {
        status: 500,
      }
    );
  }
}
