import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { z } from "zod";
import { AppError } from "@/lib/utils/errors";
import { selectionInputSchema } from "./schema";
export async function decideApplication(
  client: Pick<SupabaseClient<Database>, "rpc">,
  input: z.infer<typeof selectionInputSchema>,
) {
  const value = selectionInputSchema.parse(input);
  const { data, error } = await client.rpc("cp_command", {
    p_action: value.decision,
    p_data: { application_id: value.applicationId },
  });
  if (error) throw error;
  // A new selection returns assignment.id; unchanged returns application.id.
  const result = z
    .union([
      z.object({ ok: z.literal(true), id: z.uuid() }),
      z.object({ unchanged: z.literal(true), id: z.uuid() }),
    ])
    .safeParse(data);
  if (
    !result.success ||
    ("unchanged" in result.data &&
      (value.decision !== "select" ||
        result.data.id !== value.applicationId)) ||
    (value.decision === "reject" && result.data.id !== value.applicationId)
  )
    throw new AppError("SELECTION_UNCONFIRMED");
  return result.data;
}
