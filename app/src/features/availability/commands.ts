import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { z } from "zod";
import { AppError } from "@/lib/utils/errors";
import {
  availabilityInputSchema,
  deleteAvailabilitySchema,
  madridInstant,
  type AvailabilityInput,
} from "./schema";
type Client = Pick<SupabaseClient<Database>, "rpc">;
export async function createAvailability(
  client: Client,
  input: AvailabilityInput,
) {
  const value = availabilityInputSchema.parse(input);
  const { data, error } = await client.rpc("cp_command", {
    p_action: "availability",
    p_data: {
      starts_at: madridInstant(value.start),
      ends_at: madridInstant(value.end),
    },
  });
  if (error) throw error;
  if (!z.object({ ok: z.literal(true), id: z.uuid() }).safeParse(data).success)
    throw new AppError("SNAPSHOT");
}
export async function deleteAvailability(client: Client, id: string) {
  const value = deleteAvailabilitySchema.parse({ id });
  const { data, error } = await client.rpc("cp_command", {
    p_action: "availability",
    p_data: { delete_id: value.id },
  });
  if (error) throw error;
  // The existing delete command returns ok:true with id:null.
  if (!z.object({ ok: z.literal(true) }).safeParse(data).success)
    throw new AppError("SNAPSHOT");
}
