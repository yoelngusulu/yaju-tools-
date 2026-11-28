import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";

import { ACTIVE_TOOL_ACTIVITY, type ActiveToolId } from "@/lib/tools/activity";
import { isAllowedConversionOrigin } from "@/lib/security/conversionOrigin";
import { getUsageIdentity } from "@/lib/supabase/toolUsage";
import { recordToolActivityServer } from "@/lib/supabase/recordToolActivity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function historyEventId(identity: { userId: string | null; guestId: string | null }, toolId: string, historyId: number) {
  const bytes = createHash("sha256").update(`${identity.userId ?? identity.guestId}:${toolId}:${historyId}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export async function POST(request: NextRequest) {
  if (!isAllowedConversionOrigin(request)) {
    return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 });
  }
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || typeof body.eventId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.eventId)
    || typeof body.toolId !== "string" || !Object.hasOwn(ACTIVE_TOOL_ACTIVITY, body.toolId)) {
    return NextResponse.json({ error: "Invalid activity event." }, { status: 400 });
  }

  try {
    const identity = await getUsageIdentity();
    const toolId = body.toolId as ActiveToolId;
    const metadata = body.metadata as Record<string, unknown> | undefined;
    const conversionHistoryId = metadata?.conversionHistoryId;
    const eventId = typeof conversionHistoryId === "number" && Number.isSafeInteger(conversionHistoryId)
      ? historyEventId(identity, toolId, conversionHistoryId)
      : body.eventId;
    await recordToolActivityServer({ eventId, toolId, identity, metadata: body.metadata });
    return NextResponse.json({ recorded: true });
  } catch (error) {
    console.error("Unable to record tool activity:", error);
    return NextResponse.json({ error: "Activity tracking is temporarily unavailable." }, { status: 503 });
  }
}
