"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/features/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formError, type FormState } from "@/lib/utils/errors";
import { setAvailable } from "./profile-command";
export async function saveAvailable(
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  const profile = await requireProfile("worker");
  const desired = z.enum(["on", "off"]).safeParse(form.get("available"));
  if (!desired.success)
    return {
      error:
        "El estado no es válido. Recarga para comprobar tu disponibilidad.",
    };
  try {
    await setAvailable(await createClient(), profile, desired.data === "on");
  } catch (error) {
    formError("availability.status", error);
    revalidatePath("/inicio");
    revalidatePath("/disponibilidad");
    revalidatePath("/curros");
    return {
      error:
        "No hemos podido confirmar el cambio. Recarga para comprobar tu estado antes de intentarlo otra vez.",
    };
  }
  revalidatePath("/inicio");
  revalidatePath("/disponibilidad");
  revalidatePath("/curros");
  redirect("/disponibilidad?result=status");
}
