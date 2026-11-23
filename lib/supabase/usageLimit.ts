import { getUsageIdentity, isLimitedToolId, reserveToolUsage, finishToolUsage, type LimitedToolId } from "@/lib/supabase/toolUsage";

export type UsageIdentityType = "user" | "guest";
export type UsageLimitResult = {
  allowed: boolean;
  reason: string | null;
  remaining: number;
  used: number;
  limit: number;
  identityType: UsageIdentityType;
  identityId: string;
  reservationId: string | null;
  unavailable?: boolean;
};

const UNLIMITED = 999999;
const unavailableMessage = "Usage verification is temporarily unavailable. Please try again shortly.";

function unlimited(identityType: UsageIdentityType = "guest", identityId = "free-tool") {
  return { allowed: true, reason: null, remaining: UNLIMITED, used: 0, limit: UNLIMITED, identityType, identityId, reservationId: null } satisfies UsageLimitResult;
}

export function isLimitedTool(tool?: string) {
  return isLimitedToolId(tool);
}

export async function checkUsageLimit(tool?: string): Promise<UsageLimitResult> {
  if (!isLimitedTool(tool)) return unlimited();
  try {
    const identity = await getUsageIdentity();
    const identityType: UsageIdentityType = identity.userId ? "user" : "guest";
    const identityId = identity.userId ?? identity.guestId!;
    if (identity.premium) return unlimited("user", identity.userId!);
    const result = await reserveToolUsage(tool as LimitedToolId, identity);
    const limit = identity.userId ? 5 : 2;
    return {
      allowed: result.allowed,
      reason: result.allowed ? null : `You have reached your ${limit} successful operation limit for this tool in the rolling 24-hour period.`,
      remaining: result.remaining ?? limit,
      used: result.used ?? 0,
      limit,
      identityType,
      identityId,
      reservationId: result.reservationId,
    };
  } catch (error) {
    console.error("Unable to verify usage limit:", error);
    return { ...unlimited(), allowed: false, reason: unavailableMessage, remaining: 0, limit: 0, unavailable: true };
  }
}

export async function releaseUsageReservation(usage: UsageLimitResult) {
  if (!usage.reservationId) return;
  await finishToolUsage(usage.reservationId, {
    userId: usage.identityType === "user" ? usage.identityId : null,
    guestId: usage.identityType === "guest" ? usage.identityId : null,
    premium: false,
  }, false);
}
