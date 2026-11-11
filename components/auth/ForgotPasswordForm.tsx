"use client";

import Link from "next/link";
import { useState } from "react";

import { getAuthCallbackUrl } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordForm() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleReset = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError("");
    setMessage("");
    setIsLoading(true);

    try {
      const { error: resetError } =
        await supabase.auth.resetPasswordForEmail(
          email.trim(),
          {
            redirectTo: getAuthCallbackUrl("/update-password"),
          }
        );

      if (resetError) {
        throw resetError;
      }

      setMessage(
        "Password reset link sent. Please check your email."
      );
    } catch (resetError) {
      setError(
        resetError instanceof Error
          ? resetError.message
          : "Unable to send password reset email."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6 py-12">
      <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-8 shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Forgot Password
          </h1>

          <p className="mt-3 text-gray-600">
            Enter your email and we&apos;ll send you a password reset link.
          </p>
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        {message && (
          <div className="mt-6 rounded-xl border border-green-300 bg-green-50 p-4 text-sm text-green-700">
            {message}
          </div>
        )}

        <form
          onSubmit={handleReset}
          className="mt-8 space-y-5"
        >
          <div>
            <label
              htmlFor="email"
              className="mb-2 block font-medium text-gray-700"
            >
              Email Address
            </label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="you@example.com"
              autoComplete="email"
              required
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading
              ? "Sending..."
              : "Send Reset Link"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Remember your password?{" "}
          <Link
            href="/login"
            className="font-semibold text-blue-600 hover:underline"
          >
            Back to Login
          </Link>
        </p>
      </div>
    </main>
  );
}
