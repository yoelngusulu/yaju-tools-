import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import Hero from "@/components/Hero";
import ToolCategories from "@/components/ToolCategories";
import Features from "@/components/Features";
import HowItWorks from "@/components/HowItWorks";
import PopularTools from "@/components/PopularTools";
import WaitlistForm from "@/components/WaitlistForm";
import CallToAction from "@/components/CallToAction";
import AIAssistant from "@/components/AIAssistant";
import ConditionalGoogleAd from "@/components/ConditionalGoogleAd";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const code = typeof params.code === "string" ? params.code : null;
  // Supabase recovery emails can land on the Site URL with a code query parameter
  // when the email template or redirect allow-list overrides redirectTo.
  if (code) {
    redirect(`/auth/callback?code=${encodeURIComponent(code)}&next=/update-password`);
  }

  return (
    <main>
      <Hero />
      <ToolCategories />
      <Suspense fallback={null}>
        <ConditionalGoogleAd
          slot={process.env.NEXT_PUBLIC_ADSENSE_HOME_SLOT}
          className="my-12"
        />
      </Suspense>
      <Features />
      <HowItWorks />
      <PopularTools />

      <section className="bg-white px-5 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
              One platform, practical possibilities
            </p>
            <h2 className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl">
              Practical digital support for work, study and field projects
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              Different tasks often require different tools: preparing a report,
              organizing learning materials, checking a coordinate system or
              making a document easier to share. YAJU brings practical tools
              for these everyday and technical workflows together in one place.
            </p>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-6 sm:p-8">
              <h3 className="text-xl font-semibold text-slate-900">
                For learning, documents and training
              </h3>
              <p className="mt-3 leading-7 text-slate-600">
                Students, trainers and professionals often work with lecture
                notes, course materials, assignments, reports and training
                documents in different formats. YAJU document tools can help
                convert supported PDFs to Word, Excel or PowerPoint, combine
                several PDF files, split documents into smaller parts and
                compress PDFs for easier sharing and storage.
              </p>
              <p className="mt-3 leading-7 text-slate-600">
                Available learning resources also help explain supported
                workflows so users can prepare their files more confidently.
              </p>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-6 sm:p-8">
              <h3 className="text-xl font-semibold text-slate-900">
                For GIS, fieldwork and technical tasks
              </h3>
              <p className="mt-3 leading-7 text-slate-600">
                Need to identify a coordinate reference system? The{" "}
                <Link href="/tools/gis/epsg-crs-finder" className="font-medium text-blue-700 underline decoration-blue-300 underline-offset-4 hover:text-blue-900">
                  CRS/EPSG Finder
                </Link>{" "}
                helps you look up coordinate systems. You can also{" "}
                <Link href="/tools/coordinates-converter" className="font-medium text-blue-700 underline decoration-blue-300 underline-offset-4 hover:text-blue-900">
                  convert coordinates
                </Link>{" "}
                and calculate{" "}
                <Link href="/tools/gis/distance-area-calculator" className="font-medium text-blue-700 underline decoration-blue-300 underline-offset-4 hover:text-blue-900">
                  distances and areas
                </Link>{" "}
                for mapping and field tasks.
              </p>
              <p className="mt-3 leading-7 text-slate-600">
                The{" "}
                <Link href="/tools/gis/water-storage-calculator" className="font-medium text-blue-700 underline decoration-blue-300 underline-offset-4 hover:text-blue-900">
                  Water Storage Calculator
                </Link>{" "}
                supports water storage estimation for rainwater harvesting
                and related planning. Review its inputs and assumptions before
                applying estimates to a project.
              </p>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-6 sm:p-8">
              <h3 className="text-xl font-semibold text-slate-900">
                For everyday digital tasks
              </h3>
              <p className="mt-3 leading-7 text-slate-600">
                Create QR codes for websites, messages, contact details or
                Wi-Fi networks. Turn supported HTML files into PDFs, convert
                images to PDF, and use document tools to prepare files for
                sharing, submission or archiving.
              </p>
              <p className="mt-3 leading-7 text-slate-600">
                Open the tool you need, follow its instructions and review
                the output before downloading or sharing it.
              </p>
            </article>
          </div>

          <div className="mt-8 rounded-2xl border border-blue-100 bg-blue-50/70 p-6 sm:p-8">
            <h3 className="text-xl font-semibold text-slate-900">
              A straightforward way to get started
            </h3>
            <p className="mt-3 leading-7 text-slate-700">
              Choose a tool that matches your task, provide the requested
              information or select your file, then review the result. Each
              tool provides instructions for its supported workflow. For
              technical calculations, check the assumptions and confirm that
              the results meet your project requirements.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-slate-950 px-5 py-16 text-white sm:py-20">
        <div className="mx-auto flex max-w-6xl flex-col gap-7 rounded-2xl border border-white/10 bg-white/[0.04] p-7 sm:p-10 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-300">
              Grow with YAJU
            </p>
            <h2 className="mt-3 text-3xl font-bold">
              Let’s build digital solutions together.
            </h2>
            <p className="mt-3 leading-7 text-slate-300">
              We welcome technology, business, strategic and affiliate
              partners who want to create more value through practical
              digital tools.
            </p>
          </div>
          <Link
            href="/partners"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 font-semibold text-white transition hover:bg-blue-500"
          >
            Become a Partner <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <WaitlistForm />
      <CallToAction />
      <AIAssistant />
    </main>
  );
}
