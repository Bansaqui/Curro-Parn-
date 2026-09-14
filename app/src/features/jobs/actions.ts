"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/features/auth/session";
import { getSnapshot } from "@/features/snapshot/server";
import { createClient } from "@/lib/supabase/server";
import { formError, type FormState } from "@/lib/utils/errors";
import { publishInputSchema } from "./schema";
import { canPublishAt } from "./access";
import { publishJob } from "./commands";
export async function saveJob(
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  await requireProfile("business");
  const parsed = publishInputSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return {
      error: "Revisa los campos del Curro.",
      fields: parsed.error.flatten().fieldErrors,
    };
  const snapshot = await getSnapshot();
  if (!canPublishAt(snapshot, parsed.data.businessId, parsed.data.venueId))
    return {
      error:
        "Necesitas ser propietario o gestor activo y elegir un local activo de ese negocio. Recarga para actualizar tus permisos.",
    };
  try {
    await publishJob(await createClient(), parsed.data);
  } catch (error) {
    const result = formError("job.publish", error);
    if (typeof error === "object" && error !== null && "code" in error) {
      if (error.code === "23514")
        return {
          error:
            "Revisa título, fechas, plazas e importe: los datos no cumplen los límites del Curro.",
        };
      if (error.code === "P0001")
        return {
          error:
            "No se pudo publicar. Comprueba que el inicio siga siendo futuro, que el local esté activo y que no hayas alcanzado 50 publicaciones en 24 horas.",
        };
      if (error.code === "42501") return result;
    }
    // A lost response may follow a committed insert. Do not automatically retry.
    return {
      error:
        "No hemos podido confirmar la publicación. Revisa tus Curros en Inicio antes de volver a intentarlo para evitar duplicados.",
    };
  }
  revalidatePath("/inicio");
  revalidatePath("/negocio/curros/nuevo");
  redirect("/inicio?published=1");
}
