import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { learningArticles } from "@/lib/learning/articles";

type PageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return learningArticles.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = learningArticles.find((item) => item.slug === slug);
  if (!article) return {};
  return {
    title: article.title,
    description: article.summary,
    alternates: { canonical: `/learn/${article.slug}` },
  };
}

export default async function LearningArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const article = learningArticles.find((item) => item.slug === slug);
  if (!article) notFound();

  return (
    <main className="min-h-screen bg-white px-5 py-12 sm:py-16">
      <article className="mx-auto max-w-4xl">
        <nav aria-label="Breadcrumb" className="text-sm text-slate-500">
          <Link href="/learn" className="font-medium text-blue-700 hover:text-blue-900">Learning Center</Link>
          <span className="mx-2">/</span>
          <span>{article.category}</span>
        </nav>
        <header className="mt-8 border-b border-slate-200 pb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">{article.category} · {article.readTime}</p>
          <h1 className="mt-3 text-4xl font-bold leading-tight tracking-tight text-slate-950 sm:text-5xl">{article.title}</h1>
          <p className="mt-5 text-lg leading-8 text-slate-600">{article.summary}</p>
        </header>
        <div className="mt-10 space-y-10">
          {article.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-2xl font-bold tracking-tight text-slate-950">{section.heading}</h2>
              {section.paragraphs.map((paragraph, index) => <p key={index} className="mt-4 leading-8 text-slate-700">{paragraph}</p>)}
              {section.bullets && <ul className="mt-4 list-disc space-y-2 pl-6 leading-7 text-slate-700">{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>}
            </section>
          ))}
        </div>
        {article.toolHref && (
          <aside className="mt-12 rounded-2xl border border-blue-100 bg-blue-50 p-6 sm:p-8">
            <h2 className="text-xl font-bold text-slate-950">Try the related YAJU tool</h2>
            <p className="mt-2 leading-7 text-slate-700">Apply the steps in this guide using the relevant tool. Review all inputs and results before using them in professional work.</p>
            <Link href={article.toolHref} className="mt-5 inline-flex rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800">{article.toolLabel}</Link>
          </aside>
        )}
        <footer className="mt-12 border-t border-slate-200 pt-6">
          <Link href="/learn" className="font-semibold text-blue-700 hover:text-blue-900">← Back to Learning Center</Link>
        </footer>
      </article>
    </main>
  );
}
