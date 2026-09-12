"use server";
import { redirect } from "next/navigation";
import { requireProfile } from "@/features/auth/session";
import { getSnapshot } from "@/features/snapshot/server";
import { managedBusinesses } from "@/features/snapshot/schema";
import { createClient } from "@/lib/supabase/server";
import { createVenue } from "@/lib/supabase/commands";
import { venueSchema } from "@/lib/validation/schemas";
import { AppError, formError, type FormState } from "@/lib/utils/errors";
export async function saveVenue(
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  await requireProfile("business");
  const snapshot = await getSnapshot();
  if (!snapshot.businesses.length) redirect("/negocio/nuevo");
  const parsed = venueSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return {
      error: "Revisa los datos del local.",
      fields: parsed.error.flatten().fieldErrors,
    };
  if (!managedBusinesses(snapshot).some((b) => b.id === parsed.data.businessId))
    return formError("venue.membership", new AppError("42501"));
  if (
    snapshot.venues.some(
      (v) => v.business_id === parsed.data.businessId && v.active,
    )
  )
    redirect("/inicio");
  try {
    await createVenue(await createClient(), parsed.data);
  } catch (error) {
    return formError("venue.create", error);
  }
  redirect("/inicio");
}
