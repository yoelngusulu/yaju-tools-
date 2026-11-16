import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Getting Started | YAJU Documentation",
  description: "Start using YAJU conversion tools in a few simple steps.",
  alternates: { canonical: "/docs/getting-started" },
};

const steps = [
  {
    title: "Pick the right workspace",
    body: "Use YAJU Field Tools for field data and calculations, YAJU Documents for PDF and office file tasks, and YAJU Images for image conversion and compression.",
  },
  {
    title: "Open a tool and add your file or data",
    body: "Most tools work by uploading a file, selecting a small number of options, then pressing the action button. Field tools may ask you to type values or paste rows instead of uploading a file.",
  },
  {
    title: "Download or copy the result",
    body: "After processing, YAJU gives you a result file or calculated output. Review the result, then download, copy or continue with another conversion.",
  },
  {
    title: "Sign in when you need history or premium features",
    body: "Basic tools can be explored directly. Signing in helps with dashboard access, usage history and premium workflows when they are available for your account.",
  },
];

const workspaceLinks = [
  { label: "Open YAJU Field Tools", href: "/tools/gis" },
  { label: "Open YAJU Documents", href: "/tools/pdf" },
  { label: "Open YAJU Images", href: "/tools/image" },
];

export default function GettingStartedPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <Link href="/docs" className="text-sm font-semibold text-blue-600 hover:text-blue-700">Back to documentation</Link>
        <h1 className="mt-5 text-4xl font-bold tracking-tight text-gray-950 sm:text-5xl">Getting started with YAJU</h1>
        <p className="mt-4 text-lg leading-8 text-gray-600">
          YAJU is designed around one simple idea: choose the tool, add your input, then take the finished result. You do not need a complex setup to begin.
        </p>

        <section className="mt-10 space-y-4">
          {steps.map((step) => (
            <div key={step.title} className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <CheckCircle2 className="mt-1 shrink-0 text-blue-600" size={22} />
                <div>
                  <h2 className="text-xl font-bold text-gray-950">{step.title}</h2>
                  <p className="mt-2 leading-7 text-gray-600">{step.body}</p>
                </div>
              </div>
            </div>
          ))}
        </section>

        <section className="mt-10 rounded-lg border border-blue-100 bg-blue-50 p-6">
          <h2 className="text-2xl font-bold text-gray-950">A few checks before you start</h2>
          <ul className="mt-4 list-disc space-y-2 pl-6 leading-7 text-gray-700">
            <li><strong>For coordinate work:</strong> identify the source coordinate reference system, datum, units and UTM zone before converting. Do not guess a CRS from the coordinate values alone.</li>
            <li><strong>For document and image work:</strong> keep an original copy and review the processed file before sharing it.</li>
            <li><strong>For calculations:</strong> check the input units and assumptions, then compare important results with an independent source or method.</li>
            <li><strong>For sensitive information:</strong> review the Privacy Policy and your organisation's data-handling rules before uploading files.</li>
          </ul>
        </section>

        <section className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-950">Learn more before using a tool</h2>
          <p className="mt-3 leading-7 text-gray-600">The YAJU Learning Center explains the concepts behind selected tools, including coordinate reference systems, GIS measurements, water-storage planning and PDF preparation. Use these guides to understand the inputs and checks that affect your results.</p>
          <Link href="/learn" className="mt-4 inline-flex items-center gap-2 font-semibold text-blue-600 hover:text-blue-700">Explore the Learning Center <ArrowRight size={17} /></Link>
        </section>

        <section className="mt-10 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-950">Choose a workspace</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {workspaceLinks.map((link) => (
              <Link key={link.href} href={link.href} className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 font-semibold text-gray-800 transition hover:border-blue-300 hover:text-blue-600">
                {link.label}
                <ArrowRight size={17} />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
