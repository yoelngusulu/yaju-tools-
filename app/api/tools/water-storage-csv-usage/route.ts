import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

import { analyseUploadedRainfall, type DailyRainfallRecord } from "@/features/hydrology/domain/rainfall-upload";
import { getUsageIdentity, reserveToolUsage, finishToolUsage } from "@/lib/supabase/toolUsage";
import { recordToolActivityServer } from "@/lib/supabase/recordToolActivity";
import { isAllowedConversionOrigin } from "@/lib/security/conversionOrigin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_RECORDS = 50_000;

function validateRecords(value: unknown): DailyRainfallRecord[] | null {
  if (!Array.isArray(value) || value.length < 2 || value.length > MAX_RECORDS) return null;
  const seen = new Set<string>();
  const records: DailyRainfallRecord[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const record = item as Record<string, unknown>;
    if (typeof record.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(record.date)) return null;
    const date = new Date(`${record.date}T00:00:00.000Z`);
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== record.date || seen.has(record.date)) return null;
    if (typeof record.rainfallMm !== "number" || !Number.isFinite(record.rainfallMm) || record.rainfallMm < 0) return null;
    seen.add(record.date);
    records.push({ date: record.date, rainfallMm: record.rainfallMm });
  }
  return records.sort((a, b) => a.date.localeCompare(b.date));
}

export async function POST(request: NextRequest) {
  if (!isAllowedConversionOrigin(request)) {
    return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 });
  }

  const body = await request.json().catch(() => null) as { records?: unknown; eventId?: unknown } | null;
  if (!body) return NextResponse.json({ error: "Invalid rainfall analysis request." }, { status: 400 });

  const records = validateRecords(body.records);
  if (!records) {
    return NextResponse.json({
      error: `Submit between 2 and ${MAX_RECORDS.toLocaleString()} valid daily rainfall records. Dates must be unique ISO dates and rainfall values non-negative mm/day numbers.`,
    }, { status: 400 });
  }

  const identity = await getUsageIdentity().catch((error) => {
    console.error("Unable to verify rainfall analysis identity:", error);
    return null;
  });
  if (!identity) return NextResponse.json({ error: "Usage verification is temporarily unavailable. Please try again shortly." }, { status: 503 });

  let reservationId: string | null = null;
  if (!identity.premium) {
    const reservation = await reserveToolUsage("water-storage-csv", identity).catch((error) => {
      console.error("Unable to reserve rainfall CSV quota:", error);
      return null;
    });
    if (!reservation) return NextResponse.json({ error: "Usage verification is temporarily unavailable. Please try again shortly." }, { status: 503 });
    if (!reservation.allowed) return NextResponse.json({
      error: "You have reached the free rainfall CSV/Excel analysis limit for this tool in the rolling 24-hour period. Single-point rainfall lookups and manual single-point inputs remain unlimited.",
      used: reservation.used,
      limit: identity.userId ? 5 : 2,
      remaining: 0,
    }, { status: 429 });
    reservationId = reservation.reservationId;
  }

  try {
    const analysis = analyseUploadedRainfall(records);
    if (reservationId) await finishToolUsage(reservationId, identity, true);
    const eventId = typeof body.eventId === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.eventId) ? body.eventId : randomUUID();
    try { await recordToolActivityServer({ eventId, toolId: "water-storage", identity, metadata: { mode: "rainfall-upload", operation: "analyze", itemCount: records.length } }); }
    catch (activityError) { console.error("Unable to record rainfall analysis activity:", activityError); }
    return NextResponse.json({ analysis, quota: identity.premium ? { unlimited: true } : { used: true, limit: identity.userId ? 5 : 2 } });
  } catch (error) {
    if (reservationId !== null) {
      try { await finishToolUsage(reservationId, identity, false); }
      catch (releaseError) { console.error("Unable to release failed rainfall analysis quota:", releaseError); }
    }
    const message = error instanceof Error ? error.message : "Rainfall analysis failed.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
