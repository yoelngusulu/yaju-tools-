import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, FileText } from "lucide-react";

export const metadata: Metadata = {
  title: "YAJU Documents Guide | YAJU Documentation",
  description: "Learn how to convert, merge, split, compress, protect and unlock PDF files with YAJU Documents.",
  alternates: { canonical: "/docs/documents" },
};

const guides = [
  {
    id: "split-pdf",
    title: "Split PDF",
    href: "/tools/pdf/split-pdf",
    steps: ["Upload one PDF file.", "Choose the page ranges or splitting option requested by the tool.", "Run Split PDF and download the separated PDF output."],
  },
  {
    id: "merge-pdf",
    title: "Merge PDF",
    href: "/tools/pdf/merge-pdf",
    steps: ["Upload two or more PDF files.", "Arrange the files in the order you want.", "Run Merge PDF and download one combined PDF."],
  },
  {
    id: "compress-pdf",
    title: "Compress PDF",
    href: "/tools/pdf/compress-pdf",
    steps: ["Upload the PDF you want to reduce.", "Choose the available compression setting if the tool offers one.", "Download the smaller PDF and check that the quality is acceptable."],
  },
  {
    id: "pdf-conversion",
    title: "Convert PDF to Word, Excel, PowerPoint or Image",
    href: "/tools/pdf",
    steps: ["Open the matching conversion tool from YAJU Documents.", "Upload the PDF and confirm the output format.", "Download the converted file when processing finishes."],
  },
  {
    id: "word-to-pdf",
    title: "Convert Word to PDF",
    href: "/tools/pdf/word-to-pdf",
    steps: ["Upload a supported Word document.", "Start the conversion.", "Download the new PDF for printing, sharing or archiving."],
  },
  {
    id: "protect-unlock",
    title: "Protect or Unlock PDF",
    href: "/tools/pdf",
    steps: ["Choose Protect PDF when you want to add a password or Unlock PDF when you need to remove protection you are allowed to remove.", "Upload the PDF and enter the required password information.", "Download the processed file and keep passwords stored safely."],
  },
];

export default function DocumentsGuidePage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <Link href="/docs" className="text-sm font-semibold text-blue-600 hover:text-blue-700">Back to documentation</Link>
        <div className="mt-6 flex items-center gap-3 text-blue-600">
          <FileText size={28} />
          <p className="text-sm font-bold uppercase tracking-wide">YAJU Documents</p>
        </div>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-gray-950 sm:text-5xl">Document conversion made simple</h1>
        <p className="mt-4 text-lg leading-8 text-gray-600">
          YAJU Documents helps users handle everyday PDF work without complicated software. The normal flow is upload, choose the action, process, then download.
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
          <h2 className="text-2xl font-bold text-gray-950">Before processing a PDF</h2>
          <ul className="mt-4 list-disc space-y-2 pl-6 leading-7 text-gray-700">
            <li>Keep an unchanged copy of the original document, especially when it is a report, contract or official record.</li>
            <li>Check that the file opens correctly and that its pages are in the intended order and orientation.</li>
            <li>For password-protected files, make sure you are authorised to process the document and have the required password.</li>
            <li>Review your organisation's rules before uploading confidential or personal information to an online service.</li>
          </ul>
        </section>

        <section className="mt-6 rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-2xl font-bold text-gray-950">Check the result before sharing</h2>
          <p className="mt-3 leading-7 text-gray-600">A completed conversion or download does not by itself confirm that every page has been preserved accurately. Open the output and check the page count, order, text, tables, images, page breaks and file readability.</p>
          <ul className="mt-4 list-disc space-y-2 pl-6 leading-7 text-gray-700">
            <li><strong>Word:</strong> review headings, paragraphs, tables and page layout.</li>
            <li><strong>Excel:</strong> verify extracted values, column alignment, dates and formulas where applicable.</li>
            <li><strong>PowerPoint:</strong> check slide order, text placement, images and formatting.</li>
            <li><strong>Compressed PDF:</strong> zoom in on small text, maps, drawings and signatures to confirm they remain legible.</li>
          </ul>
          <p className="mt-4 leading-7 text-gray-600">Scanned pages may need optical character recognition (OCR) before their text can be edited or searched. Complex layouts and scanned tables may require manual correction after conversion.</p>
        </section>

      </div>
    </main>
  );
}
