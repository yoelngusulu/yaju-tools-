import Link from "next/link";
import type { Metadata } from "next";
import PrintGuideButton from "@/components/PrintGuideButton";

export const metadata: Metadata = {
  title: "YAJU User Guide PDF | Simple Field, Document and Image Conversions",
  description:
    "Printable YAJU user guide explaining how to use YAJU Field Tools, YAJU Documents and YAJU Images for simple conversions.",
  alternates: { canonical: "/docs/yaju-user-guide" },
};

const documentTools = [
  ["QR Code Generator", "Choose website, text, email, phone or Wi-Fi, enter the details, customize the code, then download PNG or SVG."],
  ["Split PDF", "Upload one PDF, choose pages or ranges, then download the separated files."],
  ["Merge PDF", "Upload two or more PDFs, arrange the order, then download one combined PDF."],
  ["Compress PDF", "Upload a PDF, run compression, then download a smaller file for sharing."],
  ["PDF conversions", "Open the matching tool, upload your PDF, then download Word, Excel, PowerPoint or image output when available."],
  ["Protect or unlock PDF", "Upload the file, enter the required password details, then download the processed PDF."],
];

const imageTools = [
  ["Image to PDF", "Upload JPG or PNG images, check the order, then create and download one PDF."],
  ["Compress Image", "Upload an image, choose the available size or quality option, then download the lighter image."],
  ["Prepare images", "Use clear images, rename files when order matters and keep original copies before compression."],
];

const fieldTools = [
  ["Coordinate converter", "Enter or paste coordinates, choose the source and output format, then copy the converted result."],
  ["Distance and area", "Enter field points or coordinate values, calculate, then review the result before using it in a report."],
  ["Bearing and azimuth", "Enter start and end values, calculate direction, then copy the result into field notes."],
];

function ToolTable({ title, rows }: { title: string; rows: string[][] }) {
  return (
    <section className="mt-10 break-inside-avoid">
      <h2 className="text-2xl font-bold text-gray-950">{title}</h2>
      <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 bg-white print:border-gray-400">
        {rows.map(([name, guide]) => (
          <div key={name} className="grid gap-2 border-b border-gray-200 p-4 last:border-b-0 sm:grid-cols-[180px_1fr] print:grid-cols-[170px_1fr]">
            <h3 className="font-bold text-gray-950">{name}</h3>
            <p className="leading-7 text-gray-700">{guide}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function YajuUserGuidePage() {
  return (
    <main className="min-h-screen bg-gray-100 py-10 print:bg-white print:py-0">
      <article className="mx-auto max-w-4xl bg-white px-6 py-10 shadow-sm sm:px-10 lg:px-14 print:max-w-none print:px-0 print:py-0 print:shadow-none">
        <div className="flex flex-col gap-4 border-b border-gray-200 pb-8 sm:flex-row sm:items-start sm:justify-between print:border-gray-400">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-blue-600">Printable User Guide</p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-gray-950 sm:text-5xl">YAJU User Guide</h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-gray-600">
              A simple guide for using YAJU Field Tools, YAJU Documents and YAJU Images to complete everyday conversions quickly.
            </p>
          </div>
          <PrintGuideButton />
        </div>

        <section className="mt-10 break-inside-avoid">
          <h2 className="text-2xl font-bold text-gray-950">How YAJU works</h2>
          <ol className="mt-4 grid gap-3 sm:grid-cols-3 print:grid-cols-3">
            <li className="rounded-lg border border-gray-200 p-4 print:border-gray-400"><strong>1. Choose a tool.</strong><br />Pick Field Tools, Documents or Images.</li>
            <li className="rounded-lg border border-gray-200 p-4 print:border-gray-400"><strong>2. Add input.</strong><br />Upload a file or enter the values requested.</li>
            <li className="rounded-lg border border-gray-200 p-4 print:border-gray-400"><strong>3. Get output.</strong><br />Download, copy or review the finished result.</li>
          </ol>
        </section>

        <ToolTable title="YAJU Field Tools" rows={fieldTools} />
        <ToolTable title="YAJU Documents" rows={documentTools} />
        <ToolTable title="YAJU Images" rows={imageTools} />

        <section className="mt-10 break-inside-avoid rounded-lg border border-blue-100 bg-blue-50 p-6 print:border-gray-400 print:bg-white">
          <h2 className="text-2xl font-bold text-gray-950">Tips for best results</h2>
          <ul className="mt-4 space-y-2 leading-7 text-gray-700">
            <li>Use clear, readable files and keep a copy of the original before conversion.</li>
            <li>Check page order before merging PDFs or creating a PDF from images.</li>
            <li>Review converted files before using them for important work.</li>
            <li>Use the website tools page to confirm which tools are currently available.</li>
          </ul>
        </section>

        <footer className="mt-10 border-t border-gray-200 pt-6 text-sm text-gray-600 print:border-gray-400">
          <p>Website: https://yaju-tools.com</p>
          <p className="mt-1">Open tools: https://yaju-tools.com/tools</p>
          <p className="mt-1 print:hidden"><Link href="/docs" className="font-semibold text-blue-600">Back to YAJU documentation</Link></p>
        </footer>
      </article>
    </main>
  );
}
