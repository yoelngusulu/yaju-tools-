import {
  NextRequest,
  NextResponse,
} from "next/server";
import { PDFDocument } from "pdf-lib";
import { isAllowedConversionOrigin } from "@/lib/security/conversionOrigin";

import { checkUsageLimit } from "@/lib/supabase/usageLimit";
import { recordConversionUsage } from "@/lib/supabase/recordUsage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 100 * 1024 * 1024;

type ParsedPageSelection = {
  pageIndexes: number[];
  pageCount: number;
};

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

function parsePageRanges(
  value: string,
  pageCount: number,
  fileName: string
): ParsedPageSelection {
  const text = value.trim();

  if (!text || text.toLowerCase() === "all") {
    return {
      pageIndexes: Array.from(
        { length: pageCount },
        (_, index) => index
      ),
      pageCount,
    };
  }

  const segments = text.split(",");

  if (segments.some((segment) => segment.trim() === "")) {
    throw new Error(
      `${fileName}: remove empty page range entries.`
    );
  }

  const pageIndexes: number[] = [];

  for (const segment of segments) {
    const cleanSegment = segment.trim();
    const match = cleanSegment.match(/^(\d+)(?:\s*-\s*(\d+))?$/);

    if (!match) {
      throw new Error(
        `${fileName}: invalid page range "${cleanSegment}". Use formats like 1-5 or 7.`
      );
    }

    const start = parsePositiveInteger(match[1]);
    const end = parsePositiveInteger(match[2] || match[1]);

    if (start === null || end === null) {
      throw new Error(`${fileName}: invalid page range "${cleanSegment}".`);
    }

    if (start < 1 || end < 1) {
      throw new Error(`${fileName}: page numbers cannot be below 1.`);
    }

    if (start > pageCount || end > pageCount) {
      throw new Error(
        `${fileName}: page numbers cannot be above ${pageCount}.`
      );
    }

    if (start > end) {
      throw new Error(
        `${fileName}: range "${cleanSegment}" is reversed. Start page must be smaller than end page.`
      );
    }

    for (let pageNumber = start; pageNumber <= end; pageNumber += 1) {
      pageIndexes.push(pageNumber - 1);
    }
  }

  if (pageIndexes.length === 0) {
    throw new Error(`${fileName}: select at least one page.`);
  }

  return {
    pageIndexes,
    pageCount: pageIndexes.length,
  };
}

function getFriendlyPdfOpenError(fileName: string, error: unknown) {
  const message = error instanceof Error ? error.message : "";

  if (/encrypt|password/i.test(message)) {
    return `${fileName} is password-protected and cannot be processed.`;
  }

  return `${fileName} could not be opened. It may be corrupted or not a valid PDF.`;
}

function getPageRangeText(formData: FormData, index: number) {
  const value = formData.getAll("pageRanges")[index];

  return typeof value === "string" ? value.trim() : "all";
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
    const uploadedFiles = formData
      .getAll("files")
      .filter((item): item is File => item instanceof File);

    if (uploadedFiles.length < 2) {
      return NextResponse.json(
        {
          success: false,
          message: "Please upload at least two PDF files.",
        },
        {
          status: 400,
        }
      );
    }

    for (const file of uploadedFiles) {
      if (file.size === 0) {
        return NextResponse.json(
          {
            success: false,
            message: `${file.name} is empty.`,
          },
          {
            status: 400,
          }
        );
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          {
            success: false,
            message: `${file.name} exceeds the 100 MB file size limit.`,
          },
          {
            status: 413,
          }
        );
      }

      if (!file.name.toLowerCase().endsWith(".pdf")) {
        return NextResponse.json(
          {
            success: false,
            message: `${file.name} is not a PDF file.`,
          },
          {
            status: 400,
          }
        );
      }
    }

    const mergedPdf = await PDFDocument.create();
    let totalMergedPages = 0;

    for (const [index, file] of uploadedFiles.entries()) {
      const bytes = await file.arrayBuffer();
      let pdf: PDFDocument;

      try {
        pdf = await PDFDocument.load(bytes, {
          ignoreEncryption: false,
        });
      } catch (error) {
        return NextResponse.json(
          {
            success: false,
            message: getFriendlyPdfOpenError(file.name, error),
          },
          {
            status: 400,
          }
        );
      }

      const sourcePageCount = pdf.getPageCount();

      if (sourcePageCount < 1) {
        return NextResponse.json(
          {
            success: false,
            message: `${file.name} has no pages.`,
          },
          {
            status: 400,
          }
        );
      }

      let selection: ParsedPageSelection;

      try {
        selection = parsePageRanges(
          getPageRangeText(formData, index),
          sourcePageCount,
          file.name
        );
      } catch (error) {
        return NextResponse.json(
          {
            success: false,
            message:
              error instanceof Error
                ? error.message
                : "Invalid page range selection.",
          },
          {
            status: 400,
          }
        );
      }

      const pages = await mergedPdf.copyPages(pdf, selection.pageIndexes);

      pages.forEach((page) => {
        mergedPdf.addPage(page);
      });

      totalMergedPages += selection.pageCount;
    }

    if (totalMergedPages < 1) {
      return NextResponse.json(
        {
          success: false,
          message: "Select at least one page to merge.",
        },
        {
          status: 400,
        }
      );
    }

    const mergedBytes = await mergedPdf.save();

    if (mergedBytes.byteLength === 0) {
      throw new Error("The merged PDF is empty.");
    }

    await recordConversionUsage({
      tool: "merge-pdf",
      identityType: usage.identityType,
      identityId: usage.identityId,
    });

    const outputFileName = "DocMaster_Merged.pdf";

    console.log("Merge completed:", {
      fileCount: uploadedFiles.length,
      totalMergedPages,
      outputFileName,
    });

    return new NextResponse(Buffer.from(mergedBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${outputFileName}"`,
        "Cache-Control": "no-store",
        "X-Merged-File-Count": String(uploadedFiles.length),
        "X-Merged-Page-Count": String(totalMergedPages),
      },
    });
  } catch (error) {
    console.error("Merge PDF error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Unable to merge PDFs.",
      },
      {
        status: 500,
      }
    );
  }
}
