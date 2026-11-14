"use client";

import { FormEvent, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Mail } from "lucide-react";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (status === "submitting") {
      return;
    }

    setMessage("");

    const trimmedEmail = email.trim();

    if (!emailPattern.test(trimmedEmail)) {
      setStatus("error");
      setMessage("Please enter a valid email address.");
      return;
    }

    if (website) {
      setStatus("success");
      setMessage("You're on the list! We'll keep you updated.");
      setEmail("");
      return;
    }

    try {
      setStatus("submitting");

      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: trimmedEmail,
          website,
          consent: true,
        }),
      });

      if (!response.ok) {
        throw new Error("Waitlist submission failed");
      }

      setStatus("success");
      setMessage("You're on the list! We'll keep you updated.");
      setEmail("");
    } catch {
      setStatus("error");
      setMessage("We couldn't join the waitlist right now. Please try again.");
    }
  };

  const isSubmitting = status === "submitting";
  const isSuccess = status === "success";
  const isError = status === "error";

  return (
    <section className="bg-slate-950 px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl rounded-3xl border border-blue-400/20 bg-slate-900 p-6 shadow-2xl shadow-blue-950/30 sm:p-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.15fr] lg:items-center">
          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/30">
              <Mail size={24} aria-hidden="true" />
            </div>

            <h2 className="mt-6 text-3xl font-bold text-white sm:text-4xl">
              Join the YAJU Waitlist
            </h2>

            <p className="mt-4 text-base leading-7 text-slate-300 sm:text-lg">
              Get product updates, new tool announcements and early access to upcoming YAJU features.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="rounded-2xl border border-white/10 bg-white p-5 shadow-xl sm:p-6">
            <div className="hidden" aria-hidden="true">
              <label htmlFor="waitlist-website">Website</label>
              <input
                id="waitlist-website"
                name="website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(event) => setWebsite(event.target.value)}
              />
            </div>

            <label htmlFor="waitlist-email" className="block text-sm font-semibold text-gray-800">
              Email address
            </label>

            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <input
                id="waitlist-email"
                name="email"
                type="email"
                required
                inputMode="email"
                autoComplete="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (status !== "submitting") {
                    setStatus("idle");
                    setMessage("");
                  }
                }}
                className="min-h-12 flex-1 rounded-xl border border-gray-300 px-4 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                disabled={isSubmitting || isSuccess}
              />

              <button
                type="submit"
                disabled={isSubmitting || isSuccess}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin" size={18} aria-hidden="true" />
                    Joining...
                  </>
                ) : (
                  "Join Waitlist"
                )}
              </button>
            </div>

            {message ? (
              <p
                className={`mt-4 flex items-start gap-2 text-sm font-medium ${
                  isSuccess ? "text-green-700" : "text-red-600"
                }`}
                role={isError ? "alert" : "status"}
              >
                {isSuccess ? (
                  <CheckCircle2 className="mt-0.5 shrink-0" size={17} aria-hidden="true" />
                ) : (
                  <AlertCircle className="mt-0.5 shrink-0" size={17} aria-hidden="true" />
                )}
                <span>{message}</span>
              </p>
            ) : null}

            <p className="mt-4 text-sm leading-6 text-gray-500">
              By joining, you agree to receive occasional YAJU product updates. You can unsubscribe anytime.
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}
