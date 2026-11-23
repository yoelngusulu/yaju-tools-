import { createHmac } from "crypto";
import { headers } from "next/headers";

import { getActivePremiumSubscription } from "@/lib/billing/subscriptions";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type LimitedToolId = "coordinates-bulk" | "water-storage-csv" | "pdf-to-word" | "pdf-to-excel" | "pdf-to-powerpoint";
export type UsageIdentity = { userId: string | null; guestId: string | null; premium: boolean };

const LIMITED_TOOLS = new Set<LimitedToolId>([
  "coordinates-bulk", "water-storage-csv", "pdf-to-word", "pdf-to-excel", "pdf-to-powerpoint",
]);

export function isLimitedToolId(value: unknown): value is LimitedToolId {
  return typeof value === "string" && LIMITED_TOOLS.has(value as LimitedToolId);
}

function privateFingerprint(value: string) {
  const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("Usage identity signing is not configured.");
  return createHmac("sha256", secret).update(value).digest("hex");
}

export async function getUsageIdentity(): Promise<UsageIdentity> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) throw new Error("Unable to verify account identity.");
  const user = data.user;
  if (user) {
    const activeSubscription = await getActivePremiumSubscription(user.id);
    return { userId: user.id, guestId: null, premium: Boolean(activeSubscription) };
  }

  // A server-derived HMAC of the edge supplied client address keeps the guest
  // quota from being reset by editing or replacing a browser storage ID.
  const requestHeaders = await headers();
  const address = requestHeaders.get("x-vercel-forwarded-for")
    ?? requestHeaders.get("x-real-ip")
    ?? requestHeaders.get("x-forwarded-for")?.split(",").at(-1)?.trim();
  if (!address) throw new Error("Unable to establish guest quota identity.");
  return { userId: null, guestId: `ip_${privateFingerprint(address).slice(0, 48)}`, premium: false };
}

export async function reserveToolUsage(toolId: LimitedToolId, identity: UsageIdentity) {
  if (identity.premium) return { allowed: true, remaining: null, used: null, reservationId: null };
  const limit = identity.userId ? 5 : 2;
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("reserve_tool_usage", {
    p_user_id: identity.userId,
    p_guest_id: identity.guestId,
    p_tool_id: toolId,
    p_limit: limit,
    p_window_seconds: 86400,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row.allowed !== "boolean") throw new Error("Usage verification returned an invalid response.");
  return { allowed: row.allowed, remaining: Number(row.remaining), used: Number(row.used), reservationId: row.reservation_id as string | null };
}

export async function finishToolUsage(reservationId: string, identity: UsageIdentity, commit: boolean) {
  if (!identity.userId && !identity.guestId) throw new Error("Usage identity is unavailable.");
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("finish_tool_usage", {
    p_reservation_id: reservationId,
    p_user_id: identity.userId,
    p_guest_id: identity.guestId,
    p_commit: commit,
  });
  if (error) throw error;
  if (data !== true) throw new Error("Usage reservation has expired or is no longer active.");
}
