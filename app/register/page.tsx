"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import {
  getAuthCallbackUrl,
  getSafeNextPath as validateNextPath,
} from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/client";

function RegisterPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = validateNextPath(searchParams.get("next"));
  const supabase = createClient();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const loginHref =
    nextPath === "/dashboard"
      ? "/login"
      : `/login?next=${encodeURIComponent(nextPath)}`;

  const handleRegister = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }

    if (password.length < 6) {
      setError(
        "Password must contain at least 6 characters."
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      const { data, error: signUpError } =
        await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: name.trim(),
            },
            emailRedirectTo: getAuthCallbackUrl(nextPath),
          },
        });

      if (signUpError) {
        throw signUpError;
      }

      if (data.session) {
        router.push(nextPath);
        router.refresh();
        return;
      }

      setMessage(
        "Account created. Please check your email to confirm your account, then log in to continue."
      );

      setName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
    } catch (registerError) {
      setError(
        registerError instanceof Error
          ? registerError.message
          : "Unable to create your account."
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
            Create Account
          </h1>

          <p className="mt-3 text-gray-600">
            Create your YAJU account.
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
          onSubmit={handleRegister}
          className="mt-8 space-y-5"
        >
          <div>
            <label
              htmlFor="name"
              className="mb-2 block font-medium text-gray-700"
            >
              Full Name
            </label>

            <input
              id="name"
              type="text"
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              placeholder="Enter your full name"
              autoComplete="name"
              required
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

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

          <div>
            <label
              htmlFor="password"
              className="mb-2 block font-medium text-gray-700"
            >
              Password
            </label>

            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              placeholder="Minimum 6 characters"
              autoComplete="new-password"
              required
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label
              htmlFor="confirm-password"
              className="mb-2 block font-medium text-gray-700"
            >
              Confirm Password
            </label>

            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(event.target.value)
              }
              placeholder="Enter password again"
              autoComplete="new-password"
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
              ? "Creating Account..."
              : "Create Account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{" "}
          <Link
            href={loginHref}
            className="font-semibold text-blue-600 hover:underline"
          >
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6 py-12">
          <p role="status" className="text-sm text-gray-600">
            Loading registration…
          </p>
        </main>
      }
    >
      <RegisterPageContent />
    </Suspense>
  );
}
