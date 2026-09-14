import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { z } from "zod";
import { AppError } from "@/lib/utils/errors";
import { interestInputSchema } from "./schema";
export async function applyToJob(
  client: Pick<SupabaseClient<Database>, "rpc">,
  jobId: string,
) {
  const value = interestInputSchema.parse({ jobId });
  const { data, error } = await client.rpc("cp_command", {
    p_action: "apply",
    p_data: { job_id: value.jobId },
  });
  if (error) throw error;
  // The existing RPC returns no ok property on its unchanged branch.
  const parsed = z
    .union([
      z.object({ ok: z.literal(true), id: z.uuid() }),
      z.object({ unchanged: z.literal(true), id: z.uuid() }),
    ])
    .safeParse(data);
  if (!parsed.success) throw new AppError("INTEREST_UNCONFIRMED");
  return parsed.data.id;
}
