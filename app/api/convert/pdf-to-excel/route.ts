import {
  NextRequest,
  NextResponse,
} from "next/server";
import fs from "fs/promises";
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

export async function POST(
  req: NextRequest
) {
  const usage =
    await checkUsageLimit("pdf-to-excel");

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

  let tempDirectory = "";

  try {
    const formData =
      await req.formData();

    const file =
      formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          error:
            "No PDF uploaded.",
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

    if (
      !file.name.toLowerCase().endsWith(".pdf") ||
      (file.type && file.type !== "application/pdf")
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

    const maximumFileSize =
      100 * 1024 * 1024;

    if (
      file.size >
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

    tempDirectory =
      await fs.mkdtemp(
        path.join(
          os.tmpdir(),
          "docmaster-pdf-to-excel-"
        )
      );

    const inputPath = path.join(
      tempDirectory,
      `${randomUUID()}.pdf`
    );

    const outputPath = path.join(
      tempDirectory,
      `${randomUUID()}.xlsx`
    );

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
      "pdf_to_excel.py"
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

    const excel =
      await fs.readFile(
        outputPath
      );

    if (
      excel.byteLength === 0
    ) {
      throw new Error(
        "The converted Excel file is empty."
      );
    }

    await recordConversionUsage({
      tool: "pdf-to-excel",
      identityType:
        usage.identityType,
      identityId:
        usage.identityId,
      reservationId: usage.reservationId,
    });
    usageCommitted = true;

    return new NextResponse(
      excel,
      {
        status: 200,
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

          "Content-Disposition":
            'attachment; filename="converted.xlsx"',

          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch (err: unknown) {
    console.error(
      "PDF to Excel error:",
      err
    );

    if (
      isNativeDependencyError(err) ||
      isPythonRuntimeError(err)
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
          "Unable to convert PDF to Excel.",
      },
      {
        status: 500,
      }
    );
  } finally {
    if (!usageCommitted) await releaseUsageReservation(usage).catch((error) => console.error("Unable to release failed PDF-to-Excel quota:", error));
    if (tempDirectory) {
      await fs
        .rm(tempDirectory, {
          recursive: true,
          force: true,
        })
        .catch(() => {});
    }
  }
}
