import Link from "next/link";
import { FileText, Image as ImageIcon, Layers3, MapPinned } from "lucide-react";
import { siteConfig } from "@/lib/site/config";

const capabilities = [
  {
    title: "YAJU Field Tools",
    description:
      "Practical GIS, surveying, water and engineering tools for coordinate conversion, field measurements, bearings and water storage sizing.",
    icon: MapPinned,
  },
  {
    title: "YAJU Documents",
    description:
      "Convert, compress, merge, split, protect and manage PDF files without jumping between different apps.",
    icon: FileText,
  },
  {
    title: "YAJU Images",
    description:
      "Convert, compress and improve images with simple tools built for everyday work.",
    icon: ImageIcon,
  },
];

const reasons = [
  { title: "Practical", description: "Focused on field, engineering, file, image and data tasks used in real work." },
  { title: "Simple", description: "Tools are easy to find and straightforward to use." },
  { title: "Accessible", description: "Free tools are available, with Premium for users who need more." },
  { title: "Growing", description: "New field, engineering, document and image tools are added over time." },
];

export const metadata = {
  title: { absolute: "About YAJU: Field, PDF & Image Tools" },
  description: "Discover YAJU Field Tools, PDF and image utilities in one practical productivity workspace.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-gray-50 px-6 py-14">
      <section className="mx-auto max-w-6xl rounded-2xl border border-gray-200 bg-white p-8 shadow-sm md:p-10">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">About {siteConfig.productName}</p>
            <h1 className="mt-3 max-w-4xl text-4xl font-bold tracking-tight text-gray-900 md:text-5xl">Useful tools for fieldwork, documents and images.</h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-gray-600">{siteConfig.platformDescription}</p>
            <p className="mt-4 max-w-3xl leading-7 text-gray-600">The goal is simple: make daily technical and digital work easier. Whether you are converting coordinates, measuring field data, sizing water storage, handling documents or preparing images, YAJU gives you practical tools in one place.</p>
          </div>
          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white"><Layers3 size={24} /></div>
            <h2 className="mt-5 text-2xl font-bold text-gray-900">One master brand, three workspaces</h2>
            <p className="mt-3 leading-7 text-gray-600">YAJU brings Field Tools, Documents and Images together in one workspace for practical work with field data and files.</p>
          </div>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {capabilities.map((capability) => { const Icon = capability.icon; return (
            <article key={capability.title} className="rounded-xl border border-gray-200 bg-gray-50 p-5 transition hover:border-blue-200 hover:bg-white hover:shadow-sm">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white text-blue-600 shadow-sm"><Icon size={21} /></div>
              <h2 className="mt-5 text-lg font-bold text-gray-900">{capability.title}</h2>
              <p className="mt-3 text-sm leading-6 text-gray-600">{capability.description}</p>
            </article>
          ); })}
        </div>

        <section className="mt-12 rounded-2xl border border-gray-200 bg-white p-6 md:p-8">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">Why YAJU?</p>
            <h2 className="mt-3 text-3xl font-bold text-gray-900">Simple tools for real work.</h2>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {reasons.map((reason) => <div key={reason.title} className="rounded-xl border border-gray-200 bg-gray-50 p-5"><h3 className="font-bold text-gray-900">{reason.title}</h3><p className="mt-2 text-sm leading-6 text-gray-600">{reason.description}</p></div>)}
          </div>
        </section>

        <section className="mt-12 rounded-2xl bg-blue-600 p-7 text-white md:p-10">
          <div className="max-w-5xl">
            <h2 className="text-2xl font-bold leading-tight sm:text-3xl">Built for people who work with field data, files and technical workflows every day.</h2>
            <p className="mt-4 max-w-5xl text-base leading-7 text-blue-50">Convert coordinates, measure distance and area, calculate bearings and size water storage with YAJU Field Tools. YAJU also brings together practical PDF and image tools in one workspace.</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/tools/gis" className="inline-flex justify-center rounded-lg bg-white px-5 py-3 text-sm font-semibold text-blue-600 transition hover:bg-blue-50">Explore YAJU Field Tools</Link>
              <Link href="/tools" className="inline-flex justify-center rounded-lg border border-white/70 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10">Explore All Tools</Link>
            </div>
          </div>
        </section>

        <div className="mt-10 border-t border-gray-200 pt-8 text-center">
          <p className="font-semibold text-gray-900">YAJU Field Tools, Documents & Images</p>
          <p className="mt-2 text-sm italic text-gray-500">{siteConfig.tagline}</p>
        </div>
      </section>
    </main>
  );
}
