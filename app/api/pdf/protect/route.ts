import {
  NextRequest,
  NextResponse,
} from "next/server";
import {
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "fs/promises";
import path from "path";
import os from "os";
import crypto from "crypto";
import { isAllowedConversionOrigin } from "@/lib/security/conversionOrigin";

import {
  NATIVE_CONVERSION_UNAVAILABLE_MESSAGE,
  isNativeDependencyError,
} from "@/lib/nativeExecutables";
import { runQpdf } from "@/lib/pdf/qpdf";
import { checkUsageLimit } from "@/lib/supabase/usageLimit";
import { recordConversionUsage } from "@/lib/supabase/recordUsage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest
) {
  if (!isAllowedConversionOrigin(request)) {
    return NextResponse.json(
      { error: "Request origin is not allowed." },
      { status: 403 }
    );
  }

  const usage =
    await checkUsageLimit();

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

  let tempDirectory = "";

  try {
    const formData =
      await request.formData();

    const uploadedFile =
      formData.get("file");

    const passwordValue =
      formData.get("password");

    if (
      !(uploadedFile instanceof File)
    ) {
      return NextResponse.json(
        {
          message:
            "Please upload one PDF file.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      typeof passwordValue !== "string" ||
      passwordValue.trim().length < 6
    ) {
      return NextResponse.json(
        {
          message:
            "Password must contain at least 6 characters.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !uploadedFile.name
        .toLowerCase()
        .endsWith(".pdf")
    ) {
      return NextResponse.json(
        {
          message:
            "Only PDF files are allowed.",
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
            "The uploaded PDF is empty.",
        },
        {
          status: 400,
        }
      );
    }

    const maximumFileSize =
      100 * 1024 * 1024;

    if (
      uploadedFile.size >
      maximumFileSize
    ) {
      return NextResponse.json(
        {
          message:
            "Maximum file size is 100 MB.",
        },
        {
          status: 413,
        }
      );
    }

    tempDirectory =
      await mkdtemp(
        path.join(
          os.tmpdir(),
          "docmaster-protect-"
        )
      );

    const uniqueId =
      crypto.randomUUID();

    const inputPath =
      path.join(
        tempDirectory,
        `${uniqueId}-input.pdf`
      );

    const outputPath =
      path.join(
        tempDirectory,
        `${uniqueId}-protected.pdf`
      );

    const inputBytes =
      Buffer.from(
        await uploadedFile.arrayBuffer()
      );

    await writeFile(
      inputPath,
      inputBytes
    );

    const userPassword =
      passwordValue.trim();

    const ownerPassword =
      crypto.randomBytes(24).toString(
        "hex"
      );

    await runQpdf([
      "--encrypt",
      userPassword,
      ownerPassword,
      "256",
      "--",
      inputPath,
      outputPath,
    ]);

    const protectedPdf =
      await readFile(
        outputPath
      );

    if (
      protectedPdf.byteLength === 0
    ) {
      throw new Error(
        "The protected PDF is empty."
      );
    }

    const originalName =
      uploadedFile.name.replace(
        /\.pdf$/i,
        ""
      );

    await recordConversionUsage({
      tool: "protect-pdf",
      identityType:
        usage.identityType,
      identityId:
        usage.identityId,
    });

    return new Response(
      Buffer.from(
        protectedPdf
      ),
      {
        status: 200,
        headers: {
          "Content-Type":
            "application/pdf",

          "Content-Disposition":
            `attachment; filename="${originalName}-protected.pdf"`,

          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "Protect PDF error:",
      error
    );

    if (isNativeDependencyError(error)) {
      return NextResponse.json(
        {
          message: NATIVE_CONVERSION_UNAVAILABLE_MESSAGE,
        },
        {
          status: 503,
        }
      );
    }

    return NextResponse.json(
      {
        message:
          "Unable to protect the PDF.",
      },
      {
        status: 500,
      }
    );
  } finally {
    if (tempDirectory) {
      await rm(
        tempDirectory,
        {
          recursive: true,
          force: true,
        }
      ).catch(
        () => undefined
      );
    }
  }
}
