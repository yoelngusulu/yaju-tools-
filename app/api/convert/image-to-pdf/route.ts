import path from "path";
import { PDFDocument } from "pdf-lib";

import { checkUsageLimit } from "@/lib/supabase/usageLimit";
import { recordConversionUsage } from "@/lib/supabase/recordUsage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 100 * 1024 * 1024;

function getImageType(fileName: string) {
  const extension = path
    .extname(fileName)
    .toLowerCase();

  if (
    extension === ".jpg" ||
    extension === ".jpeg"
  ) {
    return "jpg";
  }

  if (extension === ".png") {
    return "png";
  }

  return null;
}

function getPdfPageSize(
  imageWidth: number,
  imageHeight: number
) {
  const maxPageWidth = 1440;
  const maxPageHeight = 1440;

  const scale = Math.min(
    maxPageWidth / imageWidth,
    maxPageHeight / imageHeight,
    1
  );

  return {
    width: imageWidth * scale,
    height: imageHeight * scale,
  };
}

export async function POST(
  request: Request
) {
  const usage =
    await checkUsageLimit("image-to-pdf");

  if (!usage.allowed) {
    return Response.json(
      {
        error: usage.reason,
        remaining: usage.remaining,
        limit: usage.limit,
      },
      {
        status: 429,
      }
    );
  }

  try {
    const formData =
      await request.formData();

    const files = formData
      .getAll("files")
      .filter(
        (item): item is File =>
          item instanceof File
      );

    if (files.length === 0) {
      return Response.json(
        {
          error:
            "Please upload at least one image.",
        },
        {
          status: 400,
        }
      );
    }

    const pdfDocument =
      await PDFDocument.create();

    for (const file of files) {
      if (file.size === 0) {
        return Response.json(
          {
            error: `The uploaded image is empty: ${file.name}`,
          },
          {
            status: 400,
          }
        );
      }

      if (file.size > MAX_FILE_SIZE) {
        return Response.json(
          {
            error: `Maximum file size is 100 MB: ${file.name}`,
          },
          {
            status: 413,
          }
        );
      }

      const imageType =
        getImageType(file.name);

      if (!imageType) {
        return Response.json(
          {
            error:
              "Only JPG, JPEG and PNG images are supported.",
          },
          {
            status: 400,
          }
        );
      }

      const bytes = new Uint8Array(
        await file.arrayBuffer()
      );

      let image;

      try {
        image =
          imageType === "jpg"
            ? await pdfDocument.embedJpg(bytes)
            : await pdfDocument.embedPng(bytes);
      } catch {
        return Response.json(
          {
            error: `The uploaded file could not be read as a valid JPG or PNG: ${file.name}`,
          },
          {
            status: 400,
          }
        );
      }

      const { width, height } =
        getPdfPageSize(
          image.width,
          image.height
        );

      const page = pdfDocument.addPage([
        width,
        height,
      ]);

      page.drawImage(image, {
        x: 0,
        y: 0,
        width,
        height,
      });
    }

    if (pdfDocument.getPageCount() === 0) {
      throw new Error(
        "The PDF document has no pages."
      );
    }

    const pdfBytes =
      await pdfDocument.save();

    if (pdfBytes.byteLength === 0) {
      throw new Error(
        "The generated PDF file is empty."
      );
    }

    await recordConversionUsage({
      tool: "image-to-pdf",
      identityType:
        usage.identityType,
      identityId:
        usage.identityId,
    });

    return new Response(
      Buffer.from(pdfBytes),
      {
        status: 200,
        headers: {
          "Content-Type":
            "application/pdf",
          "Content-Disposition":
            'attachment; filename="images-to-pdf.pdf"',
          "Content-Length":
            pdfBytes.byteLength.toString(),
          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "Image to PDF API error:",
      error
    );

    return Response.json(
      {
        error:
          "Unable to convert images to PDF.",
      },
      {
        status: 500,
      }
    );
  }
}
