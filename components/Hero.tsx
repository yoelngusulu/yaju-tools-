"use client";

import Link from "next/link";
import { QrCode, Sparkles, UploadCloud } from "lucide-react";
import { motion } from "framer-motion";
import { ACTIVE_TOOLS_COUNT } from "@/lib/tool-counts";

export default function Hero() {
  const openAIAssistant = () => {
    window.dispatchEvent(new CustomEvent("open-docmaster-ai"));
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-sky-100 py-20 sm:py-24">
      <div className="pointer-events-none absolute -left-24 top-20 h-72 w-72 rounded-full bg-blue-200/30 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-10 h-72 w-72 rounded-full bg-sky-200/40 blur-3xl" />
      <div className="relative mx-auto grid max-w-7xl items-start gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:gap-14 lg:px-8">
        <motion.div initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7 }} className="text-center lg:text-left">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700"><Sparkles size={18} />Documents · GIS · Fieldwork · Learning</div>
          <h1 className="mt-4 text-4xl font-bold text-blue-600 sm:text-3xl md:text-5xl">Work Smarter. Get More Done with YAJU Tools.</h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-8 text-gray-600 sm:text-lg lg:mx-0">One practical platform for documents, technical tasks and everyday productivity. Convert and organize files, work with coordinates and measurements, estimate water storage, and access useful digital tools for work, study and field projects.</p>
          <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row sm:flex-wrap lg:justify-start">
            <Link href="#tools" className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-8 py-4 font-semibold text-white shadow-md transition hover:bg-blue-700 hover:shadow-lg"><UploadCloud size={20} />Explore YAJU Tools</Link>
            <button type="button" onClick={openAIAssistant} className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-600 bg-white px-8 py-4 font-semibold text-blue-600 transition hover:bg-blue-50"><Sparkles size={20} />Ask YAJU AI</button>
          </div>
          <div className="mt-12 grid grid-cols-2 gap-6 sm:grid-cols-4">
            <div><h3 className="text-3xl font-bold text-blue-600">{ACTIVE_TOOLS_COUNT}</h3><p className="mt-1 text-sm text-gray-600">Active Tools</p></div>
            <div><h3 className="text-3xl font-bold text-blue-600">Smart</h3><p className="mt-1 text-sm text-gray-600">Manage files</p></div>
            <div><h3 className="text-3xl font-bold text-blue-600">Technical</h3><p className="mt-1 text-sm text-gray-600">GIS & field tasks</p></div>
            <div><h3 className="text-3xl font-bold text-blue-600">Learning</h3><p className="mt-1 text-sm text-gray-600">Guides & resources</p></div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }} className="rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl sm:p-8">
          <div className="mb-6 flex items-center justify-between"><div><p className="text-sm font-semibold uppercase tracking-wide text-blue-600">YAJU TOOLS</p><h3 className="mt-1 text-2xl font-bold text-gray-900">Tools for your everyday work</h3></div><div className="rounded-2xl bg-blue-100 p-3 text-blue-600"><Sparkles size={24} /></div></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link href="/tools/coordinates-converter" className="flex min-h-14 items-center justify-between gap-2 rounded-xl bg-blue-50 px-3 py-3 transition hover:bg-blue-100"><span className="flex min-w-0 items-center gap-2 text-sm font-medium leading-5 text-gray-800"><span aria-hidden="true">📍</span><span>Coordinates Converter</span></span><span className="shrink-0 text-xs font-semibold text-green-600">✓ Ready</span></Link>
            <Link href="/tools/gis/epsg-crs-finder" className="flex min-h-14 items-center justify-between gap-2 rounded-xl bg-blue-50 px-3 py-3 transition hover:bg-blue-100"><span className="flex min-w-0 items-center gap-2 text-sm font-medium leading-5 text-gray-800"><span aria-hidden="true">🌐</span><span>CRS/EPSG Finder</span></span><span className="shrink-0 text-xs font-semibold text-green-600">✓ Ready</span></Link>
            <Link href="/tools/gis/distance-area-calculator" className="flex min-h-14 items-center justify-between gap-2 rounded-xl bg-blue-50 px-3 py-3 transition hover:bg-blue-100"><span className="flex min-w-0 items-center gap-2 text-sm font-medium leading-5 text-gray-800"><span aria-hidden="true">📏</span><span>Distance & Area</span></span><span className="shrink-0 text-xs font-semibold text-green-600">✓ Ready</span></Link>
            <Link href="/tools/gis/water-storage-calculator" className="flex min-h-14 items-center justify-between gap-2 rounded-xl bg-blue-50 px-3 py-3 transition hover:bg-blue-100"><span className="flex min-w-0 items-center gap-2 text-sm font-medium leading-5 text-gray-800"><span aria-hidden="true">💧</span><span>Water Storage & Tank Sizing</span></span><span className="shrink-0 text-xs font-semibold text-green-600">✓ Ready</span></Link>
            <Link href="/tools/pdf/pdf-to-word" className="flex min-h-14 items-center justify-between gap-2 rounded-xl bg-blue-50 px-3 py-3 transition hover:bg-blue-100"><span className="flex min-w-0 items-center gap-2 text-sm font-medium leading-5 text-gray-800"><span aria-hidden="true">📝</span><span>PDF to Word</span></span><span className="shrink-0 text-xs font-semibold text-green-600">✓ Ready</span></Link>
            <Link href="/tools/pdf/pdf-to-excel" className="flex min-h-14 items-center justify-between gap-2 rounded-xl bg-blue-50 px-3 py-3 transition hover:bg-blue-100"><span className="flex min-w-0 items-center gap-2 text-sm font-medium leading-5 text-gray-800"><span aria-hidden="true">📊</span><span>PDF to Excel</span></span><span className="shrink-0 text-xs font-semibold text-green-600">✓ Ready</span></Link>
            <Link href="/tools/pdf/pdf-to-powerpoint" className="flex min-h-14 items-center justify-between gap-2 rounded-xl bg-blue-50 px-3 py-3 transition hover:bg-blue-100"><span className="flex min-w-0 items-center gap-2 text-sm font-medium leading-5 text-gray-800"><span aria-hidden="true">📽️</span><span>PDF to PowerPoint</span></span><span className="shrink-0 text-xs font-semibold text-green-600">✓ Ready</span></Link>
            <Link href="/tools/pdf/html-to-pdf" className="flex min-h-14 items-center justify-between gap-2 rounded-xl bg-blue-50 px-3 py-3 transition hover:bg-blue-100"><span className="flex min-w-0 items-center gap-2 text-sm font-medium leading-5 text-gray-800"><span aria-hidden="true">🌐</span><span>HTML to PDF</span></span><span className="shrink-0 text-xs font-semibold text-green-600">✓ Ready</span></Link>
            <Link href="/tools/pdf/merge-pdf" className="flex min-h-14 items-center justify-between gap-2 rounded-xl bg-blue-50 px-3 py-3 transition hover:bg-blue-100"><span className="flex min-w-0 items-center gap-2 text-sm font-medium leading-5 text-gray-800"><span aria-hidden="true">📄</span><span>Merge PDF</span></span><span className="shrink-0 text-xs font-semibold text-green-600">✓ Ready</span></Link>
            <Link href="/tools/pdf/qr-code-generator" className="flex min-h-14 items-center justify-between gap-2 rounded-xl bg-blue-50 px-3 py-3 transition hover:bg-blue-100"><span className="flex min-w-0 items-center gap-2 text-sm font-medium leading-5 text-gray-800"><QrCode size={17} aria-hidden="true" /><span>QR Code Generator</span></span><span className="shrink-0 text-xs font-semibold text-green-600">✓ Ready</span></Link>
            <Link href="/tools/image/image-to-pdf" className="flex min-h-14 items-center justify-between gap-2 rounded-xl bg-blue-50 px-3 py-3 transition hover:bg-blue-100"><span className="flex min-w-0 items-center gap-2 text-sm font-medium leading-5 text-gray-800"><span aria-hidden="true">🖼️</span><span>Image → PDF</span></span><span className="shrink-0 text-xs font-semibold text-green-600">✓ Ready</span></Link>
          </div>
          <div className="mt-6 rounded-xl border border-dashed border-blue-200 bg-blue-50/50 px-4 py-3 text-center text-sm text-gray-600">Practical digital tools for documents, learning, GIS and fieldwork — together in one place.</div>
        </motion.div>
      </div>
    </section>
  );
}
