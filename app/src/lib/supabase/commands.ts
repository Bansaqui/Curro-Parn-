import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type {
  OnboardingInput,
  BusinessInput,
  VenueInput,
} from "@/lib/validation/schemas";
import { z } from "zod";
import { AppError } from "@/lib/utils/errors";
type Client = Pick<SupabaseClient<Database>, "rpc">;
export async function onboard(client: Client, input: OnboardingInput) {
  const { data, error } = await client.rpc("cp_onboard", {
    p_role: input.role,
    p_display_name: input.displayName,
    ...(input.role === "worker" ? { p_specialty: input.specialty } : {}),
    p_accept_terms: input.acceptTerms,
    p_accept_privacy: input.acceptPrivacy,
  });
  if (error) throw error;
  if (!data?.id) throw new AppError("SNAPSHOT");
  return data;
}
const commandResult = z.object({ id: z.uuid() });
export async function createBusiness(client: Client, input: BusinessInput) {
  const { data, error } = await client.rpc("cp_command", {
    p_action: "create_business",
    p_data: {
      legal_name: input.legalName,
      display_name: input.displayName,
      tax_id: input.taxId,
    },
  });
  if (error) throw error;
  const parsed = commandResult.safeParse(data);
  if (!parsed.success) throw new AppError("SNAPSHOT");
  return parsed.data.id;
}
export async function createVenue(client: Client, input: VenueInput) {
  const { data, error } = await client.rpc("cp_command", {
    p_action: "create_venue",
    p_data: {
      business_id: input.businessId,
      name: input.name,
      address: input.address,
      city: input.city,
    },
  });
  if (error) throw error;
  const parsed = commandResult.safeParse(data);
  if (!parsed.success) throw new AppError("SNAPSHOT");
  return parsed.data.id;
}
