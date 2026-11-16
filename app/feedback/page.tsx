import type { Metadata } from "next";
import FeedbackForm from "@/components/FeedbackForm";

export const metadata: Metadata = {
  title: "Send Feedback | YAJU Tools",
  description: "Send YAJU a product suggestion, question or issue report through the website feedback form.",
  alternates: { canonical: "/feedback" },
};

export default function FeedbackPage() {
  return <main className="min-h-screen bg-slate-50 px-5 py-14"><div className="mx-auto max-w-3xl">
    <header><p className="text-sm font-semibold uppercase tracking-widest text-blue-700">Help us improve</p><h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950">Share your feedback</h1><p className="mt-4 text-lg leading-8 text-slate-600">Report a problem, ask a question or suggest a tool or improvement. Your message is sent to YAJU for review. An email address is optional if you would like a reply.</p></header>
    <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"><FeedbackForm /></div>
    <p className="mt-5 text-sm leading-6 text-slate-500">Please do not include passwords, payment credentials, confidential project files or sensitive personal information. Read the <a href="/privacy" className="font-medium text-blue-700 underline">Privacy Policy</a> to understand how feedback submissions are handled.</p>
  </div></main>;
}
