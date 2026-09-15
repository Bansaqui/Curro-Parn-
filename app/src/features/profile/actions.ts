"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/features/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/utils/errors";
import { profileSettingsSchema, experienceSchema } from "./schema";
import { writeProfile, writeExperience, deleteExperience } from "./commands";
function refreshed(): never {
  revalidatePath("/perfil");
  revalidatePath("/inicio");
  revalidatePath(
    "/negocio/curros/[jobId]/candidaturas/[applicationId]/perfil",
    "page",
  );
  redirect("/perfil?result=saved");
}
function uncertain(): never {
  revalidatePath("/perfil");
  // A lost response can follow a committed insert: refresh before offering another attempt.
  redirect("/perfil?result=check");
}
export async function saveProfile(
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  await requireProfile("worker");
  const result = profileSettingsSchema.safeParse({
    specialties: form.getAll("specialties"),
    primary_specialty: form.get("primary_specialty"),
    skills: form.getAll("skills"),
  });
  if (!result.success)
    return {
      error:
        "Selecciona al menos una especialidad y una principal incluida en la lista.",
    };
  try {
    await writeProfile(await createClient(), result.data);
  } catch {
    uncertain();
  }
  refreshed();
}
export async function saveExperience(
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  await requireProfile("worker");
  const result = experienceSchema.safeParse({
    ...(form.get("id") ? { id: form.get("id") } : {}),
    employer_name: form.get("employer_name"),
    role_label: form.get("role_label"),
    start_date: form.get("start_date"),
    end_date: form.get("end_date") || null,
    description: form.get("description") ?? "",
  });
  if (!result.success)
    return {
      error: result.error.issues[0]?.message ?? "Revisa la experiencia.",
    };
  try {
    await writeExperience(await createClient(), result.data);
  } catch {
    uncertain();
  }
  refreshed();
}
export async function removeExperience(
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  await requireProfile("worker");
  const id = z.uuid().safeParse(form.get("id"));
  if (!id.success)
    return { error: "La experiencia no es válida. Recarga la página." };
  try {
    await deleteExperience(await createClient(), id.data);
  } catch {
    uncertain();
  }
  refreshed();
}
