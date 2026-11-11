import { NextResponse } from "next/server";

import { CANONICAL_SITE_URL } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();

  await supabase.auth.signOut();

  return NextResponse.redirect(new URL("/", CANONICAL_SITE_URL));
}
