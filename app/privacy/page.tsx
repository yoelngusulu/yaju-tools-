import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Learn how YAJU handles account information, uploaded files, temporary processing, cookies and advertising.",
  alternates: { canonical: "/privacy" },
};

const retentionRows = [
  { plan: "Free", period: "24 hours" },
  { plan: "Daily Pass", period: "24 hours" },
  { plan: "Pro Monthly", period: "7 days" },
  { plan: "Pro Yearly", period: "7 days" },
  { plan: "Power User", period: "30 days" },
];

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
          Last updated: 11 October 2026
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
                If you join the YAJU waitlist, we store your email address and
                signup consent time to provide requested product announcements.
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
              3. Uploaded files and temporary storage
            </h2>
            <p className="mt-4 leading-7">
              Uploaded files are used only to perform the operation you request.
              YAJU is a temporary processing workspace and is not a permanent cloud
              storage service. Do not use YAJU as the only copy of an important
              file.
            </p>
            <p className="mt-4 leading-7">
              Tools that do not require persistent storage process files
              temporarily. When persistent account storage is enabled, stored files
              will receive an expiry time based on the active plan and will be
              scheduled for deletion after the period below.
            </p>

            <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-100 text-gray-950">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Plan</th>
                    <th className="px-5 py-3 font-semibold">
                      Maximum retention
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {retentionRows.map((item) => (
                    <tr key={item.plan}>
                      <td className="px-5 py-3 font-medium text-gray-900">
                        {item.plan}
                      </td>
                      <td className="px-5 py-3">{item.period}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-4 text-sm leading-6 text-gray-600">
              Operational backups, security logs or legal records may be kept
              separately for a limited period where reasonably necessary. These
              records are not presented as permanent user file storage.
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
              limits. Free tools may also display Google AdSense advertising.
              Google and its partners may use cookies or similar technologies to
              deliver and measure ads, subject to consent requirements and Google&apos;s
              own policies. Browser settings and available consent controls can be
              used to manage non-essential cookies.
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
            <h2 className="text-2xl font-bold text-gray-950">9. Contact</h2>
            <p className="mt-4 leading-7">
              For privacy questions or account-data requests, use the contact
              details provided on the{" "}
              <Link
                href="/about"
                className="font-semibold text-blue-600 hover:text-blue-700"
              >
                About YAJU
              </Link>{" "}
              page.
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
