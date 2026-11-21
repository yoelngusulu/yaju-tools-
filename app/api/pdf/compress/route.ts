 import JSZip from "jszip";
import {
  NextRequest,
  NextResponse,
} from "next/server";
import { PDFDocument } from "pdf-lib";
import { isAllowedConversionOrigin } from "@/lib/security/conversionOrigin";

import { recordConversionUsage } from "@/lib/supabase/recordUsage";
import { checkUsageLimit } from "@/lib/supabase/usageLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const MAX_PDF_FILE_SIZE = 100 * 1024 * 1024;
const MAX_ZIP_FILE_SIZE = 200 * 1024 * 1024;

function sanitizeFileName(fileName: string) {
  return fileName
    .replace(/\\/g, "/")
    .split("/")
    .pop()
    ?.replace(/[^\w.\- ]+/g, "")
    .trim() || "document.pdf";
}

function isPdfFile(fileName: string) {
  return fileName.toLowerCase().endsWith(".pdf");
}

function isZipFile(fileName: string) {
  return fileName.toLowerCase().endsWith(".zip");
}

async function compressPdfBytes(
  sourceBytes: Uint8Array
) {
  const pdfDocument = await PDFDocument.load(
    sourceBytes
  );

  const compressedBytes =
    await pdfDocument.save({
      useObjectStreams: true,
      addDefaultPage: false,
    });

  if (compressedBytes.byteLength === 0) {
    throw new Error(
      "The compressed PDF is empty."
    );
  }

  return compressedBytes;
}

function compressedPdfName(fileName: string) {
  return (
    sanitizeFileName(fileName).replace(
      /\.pdf$/i,
      ""
    ) + "-compressed.pdf"
  );
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

  const usage = await checkUsageLimit(
    "compress-pdf"
  );

  if (!usage.allowed) {
    return NextResponse.json(
      {
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
    const formData =
      await request.formData();

    const uploadedFile =
      formData.get("file");

    if (!(uploadedFile instanceof File)) {
      return NextResponse.json(
        {
          message:
            "Please upload one PDF or ZIP file.",
        },
        {
          status: 400,
        }
      );
    }

    if (uploadedFile.size === 0) {
      return NextResponse.json(
        {
          message:
            "The uploaded file is empty.",
        },
        {
          status: 400,
        }
      );
    }

    const fileName = uploadedFile.name;

    if (isZipFile(fileName)) {
      if (
        uploadedFile.size >
        MAX_ZIP_FILE_SIZE
      ) {
        return NextResponse.json(
          {
            message:
              "Maximum ZIP file size is 200 MB.",
          },
          {
            status: 413,
          }
        );
      }

      const sourceZip =
        await JSZip.loadAsync(
          await uploadedFile.arrayBuffer()
        );

      const outputZip = new JSZip();
      let compressedCount = 0;

      for (const entry of Object.values(
        sourceZip.files
      )) {
        if (
          entry.dir ||
          !isPdfFile(entry.name)
        ) {
          continue;
        }

        const pdfBytes =
          await entry.async("uint8array");

        if (
          pdfBytes.byteLength === 0 ||
          pdfBytes.byteLength >
            MAX_PDF_FILE_SIZE
        ) {
          continue;
        }

        const compressedBytes =
          await compressPdfBytes(pdfBytes);

        outputZip.file(
          compressedPdfName(entry.name),
          compressedBytes
        );

        compressedCount += 1;
      }

      if (compressedCount === 0) {
        return NextResponse.json(
          {
            message:
              "The ZIP file does not contain any valid PDF files under 100 MB.",
          },
          {
            status: 400,
          }
        );
      }

      const zipBytes =
        await outputZip.generateAsync({
          type: "uint8array",
          compression: "DEFLATE",
        });

      await recordConversionUsage({
        tool: "compress-pdf",
        identityType: usage.identityType,
        identityId: usage.identityId,
      });

      const outputName =
        sanitizeFileName(fileName).replace(
          /\.zip$/i,
          ""
        ) + "-compressed-pdfs.zip";

      return new Response(
        Buffer.from(zipBytes),
        {
          status: 200,
          headers: {
            "Content-Type":
              "application/zip",
            "Content-Disposition": `attachment; filename="${outputName}"`,
            "Cache-Control": "no-store",
          },
        }
      );
    }

    if (!isPdfFile(fileName)) {
      return NextResponse.json(
        {
          message:
            "Please upload a PDF or ZIP file.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      uploadedFile.size >
      MAX_PDF_FILE_SIZE
    ) {
      return NextResponse.json(
        {
          message:
            "Maximum PDF file size is 100 MB.",
        },
        {
          status: 413,
        }
      );
    }

    const sourceBytes =
      new Uint8Array(
        await uploadedFile.arrayBuffer()
      );

    const compressedBytes =
      await compressPdfBytes(sourceBytes);

    await recordConversionUsage({
      tool: "compress-pdf",
      identityType: usage.identityType,
      identityId: usage.identityId,
    });

    return new Response(
      Buffer.from(compressedBytes),
      {
        status: 200,
        headers: {
          "Content-Type":
            "application/pdf",
          "Content-Disposition": `attachment; filename="${compressedPdfName(fileName)}"`,
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "Compress PDF error:",
      error
    );

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unable to compress PDF.",
      },
      {
        status: 500,
      }
    );
  }
}