import { NextResponse } from "next/server";

import { getAuthCallbackDestination } from "@/lib/auth/callback";
import {
  CANONICAL_SITE_URL,
  getAllowedAuthOrigin,
  getCanonicalCallbackUrl,
} from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const allowLocalhost = process.env.NODE_ENV !== "production";
  const authOrigin = getAllowedAuthOrigin(
    requestUrl.origin,
    allowLocalhost
  );

  // Unknown hosts (including Vercel preview aliases in production) are
  // canonicalized before the one-time authorization code is exchanged.
  if (!authOrigin) {
    return NextResponse.redirect(
      getCanonicalCallbackUrl(request.url)
    );
  }

  const destination = await getAuthCallbackDestination(
    requestUrl.toString(),
    async (code) => {
      const supabase = await createClient();
      return supabase.auth.exchangeCodeForSession(code);
    },
    authOrigin ?? CANONICAL_SITE_URL
  );

  return NextResponse.redirect(destination);
}
