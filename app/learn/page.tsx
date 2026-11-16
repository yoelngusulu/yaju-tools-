import type { Metadata } from "next";
import Link from "next/link";
import { learningArticles } from "@/lib/learning/articles";

export const metadata: Metadata = {
  title: "YAJU Knowledge Hub | GIS, Hydrology and Digital Productivity",
  description: "Practical original guides for coordinate systems, GIS measurements, water storage planning, PDF workflows and everyday digital tasks.",
  alternates: { canonical: "/learn" },
};

export default function LearningCenterPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-5 py-14 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <header className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">YAJU Knowledge Hub</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">Practical guides for better digital and technical work</h1>
          <p className="mt-5 text-lg leading-8 text-slate-600">Explore clear explanations, worked concepts and quality checks for GIS, hydrology, water planning and document workflows. Each guide is designed to help you understand the task, use the right inputs and review the result.</p>
        </header>
        <section className="mt-12 grid gap-6 md:grid-cols-2">
          {learningArticles.map((article) => (
            <article key={article.slug} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">{article.category} · {article.readTime}</p>
              <h2 className="mt-3 text-2xl font-bold leading-tight text-slate-950">{article.title}</h2>
              <p className="mt-4 flex-1 leading-7 text-slate-600">{article.summary}</p>
              <Link href={`/learn/${article.slug}`} className="mt-6 inline-flex font-semibold text-blue-700 hover:text-blue-900">Read the guide <span aria-hidden="true" className="ml-2">→</span></Link>
            </article>
          ))}
        </section>
        <section className="mt-12 rounded-2xl bg-slate-900 p-7 text-white sm:p-9">
          <h2 className="text-2xl font-bold">Learn, then put the guidance into practice</h2>
          <p className="mt-3 max-w-3xl leading-7 text-slate-300">Use the guides alongside YAJU tools. Always verify source data, assumptions and outputs before using calculations or converted files in professional work.</p>
          <Link href="/tools" className="mt-5 inline-flex rounded-lg bg-white px-5 py-3 font-semibold text-slate-900 hover:bg-slate-100">Explore YAJU tools</Link>
        </section>
      </div>
    </main>
  );
}
