import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { z } from "zod";
import { AppError } from "@/lib/utils/errors";
const workerProfile = z.object({
  id: z.uuid(),
  role: z.literal("worker"),
  display_name: z.string().min(2).max(100),
  bio: z.string().max(1000),
});
export async function setAvailable(
  client: Pick<SupabaseClient<Database>, "rpc">,
  profile: Pick<
    Database["public"]["Tables"]["cp_profiles"]["Row"],
    "id" | "role" | "display_name" | "bio"
  >,
  available: boolean,
) {
  const current = workerProfile.parse(profile);
  const value = z.boolean().parse(available);
  // profile replaces these fields. Only use the server-read profile, never form values.
  const { data, error } = await client.rpc("cp_command", {
    p_action: "profile",
    p_data: { name: current.display_name, bio: current.bio, available: value },
  });
  if (error) throw error;
  const parsed = z
    .object({ ok: z.literal(true), id: z.uuid() })
    .safeParse(data);
  if (!parsed.success || parsed.data.id !== current.id)
    throw new AppError("AVAILABILITY_UNCONFIRMED");
}
