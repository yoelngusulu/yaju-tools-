import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "What's New | YAJU Tools Updates",
  description: "Read recent YAJU product, documentation and learning-resource updates.",
  alternates: { canonical: "/whats-new" },
};

const updates = [
  { date: "16 November 2026", title: "Knowledge Hub expanded", description: "Added detailed learning resources covering coordinate reference systems, GIS measurements, water storage, PDF preparation, rainfall records and dry-period water-balance assessment.", links: [{ href: "/learn", label: "Browse tutorials" }, { href: "/learn/examples", label: "See worked examples" }] },
  { date: "16 November 2026", title: "Help and feedback pathways improved", description: "Introduced a structured FAQ Centre and a feedback form for suggestions, questions and issue reports. A reply email is optional and is not published on the website.", links: [{ href: "/faq", label: "Visit FAQ Centre" }, { href: "/feedback", label: "Send feedback" }] },
  { date: "16 November 2026", title: "About YAJU and site navigation refreshed", description: "Clarified the purpose and scope of YAJU's product areas, connected educational resources to relevant tools, and updated navigation and sitemap entries.", links: [{ href: "/about", label: "About YAJU" }] },
  { date: "Earlier updates", title: "Learning content and responsible-use guidance", description: "Expanded selected tool guides with input checks, practical workflows, limitations and advice for reviewing processed files and calculation results.", links: [{ href: "/docs", label: "Read documentation" }] }
];

export default function WhatsNewPage() {
  return <main className="min-h-screen bg-white px-5 py-14"><div className="mx-auto max-w-4xl">
    <header><p className="text-sm font-semibold uppercase tracking-widest text-blue-700">Product updates</p><h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950">What's New at YAJU</h1><p className="mt-4 text-lg leading-8 text-slate-600">A record of product, documentation and learning-resource improvements.</p></header>
    <ol className="mt-10 space-y-6 border-l-2 border-blue-100 pl-6">{updates.map(update => <li key={update.title} className="relative rounded-2xl border border-slate-200 p-6"><span className="absolute -left-[33px] top-7 h-4 w-4 rounded-full border-4 border-white bg-blue-600" /><p className="text-xs font-semibold uppercase tracking-wider text-blue-700">{update.date}</p><h2 className="mt-2 text-xl font-bold text-slate-950">{update.title}</h2><p className="mt-3 leading-7 text-slate-600">{update.description}</p><div className="mt-4 flex flex-wrap gap-4">{update.links.map(link => <Link key={link.href} href={link.href} className="font-semibold text-blue-700 hover:text-blue-900">{link.label} →</Link>)}</div></li>)}</ol>
  </div></main>;
}
