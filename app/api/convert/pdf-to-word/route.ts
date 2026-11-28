import {
  NextRequest,
  NextResponse,
} from "next/server";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { randomUUID } from "crypto";

import {
  NATIVE_CONVERSION_UNAVAILABLE_MESSAGE,
  isNativeDependencyError,
  isPythonRuntimeError,
  runNativeExecutable,
} from "@/lib/nativeExecutables";
import { checkUsageLimit, releaseUsageReservation } from "@/lib/supabase/usageLimit";
import { recordConversionUsage } from "@/lib/supabase/recordUsage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CONVERSION_TIMEOUT_MS =
  120_000;

export async function POST(
  request: NextRequest
) {
  // Check usage limit before starting conversion.
  const usage =
    await checkUsageLimit("pdf-to-word");

  if (!usage.allowed) {
    return NextResponse.json(
      {
        error: usage.reason,
        remaining:
          usage.remaining,
        limit: usage.limit,
      },
      {
        status: usage.unavailable ? 503 : 429,
      }
    );
  }
  let usageCommitted = !usage.reservationId;

  const tempDir =
    await fs.mkdtemp(
      path.join(
        os.tmpdir(),
        "pdf-to-word-"
      )
    );

  const inputPath =
    path.join(
      tempDir,
      `${randomUUID()}.pdf`
    );

  const outputPath =
    path.join(
      tempDir,
      `${randomUUID()}.docx`
    );

  try {
    const formData =
      await request.formData();

    const file =
      formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          error:
            "PDF file is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (file.size === 0) {
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

    const bytes =
      Buffer.from(
        await file.arrayBuffer()
      );

    await fs.writeFile(
      inputPath,
      bytes
    );

    const scriptPath = path.join(
      process.cwd(),
      "scripts",
      "pdf_to_word.py"
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
          timeoutMs: CONVERSION_TIMEOUT_MS,
          onStdout: (text) => {
            if (text.trim()) {
              console.log(
                "[pdf-to-word]",
                text.trim()
              );
            }
          },
          onStderr: (text) => {
            if (text.trim()) {
              console.error(
                "[pdf-to-word]",
                text.trim()
              );
            }
          },
        }
      );

    if (conversionResult.exitCode !== 0) {
      throw new Error(
        conversionResult.stderr.trim() ||
          conversionResult.stdout.trim() ||
          "PDF conversion failed."
      );
    }

    const output =
      await fs.readFile(
        outputPath
      );

    if (
      output.byteLength === 0
    ) {
      throw new Error(
        "The converted Word file is empty."
      );
    }

    // Record usage only after a successful conversion.
    await recordConversionUsage({
      tool: "pdf-to-word",
      identityType: usage.identityType,
      identityId: usage.identityId,
      reservationId: usage.reservationId,
    });
    usageCommitted = true;

    return new NextResponse(
      output,
      {
        status: 200,
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

          "Content-Disposition":
            'attachment; filename="converted.docx"',

          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "PDF to Word API error:",
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

    const message =
      error instanceof Error
        ? error.message
        : "Failed to convert PDF to Word.";

    const isTimeout =
      message.includes(
        "timed out"
      );

    return NextResponse.json(
      {
        error: isTimeout
          ? "This PDF has a complex layout and could not be converted within 2 minutes. Try a simpler PDF."
          : "Unable to convert PDF to Word.",
      },
      {
        status: isTimeout
          ? 408
          : 500,
      }
    );
  } finally {
    if (!usageCommitted) await releaseUsageReservation(usage).catch((error) => console.error("Unable to release failed PDF-to-Word quota:", error));
    await fs.rm(
      tempDir,
      {
        recursive: true,
        force: true,
      }
    );
  }
}
