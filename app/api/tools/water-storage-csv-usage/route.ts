import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { analyseUploadedRainfall, type DailyRainfallRecord } from "@/features/hydrology/domain/rainfall-upload";
import { getActivePremiumSubscription } from "@/lib/billing/subscriptions";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isAllowedConversionOrigin } from "@/lib/security/conversionOrigin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GUEST_COOKIE_NAME = "docmaster_guest_id";
const BULK_LIMIT = 2;
const WINDOW_HOURS = 24;
const MAX_RECORDS = 50_000;
type Identity = { userId: string | null; guestId: string | null };

async function getIdentity(): Promise<{ identity: Identity; premium: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const premium = Boolean(
      await getActivePremiumSubscription(user.id)
      || ["premium", "pro", "paid"].includes(String(user.app_metadata?.plan ?? "").toLowerCase())
      || ["premium", "pro", "paid"].includes(String(user.app_metadata?.subscription ?? "").toLowerCase())
    );
    return { identity: { userId: user.id, guestId: null }, premium };
  }

  const cookieStore = await cookies();
  let guestId = cookieStore.get(GUEST_COOKIE_NAME)?.value;
  if (!guestId) {
    guestId = randomUUID();
    cookieStore.set(GUEST_COOKIE_NAME, guestId, {
      httpOnly: true, sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/", maxAge: 60 * 60 * 24 * 365,
    });
  }
  return { identity: { userId: null, guestId }, premium: false };
}

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

  const body = await request.json().catch(() => null) as { records?: unknown } | null;
  if (!body) return NextResponse.json({ error: "Invalid rainfall analysis request." }, { status: 400 });

  const records = validateRecords(body.records);
  if (!records) {
    return NextResponse.json({
      error: `Submit between 2 and ${MAX_RECORDS.toLocaleString()} valid daily rainfall records. Dates must be unique ISO dates and rainfall values non-negative mm/day numbers.`,
    }, { status: 400 });
  }

  const { identity, premium } = await getIdentity();
  const admin = createAdminClient();
  let reservationId: number | null = null;

  if (!premium) {
    const { data, error } = await admin.rpc("reserve_water_storage_csv_usage", {
      p_user_id: identity.userId,
      p_guest_id: identity.guestId,
      p_limit: BULK_LIMIT,
      p_window_hours: WINDOW_HOURS,
    });

    if (error) {
      console.error("Unable to reserve rainfall CSV quota:", error);
      return NextResponse.json({ error: "Usage verification is temporarily unavailable. Please try again shortly." }, { status: 503 });
    }

    const reservation = Array.isArray(data) ? data[0] : data;
    if (!reservation?.allowed) {
      return NextResponse.json({
        error: "You have reached the free rainfall CSV/Excel analysis limit of 2 successful bulk analyses in 24 hours. Single-point rainfall lookups and manual single-point inputs remain unlimited.",
        used: reservation?.used ?? BULK_LIMIT,
        limit: BULK_LIMIT,
        remaining: 0,
      }, { status: 429 });
    }
    reservationId = Number(reservation.reservation_id);
  }

  try {
    const analysis = analyseUploadedRainfall(records);
    return NextResponse.json({ analysis, quota: premium ? { unlimited: true } : { used: true, limit: BULK_LIMIT } });
  } catch (error) {
    if (reservationId !== null) {
      const { error: releaseError } = await admin.rpc("release_water_storage_csv_usage", {
        p_reservation_id: reservationId,
      });
      if (releaseError) console.error("Unable to release failed rainfall analysis quota:", releaseError);
    }
    const message = error instanceof Error ? error.message : "Rainfall analysis failed.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
