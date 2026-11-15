import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, FileText, Image as ImageIcon, MapPinned, Printer } from "lucide-react";

export const metadata: Metadata = {
  title: "Documentation | YAJU",
  description: "Simple guides for using YAJU Field Tools, YAJU Documents and YAJU Images.",
  alternates: { canonical: "/docs" },
};

const sections = [
  { title: "YAJU Field Tools", href: "/docs/yaju-user-guide", description: "Convert coordinates and calculate distance, area, bearing and azimuth.", icon: MapPinned },
  { title: "YAJU Documents", href: "/docs/documents", description: "Convert, merge, split, compress, protect and unlock PDF files.", icon: FileText },
  { title: "YAJU Images", href: "/docs/images", description: "Convert images to PDF and prepare lighter image files for sharing.", icon: ImageIcon },
];

const quickSteps = [
  "Choose the YAJU workspace that matches your file or task.",
  "Upload a file, select options or enter the data requested by the tool.",
  "Run the conversion, then download, copy or review the result.",
];

export default function DocumentationPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <section className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <p className="text-sm font-bold uppercase tracking-wide text-blue-600">YAJU Help Center</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight text-gray-950 sm:text-5xl">Simple guides for every YAJU conversion tool.</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-gray-600">YAJU is built so users can move from upload to finished result quickly. These guides explain how to complete common field, document and image tasks.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/docs/yaju-user-guide" className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"><Printer size={18} />Printable PDF Guide</Link>
            <Link href="/docs/getting-started" className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-5 py-3 font-semibold text-blue-600 transition hover:bg-blue-50">Start Here<ArrowRight size={18} /></Link>
            <Link href="/tools" className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-3 font-semibold text-gray-800 transition hover:border-blue-300 hover:text-blue-600">Open Tools</Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <section className="grid gap-4 sm:grid-cols-3">
          {quickSteps.map((step, index) => (
            <div key={step} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-sm font-bold text-blue-600">{index + 1}</div>
              <p className="mt-4 text-sm leading-6 text-gray-700">{step}</p>
            </div>
          ))}
        </section>

        <section className="mt-12 grid gap-4 md:grid-cols-3">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <Link key={`${section.title}-${section.href}`} href={section.href} className="group rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-blue-300 hover:shadow-lg">
                <div className="flex items-start gap-4 md:flex-col">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 transition group-hover:bg-blue-600 group-hover:text-white"><Icon size={24} /></div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-950">{section.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-gray-600">{section.description}</p>
                    <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-600">Read guide<ArrowRight size={16} className="transition group-hover:translate-x-1" /></span>
                  </div>
                </div>
              </Link>
            );
          })}
        </section>
      </div>
    </main>
  );
}
