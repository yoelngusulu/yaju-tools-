import { ACTIVE_TOOL_ACTIVITY, type ActiveToolId } from "@/lib/tools/activity";
import { createAdminClient } from "@/lib/supabase/admin";
import type { UsageIdentity } from "@/lib/supabase/toolUsage";

export function sanitizeActivityMetadata(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const value = input as Record<string, unknown>;
  const safe: Record<string, string | number> = {};
  for (const key of ["mode", "operation", "fileType"]) {
    if (typeof value[key] === "string") safe[key] = value[key].slice(0, 40);
  }
  for (const key of ["itemCount", "outputCount", "conversionHistoryId"]) {
    if (typeof value[key] === "number" && Number.isSafeInteger(value[key]) && value[key] >= 0) safe[key] = value[key];
  }
  return safe;
}

export async function recordToolActivityServer({
  eventId, toolId, identity, metadata,
}: { eventId: string; toolId: ActiveToolId; identity: UsageIdentity; metadata?: unknown }) {
  const tool = ACTIVE_TOOL_ACTIVITY[toolId];
  const admin = createAdminClient();
  const { error } = await admin.from("tool_activity").upsert({
    id: eventId,
    user_id: identity.userId,
    guest_id: identity.guestId,
    tool_id: toolId,
    category: tool.category,
    event_type: "completed",
    success: true,
    metadata: sanitizeActivityMetadata(metadata),
  }, { onConflict: "id", ignoreDuplicates: true });
  if (error) throw error;
}
