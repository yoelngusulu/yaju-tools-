import { NextResponse } from "next/server";

import { getAuthCallbackDestination } from "@/lib/auth/callback";
import {
  CANONICAL_SITE_URL,
  getCanonicalCallbackUrl,
} from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);

  if (requestUrl.origin !== CANONICAL_SITE_URL) {
    return NextResponse.redirect(
      getCanonicalCallbackUrl(request.url)
    );
  }

  const destination = await getAuthCallbackDestination(
    requestUrl.toString(),
    async (code) => {
      const supabase = await createClient();
      return supabase.auth.exchangeCodeForSession(code);
    }
  );

  return NextResponse.redirect(destination);
}
