import {
  NextRequest,
  NextResponse,
} from "next/server";
import path from "path";
import { isAllowedConversionOrigin } from "@/lib/security/conversionOrigin";
import { checkUsageLimit } from "@/lib/supabase/usageLimit";
import { recordConversionUsage } from "@/lib/supabase/recordUsage";

import {
  type OpenAIContent,
  createOpenAITextResponse,
  deleteOpenAIFile,
  uploadOpenAIFile,
} from "@/lib/ai/openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 25 * 1024 * 1024;

const imageTools = new Set([
  "image-editor",
  "background-remover",
  "photo-enhancer",
  "object-remover",
  "face-retouch",
  "image-upscaler",
  "image-colorizer",
  "image-to-text",
]);

const documentTools = new Set([
  "summarize-pdf",
  "chat-with-pdf",
  "translate-document",
  "resume-builder",
]);

const allowedImageExtensions = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
]);

const allowedDocumentExtensions = new Set([
  ".pdf",
  ".doc",
  ".docx",
  ".txt",
]);

function hasValidFileSignature(file: File, extension: string) {
  return file.arrayBuffer().then((arrayBuffer) => {
    const bytes = new Uint8Array(arrayBuffer);
    const startsWith = (...signature: number[]) =>
      signature.every((value, index) => bytes[index] === value);

    if (extension === ".pdf") {
      return new TextDecoder().decode(bytes.subarray(0, 5)) === "%PDF-";
    }
    if (extension === ".jpg" || extension === ".jpeg") {
      return startsWith(0xff, 0xd8, 0xff);
    }
    if (extension === ".png") {
      return startsWith(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
    }
    if (extension === ".webp") {
      return bytes.length >= 12
        && new TextDecoder().decode(bytes.subarray(0, 4)) === "RIFF"
        && new TextDecoder().decode(bytes.subarray(8, 12)) === "WEBP";
    }
    if (extension === ".doc") {
      return startsWith(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1);
    }
    if (extension === ".docx") {
      return startsWith(0x50, 0x4b, 0x03, 0x04)
        || startsWith(0x50, 0x4b, 0x05, 0x06)
        || startsWith(0x50, 0x4b, 0x07, 0x08);
    }
    return extension === ".txt";
  });
}

function sanitizeFileName(fileName: string) {
  return fileName
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function getPrompt(
  tool: string,
  fileName: string,
  action?: string
) {
  const actionText = action
    ? `Selected action: ${action}.`
    : "";

  const prompts: Record<string, string> = {
    "image-editor": `Analyze this image and provide a professional edit plan. ${actionText} Include exact changes, color and lighting guidance, and export recommendations.`,

    "background-remover":
      "Analyze this image for background removal. Describe the subject boundaries, tricky areas, and the best professional output settings.",

    "photo-enhancer":
      "Analyze this photo and provide a concise professional enhancement report covering exposure, color, sharpness, noise, and composition.",

    "object-remover":
      "Analyze this image and identify how to remove unwanted objects cleanly. Include likely masking areas and restoration guidance.",

    "face-retouch":
      "Analyze this portrait and provide a natural retouching plan. Preserve identity and avoid unrealistic edits.",

    "image-upscaler":
      "Analyze this image and recommend the best upscaling and sharpening approach. Mention risks such as artifacts or blur.",

    "image-colorizer":
      "Analyze this image and provide a realistic colorization plan with likely palette choices and areas needing care.",

    "image-to-text":
      "Extract all readable text from this image. Preserve line breaks where possible. If text is unclear, mark it as [unclear].",

    "summarize-pdf":
      `Summarize the uploaded document named ${fileName}. Include key points, important details, and a short action list.`,

    "chat-with-pdf":
      `Read the uploaded document named ${fileName}. Provide a helpful overview, likely questions a user may ask, and concise answers based only on the document.`,

    "translate-document":
      `Translate or prepare the uploaded document named ${fileName} into clear English. Preserve headings and structure where possible.`,

    "resume-builder":
      `Use the uploaded file named ${fileName} to create a professional resume draft. Improve clarity, structure, impact bullets, and formatting guidance.`,
  };

  return (
    prompts[tool] ||
    `Analyze the uploaded file named ${fileName} and provide a professional result.`
  );
}




 
async function fileToDataUrl(file: File) {
  const buffer = Buffer.from(
    await file.arrayBuffer()
  );

  const mimeType =
    file.type || "application/octet-stream";

  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

function textAttachment(
  text: string,
  fileName: string
) {
  return new NextResponse(text, {
    status: 200,
    headers: {
      "Content-Type":
        "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(
  request: NextRequest
) {
  let uploadedFileId = "";

  if (!isAllowedConversionOrigin(request)) {
    return NextResponse.json(
      { error: "Request origin is not allowed." },
      { status: 403 }
    );
  }

  try {
    const formData =
      await request.formData();

    const toolValue =
      formData.get("tool");

    const actionValue =
      formData.get("action");

    const uploadedFile =
      formData.get("file");

    if (typeof toolValue !== "string") {
      return NextResponse.json(
        {
          error: "AI tool is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!(uploadedFile instanceof File)) {
      return NextResponse.json(
        {
          error: "Please upload one file.",
        },
        {
          status: 400,
        }
      );
    }

    if (uploadedFile.size === 0) {
      return NextResponse.json(
        {
          error: "The uploaded file is empty.",
        },
        {
          status: 400,
        }
      );
    }

    if (uploadedFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: "Maximum AI file size is 25 MB.",
        },
        {
          status: 413,
        }
      );
    }

    const tool = toolValue;
    const extension = path
      .extname(uploadedFile.name)
      .toLowerCase();

    const isImageTool =
      imageTools.has(tool);

    const isDocumentTool =
      documentTools.has(tool);

    if (!isImageTool && !isDocumentTool) {
      return NextResponse.json(
        {
          error: "Unsupported AI tool.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      isImageTool &&
      !allowedImageExtensions.has(extension)
    ) {
      return NextResponse.json(
        {
          error:
            "Only JPG, JPEG, PNG and WEBP images are supported for this AI tool.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      isDocumentTool &&
      !allowedDocumentExtensions.has(extension)
    ) {
      return NextResponse.json(
        {
          error:
            "Only PDF, DOC, DOCX and TXT documents are supported for this AI tool.",
        },
        {
          status: 400,
        }
      );
    }

    const usage = await checkUsageLimit(tool);
    if (!usage.allowed) {
      return NextResponse.json(
        { error: usage.reason },
        { status: usage.status ?? 429 }
      );
    }

    if (typeof actionValue === "string" && actionValue.length > 500) {
      return NextResponse.json(
        { error: "The selected action is too long." },
        { status: 400 }
      );
    }

    if (!(await hasValidFileSignature(uploadedFile, extension))) {
      return NextResponse.json(
        { error: "The file content does not match its file type." },
        { status: 400 }
      );
    }

    const action =
      typeof actionValue === "string"
        ? actionValue.trim()
        : "";

    const prompt = getPrompt(
      tool,
      uploadedFile.name,
      action
    );

    const content: OpenAIContent[] = [
      {
        type: "input_text" as const,
        text: prompt,
      },
    ];

    if (isImageTool) {
      content.push({
        type: "input_image" as const,
        image_url:
          await fileToDataUrl(uploadedFile),
      });
    } else {
      uploadedFileId =
        await uploadOpenAIFile(uploadedFile);

      content.push({
        type: "input_file" as const,
        file_id: uploadedFileId,
      });
    }

    const result =
      await createOpenAITextResponse(
        content
      );

    const baseName =
      sanitizeFileName(
        path.basename(
          uploadedFile.name,
          extension
        )
      ) || "ai-result";

    await recordConversionUsage({
      tool,
      identityType: usage.identityType,
      identityId: usage.identityId,
    });

    return textAttachment(
      result,
      `${baseName}-${tool}.txt`
    );
  } catch (error) {
    console.error(
      "AI processing error:",
      error
    );

    const message =
  error instanceof Error
    ? error.message
    : "Unable to process the file with AI.";

const lowerMessage = message.toLowerCase();

const isQuotaError =
  lowerMessage.includes("quota") ||
  lowerMessage.includes("billing") ||
  lowerMessage.includes("insufficient_quota");

const status = message.includes("OPENAI_API_KEY")
  ? 503
  : isQuotaError
    ? 402
    : 500;

const clientMessage = isQuotaError
  ? "AI features are temporarily unavailable because API credits are not active. You can continue using PDF and document tools."
  : status === 503
    ? "AI processing is temporarily unavailable. Please try again later."
    : "Unable to process the file with AI. Please try again.";

    return NextResponse.json(
      {
        error: clientMessage,
      },
      {
        status,
      }
    );
  } finally {
    if (uploadedFileId) {
      await deleteOpenAIFile(
        uploadedFileId
      );
    }
  }
}
