import { createAdminClient } from "@/lib/supabase/admin";
import { finishToolUsage } from "@/lib/supabase/toolUsage";

type RecordUsageParams = {
  tool: string;
  identityType: "user" | "guest";
  identityId: string;
  reservationId?: string | null;
};

export async function recordConversionUsage({
  tool,
  identityType,
  identityId,
  reservationId,
}: RecordUsageParams) {
  if (reservationId) {
    await finishToolUsage(reservationId, {
      userId: identityType === "user" ? identityId : null,
      guestId: identityType === "guest" ? identityId : null,
      premium: false,
    }, true);
    return;
  }
  const admin = createAdminClient();

  const payload = {
    user_id:
      identityType === "user"
        ? identityId
        : null,
    guest_id:
      identityType === "guest"
        ? identityId
        : null,
    tool,
  };

  const { error } = await admin
    .from("conversion_usage")
    .insert(payload);

  if (error) {
    console.error(
      "Unable to record conversion usage:",
      error
    );

    throw new Error(
      "Unable to record conversion usage."
    );
  }
}
