import type { Metadata } from "next";
import Link from "next/link";
import { FileText, Image as ImageIcon, MapPinned, BookOpenCheck, ShieldCheck } from "lucide-react";
import { siteConfig } from "@/lib/site/config";

const capabilities = [
  { title: "YAJU Field Tools", description: "GIS, surveying, coordinate conversion, field measurements, bearings and preliminary water-planning calculations.", icon: MapPinned },
  { title: "YAJU Documents", description: "Practical PDF tools for merging, splitting, compressing, protecting and converting documents.", icon: FileText },
  { title: "YAJU Images", description: "Simple image conversion and compression utilities for everyday digital workflows.", icon: ImageIcon },
];

export const metadata: Metadata = {
  title: "About YAJU | Practical Digital and Fieldwork Tools",
  description: "Learn about YAJU's purpose, product areas, educational resources and approach to practical digital and technical workflows.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return <main className="min-h-screen bg-slate-50 px-5 py-14 sm:py-16"><article className="mx-auto max-w-6xl rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-10">
    <header className="max-w-4xl"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">About YAJU</p><h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">Practical tools and clear guidance for everyday work.</h1><p className="mt-6 text-lg leading-8 text-slate-600">{siteConfig.platformDescription}</p><p className="mt-4 leading-8 text-slate-700">YAJU brings useful digital utilities and technical resources into one accessible workspace. It is designed for people who work with field information, maps, documents and images, as well as anyone who needs straightforward tools for common online tasks.</p></header>
    <section className="mt-12 grid gap-5 md:grid-cols-3" aria-label="YAJU product areas">{capabilities.map(item => { const Icon=item.icon; return <div key={item.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-6"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-700"><Icon size={23}/></div><h2 className="mt-5 text-xl font-bold text-slate-950">{item.title}</h2><p className="mt-3 leading-7 text-slate-600">{item.description}</p></div>; })}</section>
    <section className="mt-12 grid gap-6 lg:grid-cols-2"><div className="rounded-2xl border border-slate-200 p-6 sm:p-8"><BookOpenCheck size={27} className="text-blue-700"/><h2 className="mt-4 text-2xl font-bold text-slate-950">Tools supported by learning resources</h2><p className="mt-3 leading-7 text-slate-600">The Knowledge Hub provides original tutorials, practical examples and checks that explain important inputs, assumptions and limitations. The aim is not only to provide a result, but also to help users understand how to review it.</p><Link href="/learn" className="mt-5 inline-flex font-semibold text-blue-700 hover:text-blue-900">Explore the Knowledge Hub →</Link></div>
    <div className="rounded-2xl border border-slate-200 p-6 sm:p-8"><ShieldCheck size={27} className="text-blue-700"/><h2 className="mt-4 text-2xl font-bold text-slate-950">Clear scope and responsible use</h2><p className="mt-3 leading-7 text-slate-600">Online calculators and converters can support routine tasks and preliminary checks. Results should be reviewed against reliable source data and professional standards before use in engineering, surveying, legal or other high-consequence decisions.</p><Link href="/terms" className="mt-5 inline-flex font-semibold text-blue-700 hover:text-blue-900">Read the Terms of Use →</Link></div></section>
    <section className="mt-12 rounded-2xl bg-slate-950 p-7 text-white sm:p-10"><h2 className="text-2xl font-bold sm:text-3xl">Built around usefulness, clarity and continuous improvement.</h2><p className="mt-4 max-w-4xl leading-8 text-slate-300">YAJU continues to develop its tools and educational content in response to practical needs. Product updates are recorded on the What's New page, and users can submit suggestions or report problems through the feedback form.</p><div className="mt-7 flex flex-wrap gap-3"><Link href="/tools" className="rounded-lg bg-white px-5 py-3 font-semibold text-slate-950 hover:bg-slate-100">Explore tools</Link><Link href="/whats-new" className="rounded-lg border border-slate-500 px-5 py-3 font-semibold text-white hover:bg-slate-800">What's New</Link><Link href="/feedback" className="rounded-lg border border-slate-500 px-5 py-3 font-semibold text-white hover:bg-slate-800">Share feedback</Link></div></section>
    <p className="mt-8 text-center text-sm text-slate-500">{siteConfig.tagline}</p>
  </article></main>;
}
