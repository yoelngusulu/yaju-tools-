import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { getActivePremiumSubscription } from "@/lib/billing/subscriptions";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isAllowedConversionOrigin } from "@/lib/security/conversionOrigin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GUEST_COOKIE_NAME = "docmaster_guest_id";
const BULK_LIMIT = 2;
const WINDOW_HOURS = 24;
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

export async function POST(request: NextRequest) {
  if (!isAllowedConversionOrigin(request)) {
    return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 });
  }

  const body = await request.json().catch(() => null) as
    | { action?: string; reservationId?: number }
    | null;
  if (!body || !["reserve", "release"].includes(body.action ?? "")) {
    return NextResponse.json({ error: "Invalid quota action." }, { status: 400 });
  }

  const { identity, premium } = await getIdentity();
  if (premium) {
    return NextResponse.json({ allowed: true, unlimited: true, remaining: null });
  }

  const admin = createAdminClient();

  if (body.action === "release") {
    if (!Number.isSafeInteger(body.reservationId) || Number(body.reservationId) <= 0) {
      return NextResponse.json({ error: "Invalid reservation." }, { status: 400 });
    }

    let ownership = admin.from("conversion_usage").select("id")
      .eq("id", body.reservationId).eq("tool", "water-storage-csv");
    ownership = identity.userId
      ? ownership.eq("user_id", identity.userId)
      : ownership.eq("guest_id", identity.guestId!);
    const { data: owned, error: ownershipError } = await ownership.maybeSingle();
    if (ownershipError) {
      console.error("Unable to verify rainfall quota reservation:", ownershipError);
      return NextResponse.json({ error: "Quota service temporarily unavailable." }, { status: 503 });
    }
    if (!owned) return NextResponse.json({ released: false });

    const { data, error } = await admin.rpc("release_water_storage_csv_usage", {
      p_reservation_id: body.reservationId,
    });
    if (error) {
      console.error("Unable to release rainfall quota reservation:", error);
      return NextResponse.json({ error: "Quota service temporarily unavailable." }, { status: 503 });
    }
    return NextResponse.json({ released: Boolean(data) });
  }

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

  return NextResponse.json({
    allowed: true,
    reservationId: reservation.reservation_id,
    used: reservation.used,
    limit: BULK_LIMIT,
    remaining: reservation.remaining,
  });
}
