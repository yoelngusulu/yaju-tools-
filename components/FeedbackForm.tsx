"use client";

import { FormEvent, useState } from "react";

type SubmissionState = "idle" | "sending" | "success" | "error";

export default function FeedbackForm() {
  const [status, setStatus] = useState<SubmissionState>("idle");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("General feedback");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    setMessage("");
    const form = event.currentTarget;
    const data = new FormData(form);
    const payload = {
      category: String(data.get("category") ?? ""),
      message: String(data.get("message") ?? ""),
      email: String(data.get("email") ?? ""),
      pageUrl: String(data.get("pageUrl") ?? ""),
      website: String(data.get("website") ?? ""),
    };
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "We could not send your feedback. Please try again.");
      form.reset();
      setCategory("General feedback");
      setStatus("success");
      setMessage("Thank you. Your feedback has been submitted for review.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "We could not send your feedback. Please try again.");
    }
  }

  return <form onSubmit={handleSubmit} className="space-y-5">
    <div><label htmlFor="feedback-category" className="mb-2 block text-sm font-semibold text-slate-800">What is this about?</label><select id="feedback-category" name="category" value={category} onChange={event => setCategory(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900" required><option>General feedback</option><option>Report a problem</option><option>Feature suggestion</option><option>Question about a tool</option><option>Accessibility issue</option></select></div>
    <div><label htmlFor="feedback-message" className="mb-2 block text-sm font-semibold text-slate-800">Your message</label><textarea id="feedback-message" name="message" rows={6} minLength={10} maxLength={3000} required placeholder="Describe your suggestion, question or the steps that caused the problem." className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" /></div>
    <div><label htmlFor="feedback-email" className="mb-2 block text-sm font-semibold text-slate-800">Email address <span className="font-normal text-slate-500">(optional, if you want a reply)</span></label><input id="feedback-email" name="email" type="email" maxLength={254} placeholder="you@example.com" className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" /></div>
    <div><label htmlFor="feedback-page" className="mb-2 block text-sm font-semibold text-slate-800">Page or tool (optional)</label><input id="feedback-page" name="pageUrl" maxLength={300} placeholder="e.g. Coordinate Converter" className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" /></div>
    <div aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden"><label htmlFor="feedback-website">Leave this field empty</label><input id="feedback-website" name="website" tabIndex={-1} autoComplete="off" /></div>
    <button type="submit" disabled={status === "sending"} className="rounded-lg bg-blue-700 px-6 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60">{status === "sending" ? "Sending…" : "Submit feedback"}</button>
    {message && <p role="status" aria-live="polite" className={status === "error" ? "text-sm font-medium text-red-700" : "text-sm font-medium text-green-700"}>{message}</p>}
  </form>;
}
