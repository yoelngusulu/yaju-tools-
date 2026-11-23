import { createClient } from "@/lib/supabase/client";
import { recordToolActivity, type ActiveToolId } from "@/lib/tools/activity";

const activityToolByHistoryTool: Record<string, ActiveToolId> = {
  "coordinates-bulk": "coordinates-converter",
  "pdf-to-word": "pdf-to-word",
  "pdf-to-excel": "pdf-to-excel",
  "pdf-to-powerpoint": "pdf-to-powerpoint",
  "merge-pdf": "merge-pdf",
  "split-pdf": "split-pdf",
  "compress-pdf": "compress-pdf",
  "image-to-pdf": "image-to-pdf",
};

type SaveConversionHistoryParams = {
  tool: string;
  originalFileName: string;
  outputFileName: string;
};

export async function saveConversionHistory({
  tool,
  originalFileName,
  outputFileName,
}: SaveConversionHistoryParams) {
  const supabase = createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  let historyId: number | null = null;
  if (!userError && user) {
    const { data, error } = await supabase
      .from("conversion_history")
      .insert({ user_id: user.id, tool, original_file_name: originalFileName, output_file_name: outputFileName })
      .select("id")
      .single();
    if (error) console.error("Unable to save conversion history:", error);
    else historyId = data.id as number;
  }

  const activityTool = activityToolByHistoryTool[tool];
  if (activityTool) {
    try {
      await recordToolActivity(activityTool, historyId === null ? {} : { conversionHistoryId: historyId });
    } catch (error) {
      // Activity storage is best-effort and must not turn a completed conversion into a failure.
      console.error("Unable to record conversion activity:", error);
    }
  }

  return {
    isAuthenticated: Boolean(user && !userError),
  };
}
