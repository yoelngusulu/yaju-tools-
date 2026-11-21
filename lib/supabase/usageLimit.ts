import { randomUUID } from "crypto";
import { cookies } from "next/headers";

import { getActivePremiumSubscription } from "@/lib/billing/subscriptions";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const GUEST_LIMIT = 5;
const REGISTERED_LIMIT = 5;
const COORDINATES_BULK_GUEST_LIMIT = 2;
const COORDINATES_BULK_REGISTERED_LIMIT = 2;
const WINDOW_HOURS = 24;
const UNLIMITED_LIMIT = 999999;
const GUEST_COOKIE_NAME = "docmaster_guest_id";

const LIMITED_TOOLS = new Set([
  "pdf-to-word",
  "pdf-to-excel",
  "pdf-to-powerpoint",
  "coordinates-bulk",
  "ai",
  "image-editor",
  "background-remover",
  "photo-enhancer",
  "object-remover",
  "face-retouch",
  "image-upscaler",
  "image-colorizer",
  "image-to-text",
  "summarize-pdf",
  "chat-with-pdf",
  "translate-document",
  "resume-builder",
]);

type UsageIdentityType = "user" | "guest";

type UsageLimitResult = {
  allowed: boolean;
  reason: string | null;
  remaining: number;
  used: number;
  limit: number;
  identityType: UsageIdentityType;
  identityId: string;
  status?: number;
};

type SupabaseUser = {
  id: string;
  app_metadata?: Record<string, unknown>;
};

function normalizeTool(tool?: string) {
  return tool?.trim().toLowerCase();
}

function isLimitedTool(tool?: string) {
  const normalizedTool = normalizeTool(tool);

  if (!normalizedTool) {
    return true;
  }

  return LIMITED_TOOLS.has(normalizedTool);
}

function getToolLimits(tool?: string) {
  const normalizedTool = normalizeTool(tool);

  if (normalizedTool === "coordinates-bulk") {
    return {
      guest: COORDINATES_BULK_GUEST_LIMIT,
      registered: COORDINATES_BULK_REGISTERED_LIMIT,
    };
  }

  return {
    guest: GUEST_LIMIT,
    registered: REGISTERED_LIMIT,
  };
}

function hasPremiumValue(value: unknown) {
  if (typeof value !== "string") {
    return false;
  }

  return ["premium", "pro", "paid"].includes(value.toLowerCase());
}

function isServerControlledPremiumUser(user: SupabaseUser) {
  return (
    hasPremiumValue(user.app_metadata?.plan) ||
    hasPremiumValue(user.app_metadata?.subscription)
  );
}

function allowUnlimitedTool(
  identityType: UsageIdentityType = "guest",
  identityId = "free-ad-supported-tool"
): UsageLimitResult {
  return {
    allowed: true,
    reason: null,
    remaining: UNLIMITED_LIMIT,
    used: 0,
    limit: UNLIMITED_LIMIT,
    identityType,
    identityId,
  };
}

function allowWhenUsageCheckFails(
  identityType: UsageIdentityType,
  identityId: string,
  limit: number
): UsageLimitResult {
  return {
    allowed: false,
    reason: "Usage verification is temporarily unavailable. Please try again shortly.",
    remaining: 0,
    used: 0,
    limit,
    identityType,
    identityId,
    status: 503,
  };
}

function buildLimitReason(
  tool: string | undefined,
  limit: number,
  identityType?: UsageIdentityType
) {
  if (normalizeTool(tool) === "coordinates-bulk") {
    const conversionText =
      limit === 1 ? "conversion" : "conversions";

    if (identityType === "guest") {
      return `You have reached your free CSV/Excel bulk limit of ${limit} ${conversionText} in the last 24 hours. Upgrade to a paid YAJU plan for more bulk processing.`;
    }

    return `You have reached your free CSV/Excel bulk limit of ${limit} ${conversionText} in the last 24 hours. Upgrade to a paid YAJU plan for more bulk processing.`;
  }

  return `You have reached your ${limit} conversion limit for the last 24 hours.`;
}

function buildUsageResult(
  used: number,
  limit: number,
  identityType: UsageIdentityType,
  identityId: string,
  tool?: string
): UsageLimitResult {
  const allowed = used < limit;

  return {
    allowed,
    reason: allowed ? null : buildLimitReason(tool, limit, identityType),
    remaining: Math.max(limit - used, 0),
    used,
    limit,
    identityType,
    identityId,
  };
}

export async function checkUsageLimit(
  tool?: string
): Promise<UsageLimitResult> {
  const normalizedTool = normalizeTool(tool);

  if (!isLimitedTool(normalizedTool)) {
    return allowUnlimitedTool();
  }

  const limits = getToolLimits(normalizedTool);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const since = new Date(
    Date.now() - WINDOW_HOURS * 60 * 60 * 1000
  ).toISOString();

  if (user) {
    const typedUser = user as SupabaseUser;
    const activePremiumSubscription =
      await getActivePremiumSubscription(typedUser.id);

    if (
      activePremiumSubscription ||
      isServerControlledPremiumUser(typedUser)
    ) {
      return allowUnlimitedTool("user", typedUser.id);
    }

    let query = supabase
      .from("conversion_usage")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("user_id", typedUser.id)
      .gte("created_at", since);

    if (normalizedTool) {
      query = query.eq("tool", normalizedTool);
    }

    const { count, error } = await query;

    if (error) {
      console.error(
        "Unable to check logged-in usage:",
        error
      );

      return allowWhenUsageCheckFails(
        "user",
        typedUser.id,
        limits.registered
      );
    }

    return buildUsageResult(
      count ?? 0,
      limits.registered,
      "user",
      typedUser.id,
      normalizedTool
    );
  }

  const cookieStore = await cookies();
  let guestId = cookieStore.get(GUEST_COOKIE_NAME)?.value;

  if (!guestId) {
    guestId = randomUUID();

    cookieStore.set(GUEST_COOKIE_NAME, guestId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  const admin = createAdminClient();

  let query = admin
    .from("conversion_usage")
    .select("*", {
      count: "exact",
      head: true,
    })
    .eq("guest_id", guestId)
    .gte("created_at", since);

  if (normalizedTool) {
    query = query.eq("tool", normalizedTool);
  }

  const { count, error } = await query;

  if (error) {
    console.error(
      "Unable to check guest usage:",
      error
    );

    return allowWhenUsageCheckFails(
      "guest",
      guestId,
      limits.guest
    );
  }

  return buildUsageResult(
    count ?? 0,
    limits.guest,
    "guest",
    guestId,
    normalizedTool
  );
}
