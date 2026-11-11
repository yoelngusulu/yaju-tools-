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
import { getRecoveryCallbackUrl } from "@/lib/auth/redirect";

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
    redirect(getRecoveryCallbackUrl(code));
  }

  return (
    <main>
      {/* Hero section */}
      <Hero />
      {/* Main tool categories */}
      <ToolCategories />
      <Suspense fallback={null}>
        <ConditionalGoogleAd
          slot={process.env.NEXT_PUBLIC_ADSENSE_HOME_SLOT}
          className="my-12"
        />
      </Suspense>
      {/* Website features */}
      <Features />
      {/* How the platform works */}
      <HowItWorks />
      {/* Popular tools */}
      <PopularTools />
      {/* Helpful overview of YAJU tools */}
      <section className="bg-white px-5 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">A practical toolkit</p>
            <h2 className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl">Useful tools for fieldwork and everyday tasks</h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              Some jobs start with a coordinate you need to check. Others involve preparing a report, organizing documents or making a file easier to share. YAJU brings practical tools for these tasks together in one place, so you can go straight to the tool you need.
            </p>
          </div>

          <div className="mt-10 grid gap-8 md:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-6 sm:p-8">
              <h3 className="text-xl font-semibold text-slate-900">For GIS and fieldwork</h3>
              <p className="mt-3 leading-7 text-slate-600">
                Not sure which coordinate reference system a map uses? The <Link href="/tools/gis/epsg-crs-finder" className="font-medium text-blue-700 underline decoration-blue-300 underline-offset-4 hover:text-blue-900">CRS/EPSG Finder</Link> helps you look up common systems used in Tanzania and East Africa, with details to review before using them in a GIS project. You can also <Link href="/tools/coordinates-converter" className="font-medium text-blue-700 underline decoration-blue-300 underline-offset-4 hover:text-blue-900">convert coordinates</Link> and measure <Link href="/tools/gis/distance-area-calculator" className="font-medium text-blue-700 underline decoration-blue-300 underline-offset-4 hover:text-blue-900">distance or area</Link> from field data.
              </p>
              <p className="mt-3 leading-7 text-slate-600">
                For water planning, the <Link href="/tools/gis/water-storage-calculator" className="font-medium text-blue-700 underline decoration-blue-300 underline-offset-4 hover:text-blue-900">water storage calculator</Link> helps estimate needs for rainwater harvesting and borehole projects. Check the inputs and assumptions carefully, especially when using an estimate for project planning.
              </p>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-6 sm:p-8">
              <h3 className="text-xl font-semibold text-slate-900">For PDFs, images and QR codes</h3>
              <p className="mt-3 leading-7 text-slate-600">
                Create a QR code for a website, a message, contact details or a Wi-Fi network. If you have an HTML report, preview it and save it as a PDF. You can also combine several PDFs, split a document into smaller parts, or compress files to make sharing easier.
              </p>
              <p className="mt-3 leading-7 text-slate-600">
                When you need to work with a document in another format, convert a PDF to <Link href="/tools/pdf/pdf-to-word" className="font-medium text-blue-700 underline decoration-blue-300 underline-offset-4 hover:text-blue-900">Word</Link>, <Link href="/tools/pdf/pdf-to-excel" className="font-medium text-blue-700 underline decoration-blue-300 underline-offset-4 hover:text-blue-900">Excel</Link> or <Link href="/tools/pdf/pdf-to-powerpoint" className="font-medium text-blue-700 underline decoration-blue-300 underline-offset-4 hover:text-blue-900">PowerPoint</Link>. Image tools let you turn images into PDFs or reduce image file sizes.
              </p>
            </article>
          </div>

          <div className="mt-8 rounded-2xl border border-blue-100 bg-blue-50/70 p-6 sm:p-8">
            <h3 className="text-xl font-semibold text-slate-900">Getting started</h3>
            <p className="mt-3 leading-7 text-slate-700">
              Choose a tool and follow the instructions on its page. Enter the requested details or select your file, then review the result before downloading it. For measurements and water storage, treat the result as a planning estimate and compare it with your project requirements.
            </p>
          </div>
        </div>
      </section>
      {/* Partnership invitation */}
      <section className="bg-slate-950 px-5 py-16 text-white sm:py-20">
        <div className="mx-auto flex max-w-6xl flex-col gap-7 rounded-2xl border border-white/10 bg-white/[0.04] p-7 sm:p-10 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-300">Grow with YAJU</p>
            <h2 className="mt-3 text-3xl font-bold">Let’s build digital solutions together.</h2>
            <p className="mt-3 leading-7 text-slate-300">We welcome technology, business, strategic and affiliate partners who want to create more value through practical digital tools.</p>
          </div>
          <Link href="/partners" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 font-semibold text-white transition hover:bg-blue-500">
            Become a Partner <ArrowRight size={18} />
          </Link>
        </div>
      </section>
      {/* Waitlist signup */}
      <WaitlistForm />
      {/* Call to action */}
      <CallToAction />
      {/* Floating AI chatbot */}
      <AIAssistant />
    </main>
  );
}
