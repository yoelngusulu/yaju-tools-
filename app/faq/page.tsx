import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "FAQ Centre | YAJU Tools",
  description: "Answers about using YAJU tools, file processing, coordinate conversions, calculations, accounts, privacy and feedback.",
  alternates: { canonical: "/faq" },
};

const groups = [
  { title: "Using YAJU", items: [
    ["What is YAJU?", "YAJU is an online workspace that brings together field and GIS utilities, PDF tools, image tools and practical learning resources."],
    ["Do I need to install software?", "Most YAJU tools are accessed through a web browser. Some operations may depend on your browser, device capabilities or an available internet connection."],
    ["Can I use YAJU on a phone?", "The website is designed to be responsive. The available controls and processing experience can vary by tool and device, so review the result before relying on it."],
    ["Are all tools free?", "Some tools are available without payment, while selected features or usage levels may be subject to plan limits. Check the current Pricing page for the latest information."]
  ]},
  { title: "Files, privacy and security", items: [
    ["Are uploaded files stored permanently?", "YAJU is not intended to be a permanent cloud storage or backup service. Processing and storage behaviour can vary by tool. Keep your own copy of important files and consult the Privacy Policy before uploading sensitive material."],
    ["Should I upload confidential documents?", "Only upload information you are authorised to process and comfortable submitting to an online service. Follow your organisation's data-handling rules and avoid unnecessary sensitive information."],
    ["Does a successful conversion guarantee an accurate result?", "No. Open the output and check page count, formatting, tables, images, text and readability. Scanned files and complex layouts may require manual correction."]
  ]},
  { title: "GIS, coordinates and calculations", items: [
    ["How do I choose the correct coordinate system?", "Confirm the source datum, coordinate reference system, units, axis order, UTM zone and hemisphere from the survey notes or authoritative metadata. Do not infer a CRS from coordinate values alone."],
    ["Why can a coordinate conversion place a point incorrectly?", "Common causes include a wrong source CRS, swapped latitude and longitude, incorrect signs, a missing UTM hemisphere or an unsuitable datum transformation. Test a known point against trusted control data."],
    ["Can I use YAJU calculator results for final engineering design?", "Treat online calculations as preliminary or supporting tools unless the relevant page explicitly states otherwise. Final decisions require suitable site data, applicable standards and qualified professional review."]
  ]},
  { title: "Accounts, support and feedback", items: [
    ["What if a tool does not work?", "Check your connection, input format and file size, then retry with a small sample. If the issue continues, send the tool name, steps to reproduce and a short description through the Feedback page. Do not attach confidential files."],
    ["How can I suggest a feature?", "Use the Feedback form and select Feature suggestion. A reply email is optional; no personal email address is displayed publicly."],
    ["How do I report a privacy concern?", "Use the feedback pathway to flag the issue without including passwords or sensitive data. The form is for product feedback and is not a secure channel for formal legal requests."]
  ]}
];

export default function FAQPage() {
  return <main className="min-h-screen bg-slate-50 px-5 py-14"><div className="mx-auto max-w-4xl">
    <header><p className="text-sm font-semibold uppercase tracking-widest text-blue-700">Help & Support</p><h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950">FAQ Centre</h1><p className="mt-4 text-lg leading-8 text-slate-600">Straightforward answers about YAJU tools, results, accounts and responsible use. If your question is not covered, send us a message through the feedback form.</p></header>
    <div className="mt-10 space-y-10">{groups.map(group => <section key={group.title}><h2 className="text-2xl font-bold text-slate-950">{group.title}</h2><div className="mt-4 space-y-3">{group.items.map(([q,a]) => <details key={q} className="group rounded-xl border border-slate-200 bg-white p-5"><summary className="cursor-pointer list-none pr-6 font-semibold text-slate-900">{q}<span className="float-right text-blue-700">＋</span></summary><p className="mt-3 leading-7 text-slate-600">{a}</p></details>)}</div></section>)}</div>
    <div className="mt-12 rounded-2xl bg-blue-950 p-7 text-white"><h2 className="text-xl font-bold">Still need help?</h2><p className="mt-2 leading-7 text-blue-100">Tell us what you were trying to do and what happened. Do not include passwords, payment credentials or confidential files.</p><Link href="/feedback" className="mt-5 inline-flex rounded-lg bg-white px-5 py-3 font-semibold text-blue-950">Contact through feedback</Link></div>
  </div></main>;
}
