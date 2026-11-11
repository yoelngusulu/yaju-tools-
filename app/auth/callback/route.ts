import { NextResponse } from "next/server";

import { CANONICAL_SITE_URL, getSafeNextPath } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextPath = getSafeNextPath(requestUrl.searchParams.get("next"));
  const isPasswordReset = nextPath === "/update-password";

  if (!code) {
    const destination = isPasswordReset
      ? "/forgot-password?error=missing-code"
      : "/login?error=auth-callback";
    return NextResponse.redirect(new URL(destination, CANONICAL_SITE_URL));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("Auth callback error:", error);
    const destination = isPasswordReset
      ? "/forgot-password?error=reset-link-invalid"
      : "/login?error=auth-callback";
    return NextResponse.redirect(new URL(destination, CANONICAL_SITE_URL));
  }

  return NextResponse.redirect(new URL(nextPath, CANONICAL_SITE_URL));
}
