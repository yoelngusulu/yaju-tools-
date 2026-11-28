import { NextRequest, NextResponse } from "next/server";

import { isAllowedConversionOrigin } from "@/lib/security/conversionOrigin";
import { getUsageIdentity, isLimitedToolId, reserveToolUsage } from "@/lib/supabase/toolUsage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!isAllowedConversionOrigin(request)) return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 });
  const body = await request.json().catch(() => null) as { toolId?: unknown } | null;
  if (!body || !isLimitedToolId(body.toolId)) return NextResponse.json({ error: "Invalid limited tool." }, { status: 400 });
  try {
    const identity = await getUsageIdentity();
    const result = await reserveToolUsage(body.toolId, identity);
    if (!result.allowed) return NextResponse.json({ error: "You have reached the successful operation limit for this tool in the rolling 24-hour period.", ...result }, { status: 429 });
    return NextResponse.json({ ...result, premium: identity.premium });
  } catch (error) {
    console.error("Unable to reserve tool quota:", error);
    return NextResponse.json({ error: "Usage verification is temporarily unavailable. Please try again shortly." }, { status: 503 });
  }
}
