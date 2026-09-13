"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/features/auth/session";
import { getSnapshot } from "@/features/snapshot/server";
import { createClient } from "@/lib/supabase/server";
import { formError, type FormState } from "@/lib/utils/errors";
import { availabilityInputSchema, deleteAvailabilitySchema } from "./schema";
import { createAvailability, deleteAvailability } from "./commands";
export async function saveAvailability(
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  const profile = await requireProfile("worker");
  const parsed = availabilityInputSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return {
      error: "Revisa las fechas de la franja.",
      fields: parsed.error.flatten().fieldErrors,
    };
  const snapshot = await getSnapshot();
  if (
    snapshot.availability.filter((slot) => slot.worker_id === profile.id)
      .length >= 100
  )
    return {
      error:
        "Has alcanzado el límite de 100 franjas. Elimina alguna antes de añadir otra.",
    };
  try {
    await createAvailability(await createClient(), parsed.data);
  } catch (error) {
    return formError("availability.create", error);
  }
  revalidatePath("/inicio");
  revalidatePath("/disponibilidad");
  redirect("/disponibilidad?result=created");
}
export async function removeAvailability(
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  const profile = await requireProfile("worker");
  const parsed = deleteAvailabilitySchema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return { error: "La franja no es válida. Recarga la página." };
  const snapshot = await getSnapshot();
  if (
    !snapshot.availability.some(
      (slot) => slot.id === parsed.data.id && slot.worker_id === profile.id,
    )
  )
    return {
      error: "La franja ya no existe o no te pertenece. Recarga la página.",
    };
  try {
    await deleteAvailability(await createClient(), parsed.data.id);
  } catch (error) {
    return formError("availability.delete", error);
  }
  revalidatePath("/inicio");
  revalidatePath("/disponibilidad");
  redirect("/disponibilidad?result=deleted");
}
