import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Learn how YAJU handles account information, uploaded files, temporary processing, cookies and advertising.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-gray-50 px-6 py-16">
      <article className="mx-auto max-w-4xl rounded-3xl border border-gray-200 bg-white p-8 shadow-sm sm:p-12">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
          YAJU
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-gray-950">
          Privacy Policy
        </h1>
        <p className="mt-4 text-sm text-gray-500">
          Last updated: 16 November 2026
        </p>

        <div className="mt-10 space-y-10 text-gray-700">
          <section>
            <h2 className="text-2xl font-bold text-gray-950">1. Overview</h2>
            <p className="mt-4 leading-7">
              YAJU provides document, image and fieldwork utilities. This policy
              explains the information YAJU processes when you visit the website,
              create an account or use a tool.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-950">
              2. Information we process
            </h2>
            <ul className="mt-4 list-disc space-y-3 pl-6 leading-7">
              <li>
                Account information, such as your email address and authentication
                details, when you register or sign in.
              </li>
              <li>
                Files, coordinates and other content you submit to complete a
                requested operation.
              </li>
              <li>
                Basic technical information, such as browser type, device type,
                approximate location, error logs and usage events.
              </li>
              <li>
                Payment-reference and subscription information when paid plans
                become available. YAJU does not request your account password as
                part of payment verification.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-950">
              3. Uploaded files and processing
            </h2>
            <p className="mt-4 leading-7">
              Files and data you submit are processed to provide the operation you request.
              The processing steps and whether temporary or account-related storage is used
              can vary by tool and feature. YAJU is not intended to be a permanent cloud
              storage or backup service.
            </p>
            <p className="mt-4 leading-7">
              Do not assume that a file is deleted immediately after processing or that a
              particular retention period applies to every tool. Keep your own copy of
              important files and avoid uploading information that you do not need the tool
              to process.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-950">
              4. Authentication and service providers
            </h2>
            <p className="mt-4 leading-7">
              YAJU uses service providers, including Supabase for authentication
              and database services and Vercel for application hosting. These
              providers may process limited information required to operate and
              secure the service under their own privacy terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-950">
              5. Cookies, analytics and advertising
            </h2>
            <p className="mt-4 leading-7">
              YAJU may use essential cookies for sign-in, security and usage
              limits. Where advertising is enabled, YAJU may display third-party
              ads such as Google AdSense. The advertising provider and its partners
              may use cookies or similar technologies to deliver, personalise where
              permitted, and measure ads, subject to applicable consent requirements
              and the provider&apos;s policies. Browser settings and any available
              consent controls can be used to manage non-essential cookies.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-950">
              6. How information is used
            </h2>
            <ul className="mt-4 list-disc space-y-3 pl-6 leading-7">
              <li>Provide the requested tools and downloads.</li>
              <li>Authenticate accounts and enforce usage limits.</li>
              <li>Detect misuse, investigate errors and protect the service.</li>
              <li>Improve tool reliability, usability and performance.</li>
              <li>Administer subscriptions and payments when enabled.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-950">
              7. Your choices and responsibilities
            </h2>
            <p className="mt-4 leading-7">
              You may request access to, correction of or deletion of eligible
              account information. You are responsible for ensuring that you have
              permission to upload any file or data submitted to YAJU. Avoid
              uploading unnecessary confidential, illegal or highly sensitive
              information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-950">
              8. Security and policy changes
            </h2>
            <p className="mt-4 leading-7">
              YAJU uses reasonable technical and organizational safeguards, but no
              internet service can guarantee absolute security. This policy may be
              updated as storage, payments and other features are introduced. The
              current revision date will remain visible at the top of this page.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-950">9. Feedback submissions</h2>
            <p className="mt-4 leading-7">
              If you submit feedback, YAJU processes the category, message, optional
              reply email and page reference you provide. Basic request-security
              information may also be processed to prevent abuse. Feedback is used
              to review product quality, investigate reported issues and improve
              the service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-950">10. Contact and privacy requests</h2>
            <p className="mt-4 leading-7">
              For a privacy question or a request to access, correct or delete
              eligible personal information, use the YAJU feedback form and select
              “General feedback”. Briefly describe the request and provide an email
              address if you want YAJU to contact you or need the request linked to
              an account. YAJU may ask for additional information to verify a
              request before taking action.
            </p>
            <p className="mt-4 leading-7">
              Do not include passwords, payment credentials, identity documents,
              confidential files or other sensitive information in the feedback
              form. The form is intended to start a request, not to receive
              sensitive supporting documents or legal notices.
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
