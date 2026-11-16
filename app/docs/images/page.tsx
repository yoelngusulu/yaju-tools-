import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Image as ImageIcon } from "lucide-react";

export const metadata: Metadata = {
  title: "YAJU Images Guide | YAJU Documentation",
  description: "Learn how to convert and compress images with YAJU Images.",
  alternates: { canonical: "/docs/images" },
};

const guides = [
  {
    id: "image-to-pdf",
    title: "Convert images to PDF",
    href: "/tools/image/image-to-pdf",
    steps: ["Upload one or more image files such as JPG or PNG.", "Check the order of the images before processing.", "Create the PDF and download it for sharing, printing or submission."],
  },
  {
    id: "compress-image",
    title: "Compress an image",
    href: "/tools/image/compress-image",
    steps: ["Upload the image you want to reduce.", "Choose the available quality or size option when shown.", "Download the smaller image and confirm that it still looks clear."],
  },
  {
    id: "prepare-files",
    title: "Prepare image files before uploading",
    href: "/tools/image",
    steps: ["Use clear images with readable text or visible details.", "Rename files when order matters, especially before creating a PDF.", "Keep a backup of the original images before compression."],
  },
];

export default function ImagesGuidePage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <Link href="/docs" className="text-sm font-semibold text-blue-600 hover:text-blue-700">Back to documentation</Link>
        <div className="mt-6 flex items-center gap-3 text-blue-600">
          <ImageIcon size={28} />
          <p className="text-sm font-bold uppercase tracking-wide">YAJU Images</p>
        </div>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-gray-950 sm:text-5xl">Image conversion without extra steps</h1>
        <p className="mt-4 text-lg leading-8 text-gray-600">
          YAJU Images is for quick image tasks like creating a PDF from pictures or making image files easier to upload and share.
        </p>

        <section className="mt-10 space-y-5">
          {guides.map((guide) => (
            <article key={guide.id} id={guide.id} className="scroll-mt-24 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-950">{guide.title}</h2>
                  <ol className="mt-4 space-y-3 text-gray-600">
                    {guide.steps.map((step) => (
                      <li key={step} className="flex gap-3 leading-7">
                        <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-blue-600" />
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
                <Link href={guide.href} className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-600 transition hover:bg-blue-50">
                  Open tool
                  <ArrowRight size={16} />
                </Link>
              </div>
            </article>
          ))}
        </section>
        <section className="mt-10 rounded-xl border border-blue-100 bg-blue-50 p-6">
          <h2 className="text-2xl font-bold text-gray-950">Choose the right image format</h2>
          <p className="mt-3 leading-7 text-gray-700">JPG is commonly used for photographs and can produce smaller files through lossy compression. PNG is useful for graphics that need sharp edges or transparency. The best format depends on the image content and how it will be used; converting formats does not automatically improve image quality.</p>
          <ul className="mt-4 list-disc space-y-2 pl-6 leading-7 text-gray-700">
            <li>Use JPG for many everyday photographs when a smaller file is important.</li>
            <li>Use PNG when transparency or crisp interface graphics must be preserved.</li>
            <li>Keep the original file when image quality or future editing matters.</li>
          </ul>
        </section>

        <section className="mt-6 rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-2xl font-bold text-gray-950">Check image quality after compression</h2>
          <p className="mt-3 leading-7 text-gray-600">Compare the processed image with the original at its intended display size. Look for blurred text, blocky edges, colour changes, banding and loss of fine detail. A smaller file is not necessarily a better file if important information becomes difficult to read.</p>
          <h3 className="mt-5 text-lg font-semibold text-gray-950">Before creating a PDF from images</h3>
          <ul className="mt-3 list-disc space-y-2 pl-6 leading-7 text-gray-700">
            <li>Check that every image is upright and readable.</li>
            <li>Arrange pages in the required order before creating the PDF.</li>
            <li>Use consistent page orientation where practical.</li>
            <li>Open the finished PDF and inspect every page before sending or submitting it.</li>
          </ul>
          <p className="mt-4 leading-7 text-gray-600">For scanned forms, maps or technical drawings, retain a high-quality original. Compression and format conversion may reduce the clarity of small labels, fine linework and handwritten details.</p>
        </section>

      </div>
    </main>
  );
}
