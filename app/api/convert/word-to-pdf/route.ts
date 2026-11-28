import {
  NextRequest,
  NextResponse,
} from "next/server";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";

import {
  NATIVE_CONVERSION_UNAVAILABLE_MESSAGE,
  isNativeDependencyError,
  runNativeExecutable,
} from "@/lib/nativeExecutables";
import { checkUsageLimit } from "@/lib/supabase/usageLimit";
import { isAllowedConversionOrigin } from "@/lib/security/conversionOrigin";
import { recordConversionUsage } from "@/lib/supabase/recordUsage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedExtensions = [
  ".doc",
  ".docx",
];

export async function POST(
  request: NextRequest
) {
  if (!isAllowedConversionOrigin(request)) {
    return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 });
  }
  const usage =
    await checkUsageLimit("word-to-pdf");

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

  let workingDirectory = "";

  try {
    const formData =
      await request.formData();

    const uploadedFile =
      formData.get("file");

    if (!(uploadedFile instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "No Word document was uploaded.",
        },
        {
          status: 400,
        }
      );
    }

    const extension =
      path
        .extname(
          uploadedFile.name
        )
        .toLowerCase();

    if (
      !allowedExtensions.includes(
        extension
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Only DOC and DOCX files are allowed.",
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
          success: false,
          message:
            "The maximum allowed file size is 100 MB.",
        },
        {
          status: 400,
        }
      );
    }

    const uniqueId =
      crypto.randomUUID();

    workingDirectory =
      path.join(
        os.tmpdir(),
        `docmaster-${uniqueId}`
      );

    const outputDirectory =
      path.join(
        workingDirectory,
        "output"
      );

    await fs.mkdir(
      outputDirectory,
      {
        recursive: true,
      }
    );

    const safeBaseName =
      path
        .basename(
          uploadedFile.name,
          extension
        )
        .replace(
          /[^a-zA-Z0-9-_]/g,
          "_"
        ) || "document";

    const inputFilePath =
      path.join(
        workingDirectory,
        `${safeBaseName}${extension}`
      );

    const fileBuffer =
      Buffer.from(
        await uploadedFile.arrayBuffer()
      );

    await fs.writeFile(
      inputFilePath,
      fileBuffer
    );

    const conversionResult =
      await runNativeExecutable(
        "libreoffice",
        [
          "--headless",
          "--convert-to",
          "pdf",
          "--outdir",
          outputDirectory,
          inputFilePath,
        ],
        {
          timeoutMs: 120000,
        }
      );

    if (conversionResult.exitCode !== 0) {
      throw new Error(
        conversionResult.stderr.trim() ||
          conversionResult.stdout.trim() ||
          "LibreOffice conversion failed."
      );
    }

    const convertedFilePath =
      path.join(
        outputDirectory,
        `${safeBaseName}.pdf`
      );

    try {
      await fs.access(
        convertedFilePath
      );
    } catch {
      return NextResponse.json(
        {
          success: false,
          message:
            "Unable to convert the Word document.",
        },
        {
          status: 500,
        }
      );
    }

    const convertedFile =
      await fs.readFile(
        convertedFilePath
      );

    if (
      convertedFile.byteLength === 0
    ) {
      throw new Error(
        "The converted PDF file is empty."
      );
    }

    await recordConversionUsage({
      tool: "word-to-pdf",
      identityType:
        usage.identityType,
      identityId:
        usage.identityId,
    });

    return new NextResponse(
      convertedFile,
      {
        status: 200,
        headers: {
          "Content-Type":
            "application/pdf",

          "Content-Disposition":
            `attachment; filename="${safeBaseName}.pdf"`,

          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "Word to PDF conversion error:",
      error
    );

    if (isNativeDependencyError(error)) {
      return NextResponse.json(
        {
          success: false,
          message: NATIVE_CONVERSION_UNAVAILABLE_MESSAGE,
        },
        {
          status: 503,
        }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to convert the Word document.",
      },
      {
        status: 500,
      }
    );
  } finally {
    if (workingDirectory) {
      await fs.rm(
        workingDirectory,
        {
          recursive: true,
          force: true,
        }
      );
    }
  }
}
