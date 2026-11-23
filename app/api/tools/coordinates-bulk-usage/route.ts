import { NextRequest, NextResponse } from "next/server";

import { isAllowedConversionOrigin } from "@/lib/security/conversionOrigin";
import { finishToolUsage, getUsageIdentity, reserveToolUsage } from "@/lib/supabase/toolUsage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!isAllowedConversionOrigin(request)) return NextResponse.json({ message: "Request origin is not allowed." }, { status: 403 });
  try {
    const identity = await getUsageIdentity();
    const usage = await reserveToolUsage("coordinates-bulk", identity);
    if (!usage.allowed) {
      return NextResponse.json({ message: "You have reached the bulk coordinate conversion limit for this tool in the rolling 24-hour period.", remaining: 0, limit: identity.userId ? 5 : 2 }, { status: 429 });
    }
    if (usage.reservationId) await finishToolUsage(usage.reservationId, identity, true);
    return NextResponse.json({ allowed: true, remaining: usage.remaining, limit: identity.premium ? null : identity.userId ? 5 : 2 });
  } catch (error) {
    console.error("Unable to verify coordinate bulk usage:", error);
    return NextResponse.json({ message: "Usage verification is temporarily unavailable. Please try again shortly." }, { status: 503 });
  }
}
