import { NextRequest, NextResponse } from "next/server";

import { isAllowedConversionOrigin } from "@/lib/security/conversionOrigin";
import { finishToolUsage, getUsageIdentity } from "@/lib/supabase/toolUsage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!isAllowedConversionOrigin(request)) return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 });
  const body = await request.json().catch(() => null) as { reservationId?: unknown; commit?: unknown } | null;
  if (!body || typeof body.reservationId !== "string" || !/^[0-9a-f-]{36}$/i.test(body.reservationId) || typeof body.commit !== "boolean") {
    return NextResponse.json({ error: "Invalid quota completion." }, { status: 400 });
  }
  try {
    const identity = await getUsageIdentity();
    if (identity.premium) return NextResponse.json({ finished: true });
    await finishToolUsage(body.reservationId, identity, body.commit);
    return NextResponse.json({ finished: true });
  } catch (error) {
    console.error("Unable to finalize tool quota:", error);
    return NextResponse.json({ error: "Usage verification is temporarily unavailable." }, { status: 503 });
  }
}
