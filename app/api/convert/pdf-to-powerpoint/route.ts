import {
  NextRequest,
  NextResponse,
} from "next/server";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";

import {
  NATIVE_CONVERSION_UNAVAILABLE_MESSAGE,
  isNativeDependencyError,
  isPythonRuntimeError,
  runNativeExecutable,
} from "@/lib/nativeExecutables";
import { checkUsageLimit } from "@/lib/supabase/usageLimit";
import { isAllowedConversionOrigin } from "@/lib/security/conversionOrigin";
import { recordConversionUsage } from "@/lib/supabase/recordUsage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest
) {
  if (!isAllowedConversionOrigin(request)) {
    return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 });
  }
  const usage =
    await checkUsageLimit("pdf-to-powerpoint");

  if (!usage.allowed) {
    return NextResponse.json(
      {
        error: usage.reason,
        remaining: usage.remaining,
        limit: usage.limit,
      },
      {
        status: usage.status ?? 429,
      }
    );
  }

  const tempDirectory = path.join(
    os.tmpdir(),
    `docmaster-pdf-to-ppt-${crypto.randomUUID()}`
  );

  try {
    await fs.mkdir(
      tempDirectory,
      {
        recursive: true,
      }
    );

    const formData =
      await request.formData();

    const uploadedFile =
      formData.get("file");

    if (!(uploadedFile instanceof File)) {
      return NextResponse.json(
        {
          error:
            "Please upload a PDF file.",
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
          error:
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
          error:
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
          error:
            "Maximum file size is 100 MB.",
        },
        {
          status: 400,
        }
      );
    }

    const safeBaseName =
      path
        .parse(uploadedFile.name)
        .name.replace(
          /[^a-zA-Z0-9_-]/g,
          "_"
        ) || "converted";

    const inputPath = path.join(
      tempDirectory,
      `${safeBaseName}.pdf`
    );

    const outputPath = path.join(
      tempDirectory,
      `${safeBaseName}.pptx`
    );

    const fileBuffer =
      Buffer.from(
        await uploadedFile.arrayBuffer()
      );

    await fs.writeFile(
      inputPath,
      fileBuffer
    );

    const scriptPath = path.join(
      process.cwd(),
      "scripts",
      "pdf_to_powerpoint.py"
    );

    const conversionResult =
      await runNativeExecutable(
        "python",
        [
          scriptPath,
          inputPath,
          outputPath,
        ],
        {
          timeoutMs: 120000,
        }
      );

    if (conversionResult.exitCode !== 0) {
      throw new Error(
        conversionResult.stderr.trim() ||
          conversionResult.stdout.trim() ||
          "Python conversion failed."
      );
    }

    const outputBuffer =
      await fs.readFile(
        outputPath
      );

    if (
      outputBuffer.byteLength === 0
    ) {
      throw new Error(
        "The converted PowerPoint file is empty."
      );
    }

    await recordConversionUsage({
      tool: "pdf-to-powerpoint",
      identityType:
        usage.identityType,
      identityId:
        usage.identityId,
    });

    return new NextResponse(
      outputBuffer,
      {
        status: 200,
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",

          "Content-Disposition":
            `attachment; filename="${safeBaseName}.pptx"`,

          "Content-Length":
            outputBuffer.length.toString(),

          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "PDF to PowerPoint error:",
      error
    );

    if (
      isNativeDependencyError(error) ||
      isPythonRuntimeError(error)
    ) {
      return NextResponse.json(
        {
          error: NATIVE_CONVERSION_UNAVAILABLE_MESSAGE,
        },
        {
          status: 503,
        }
      );
    }

    return NextResponse.json(
      {
        error:
          "PDF to PowerPoint conversion failed.",
      },
      {
        status: 500,
      }
    );
  } finally {
    await fs.rm(
      tempDirectory,
      {
        recursive: true,
        force: true,
      }
    );
  }
}
