import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Use | YAJU",
  description: "Read the terms that apply when using YAJU tools and services.",
  alternates: { canonical: "/terms" },
};

const sections = [
  {
    title: "1. Using YAJU",
    body: "YAJU provides online field, document and image utilities. You may use the available tools for lawful personal or business purposes, subject to these terms and any instructions shown within an individual tool.",
  },
  {
    title: "2. Your files and information",
    body: "You remain responsible for the files, coordinates and other information you submit. You must have the rights and permissions needed to upload and process that material. Keep your own original copies of important files; YAJU should not be treated as your sole backup or permanent file-storage service.",
  },
  {
    title: "3. Accuracy and professional judgement",
    body: "Outputs may depend on the quality of your inputs, selected settings, coordinate reference systems, units and other assumptions. Check results before relying on them. YAJU tools are aids to your work and do not replace professional judgement, field verification, statutory requirements or independent technical review.",
  },
  {
    title: "4. Availability and changes",
    body: "We aim to keep YAJU useful and available, but we do not guarantee uninterrupted access or that every tool will always be available. Features, usage limits and service arrangements may change as the platform develops.",
  },
  {
    title: "5. Acceptable use",
    body: "Do not use YAJU to break the law, infringe another person's rights, interfere with the service, attempt unauthorised access, distribute malicious code or misuse any tool. We may restrict access where reasonably necessary to protect users, the platform or its service providers.",
  },
  {
    title: "6. Third-party services",
    body: "Some functions may rely on third-party infrastructure or services. Their availability and processing may be subject to their own terms and privacy policies. Review the YAJU Privacy Policy before submitting information.",
  },
  {
    title: "7. Intellectual property",
    body: "YAJU's branding, website design, software and original website content are protected by applicable intellectual-property laws. These terms do not transfer ownership of YAJU materials or of the files you submit.",
  },
  {
    title: "8. Disclaimer and limitation",
    body: "To the extent permitted by applicable law, YAJU is provided on an 'as available' basis. We do not warrant that every output will be error-free or suitable for a particular purpose. You are responsible for independently checking important outputs before use. Nothing in these terms excludes rights or liabilities that cannot lawfully be excluded.",
  },
  {
    title: "9. Updates to these terms",
    body: "These terms may be revised as YAJU introduces or changes features. The revision date shown on this page indicates the latest published version. Continued use after an update means you should review the revised terms.",
  },
];

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-gray-50 px-6 py-16">
      <article className="mx-auto max-w-4xl rounded-3xl border border-gray-200 bg-white p-8 shadow-sm sm:p-12">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">YAJU</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-gray-950">Terms of Use</h1>
        <p className="mt-4 text-sm text-gray-500">Last updated: 16 November 2026</p>
        <p className="mt-8 leading-7 text-gray-700">
          These terms describe the general conditions for using the YAJU website and its tools.
          By accessing or using YAJU, you agree to follow these terms and applicable laws.
        </p>
        <div className="mt-10 space-y-8 text-gray-700">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-xl font-bold text-gray-950">{section.title}</h2>
              <p className="mt-3 leading-7">{section.body}</p>
            </section>
          ))}
        </div>
        <div className="mt-10 border-t border-gray-200 pt-6 text-sm text-gray-600">
          <p>For information about how YAJU handles information and uploaded files, read the <Link href="/privacy" className="font-semibold text-blue-600 hover:text-blue-700">Privacy Policy</Link>.</p>
          <p className="mt-2"><Link href="/" className="font-semibold text-blue-600 hover:text-blue-700">Return to YAJU</Link></p>
        </div>
      </article>
    </main>
  );
}
