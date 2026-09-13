import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { z } from "zod";
import { AppError } from "@/lib/utils/errors";
import { madridInstant } from "@/features/availability/schema";
import { eurosToCents, publishInputSchema, type PublishInput } from "./schema";
export async function publishJob(
  client: Pick<SupabaseClient<Database>, "rpc">,
  input: PublishInput,
) {
  const value = publishInputSchema.parse(input);
  const { data, error } = await client.rpc("cp_command", {
    p_action: "publish",
    p_data: {
      business_id: value.businessId,
      venue_id: value.venueId,
      title: value.title,
      specialty: value.specialty,
      description: value.description,
      starts_at: madridInstant(value.start),
      ends_at: madridInstant(value.end),
      slots: Number(value.slots),
      pay_cents: eurosToCents(value.payEuros),
      urgent: value.urgent === "yes",
    },
  });
  if (error) throw error;
  const parsed = z
    .object({ ok: z.literal(true), id: z.uuid() })
    .safeParse(data);
  if (!parsed.success) throw new AppError("PUBLISH_UNCONFIRMED");
  return parsed.data.id;
}
