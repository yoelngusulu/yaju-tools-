import {
  mkdir,
  readFile,
  rm,
  writeFile,
} from "fs/promises";
import { isAllowedConversionOrigin } from "@/lib/security/conversionOrigin";

import os from "os";
import path from "path";
import crypto from "crypto";

import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  NATIVE_CONVERSION_UNAVAILABLE_MESSAGE,
  isNativeDependencyError,
} from "@/lib/nativeExecutables";
import { runQpdf } from "@/lib/pdf/qpdf";
import { checkUsageLimit } from "@/lib/supabase/usageLimit";
import { recordConversionUsage } from "@/lib/supabase/recordUsage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sanitizeFileName(
  fileName: string
) {
  return fileName
    .replace(
      /[<>:"/\\|?*\x00-\x1F]/g,
      "-"
    )
    .trim();
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

  const usage =
    await checkUsageLimit();

  if (!usage.allowed) {
    return NextResponse.json(
      {
        message: usage.reason,
        remaining:
          usage.remaining,
        limit: usage.limit,
      },
      {
        status: usage.status ?? 429,
      }
    );
  }

  let temporaryDirectory = "";

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
            "Please select one PDF file.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      typeof passwordValue !==
        "string" ||
      !passwordValue.trim()
    ) {
      return NextResponse.json(
        {
          message:
            "Please enter the PDF password.",
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

    if (
      uploadedFile.size === 0
    ) {
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

    const password =
      passwordValue.trim();

    temporaryDirectory =
      path.join(
        os.tmpdir(),
        `docmaster-unlock-${crypto.randomUUID()}`
      );

    await mkdir(
      temporaryDirectory,
      {
        recursive: true,
      }
    );

    const safeOriginalName =
      sanitizeFileName(
        uploadedFile.name
      );

    const originalBaseName =
      safeOriginalName.replace(
        /\.pdf$/i,
        ""
      );

    const inputPath =
      path.join(
        temporaryDirectory,
        safeOriginalName
      );

    const outputFileName =
      `${originalBaseName}-unlocked.pdf`;

    const outputPath =
      path.join(
        temporaryDirectory,
        outputFileName
      );

    const fileBuffer =
      Buffer.from(
        await uploadedFile.arrayBuffer()
      );

    await writeFile(
      inputPath,
      fileBuffer
    );

    await runQpdf([
      `--password=${password}`,
      "--decrypt",
      "--",
      inputPath,
      outputPath,
    ]);

    const unlockedPdf =
      await readFile(
        outputPath
      );

    if (
      unlockedPdf.byteLength === 0
    ) {
      throw new Error(
        "The unlocked PDF is empty."
      );
    }

    await recordConversionUsage({
      tool: "unlock-pdf",
      identityType:
        usage.identityType,
      identityId:
        usage.identityId,
    });

    return new NextResponse(
      unlockedPdf,
      {
        status: 200,
        headers: {
          "Content-Type":
            "application/pdf",

          "Content-Disposition":
            `attachment; filename="${outputFileName}"`,

          "Content-Length":
            unlockedPdf.length.toString(),

          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "Unlock PDF error:",
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

    const message =
      error instanceof Error
        ? error.message
        : "Unable to unlock the PDF.";

    const normalizedMessage =
      message.toLowerCase();

    const incorrectPassword =
      normalizedMessage.includes(
        "invalid password"
      ) ||
      normalizedMessage.includes(
        "incorrect password"
      ) ||
      normalizedMessage.includes(
        "password is incorrect"
      ) ||
      normalizedMessage.includes(
        "invalid password supplied"
      );

    if (incorrectPassword) {
      return NextResponse.json(
        {
          message:
            "The PDF password is incorrect.",
        },
        {
          status: 401,
        }
      );
    }

    return NextResponse.json(
      {
        message:
          "Unable to unlock the PDF.",
      },
      {
        status: 500,
      }
    );
  } finally {
    if (temporaryDirectory) {
      await rm(
        temporaryDirectory,
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
