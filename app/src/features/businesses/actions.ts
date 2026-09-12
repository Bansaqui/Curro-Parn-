"use server";
import { redirect } from "next/navigation";
import { requireProfile } from "@/features/auth/session";
import { getSnapshot } from "@/features/snapshot/server";
import { createClient } from "@/lib/supabase/server";
import { createBusiness } from "@/lib/supabase/commands";
import { businessSchema } from "@/lib/validation/schemas";
import { formError, type FormState } from "@/lib/utils/errors";
export async function saveBusiness(
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  await requireProfile("business");
  const snapshot = await getSnapshot();
  if (snapshot.businesses.length) redirect("/inicio");
  const parsed = businessSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return {
      error: "Revisa los datos del negocio.",
      fields: parsed.error.flatten().fieldErrors,
    };
  try {
    await createBusiness(await createClient(), parsed.data);
  } catch (error) {
    return formError("business.create", error);
  }
  redirect("/negocio/local/nuevo");
}
