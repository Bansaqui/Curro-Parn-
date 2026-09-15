import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database";
import {
  profileTrustSchema,
  type ProfileSettings,
  type ExperienceInput,
} from "./schema";
type Client = Pick<SupabaseClient<Database>, "rpc">;
async function command(client: Client, action: string, data: Json) {
  const result = await client.rpc("cp_command", {
    p_action: action,
    p_data: data,
  });
  if (result.error) throw result.error;
  return result.data;
}
export async function readTrustProfile(client: Client, applicationId?: string) {
  return profileTrustSchema.parse(
    await command(
      client,
      "worker_profile",
      applicationId ? { application_id: z.uuid().parse(applicationId) } : {},
    ),
  );
}
export async function writeProfile(client: Client, data: ProfileSettings) {
  z.object({ ok: z.literal(true) }).parse(
    await command(client, "worker_profile_save", data),
  );
}
export async function writeExperience(client: Client, data: ExperienceInput) {
  z.object({ ok: z.literal(true) }).parse(
    await command(client, "worker_experience_save", data),
  );
}
export async function deleteExperience(client: Client, id: string) {
  z.object({ ok: z.literal(true) }).parse(
    await command(client, "worker_experience_delete", {
      id: z.uuid().parse(id),
    }),
  );
}
