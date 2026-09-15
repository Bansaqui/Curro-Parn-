"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/features/auth/session";
import { getSnapshot } from "@/features/snapshot/server";
import { createClient } from "@/lib/supabase/server";
import { formError, type FormState } from "@/lib/utils/errors";
import { interestInputSchema } from "./schema";
import { canSendInterest, ownApplication, workerJobs } from "./selectors";
import { applyToJob } from "./commands";
function completed(): never {
  revalidatePath("/curros");
  revalidatePath("/inicio");
  redirect("/curros?interest=sent");
}
export async function sendInterest(
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  await requireProfile("worker");
  const parsed = interestInputSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return { error: "El Curro no es válido. Recarga la página." };
  const snapshot = await getSnapshot();
  const previous = ownApplication(snapshot, parsed.data.jobId);
  if (previous?.state === "applied" || previous?.state === "selected")
    completed();
  if (!canSendInterest(previous?.state))
    return {
      error:
        "Ya existe una candidatura cerrada para este Curro. No puedes enviar otra.",
    };
  if (
    !workerJobs(snapshot).some(
      ({ job, closed }) => job.id === parsed.data.jobId && !closed,
    )
  )
    return {
      error:
        "Este Curro ya no está disponible para tu perfil. Actualiza el listado.",
    };
  try {
    await applyToJob(await createClient(), parsed.data.jobId);
  } catch (error) {
    const result = formError("job.apply", error);
    if (typeof error === "object" && error !== null && "code" in error) {
      if (error.code === "42501") return result;
      if (error.code === "23505")
        return {
          error:
            "Ya existe una candidatura. Recarga el listado para ver tu estado de interés.",
        };
      if (error.code === "23P01")
        return { error: "Hay un conflicto de horario con otro turno." };
      if (error.code === "P0001") {
        // Only fixed, known backend messages are mapped; never expose arbitrary SQL text.
        const messages: Record<string, string> = {
          "El Curro ya no admite candidaturas.":
            "Este Curro ya no admite candidaturas. Actualiza el listado.",
          "El profesional no es compatible o no está disponible.":
            "No cumples las condiciones de especialidad o disponibilidad para este Curro.",
          "Falta disponibilidad para todo el turno.":
            "Añade disponibilidad que cubra todo el turno antes de mostrar interés.",
          "Existe un turno solapado.":
            "Hay un conflicto de horario con otro turno.",
          "No quedan plazas.": "Este Curro ya no tiene plazas disponibles.",
          "Ya existe una candidatura para este Curro.":
            "Ya existe una candidatura. Recarga el listado para ver tu estado de interés.",
        };
        const message =
          "message" in error &&
          typeof error.message === "string" &&
          Object.hasOwn(messages, error.message)
            ? messages[error.message]
            : undefined;
        return {
          error:
            message ??
            "El servicio ha rechazado la candidatura por sus reglas actuales. Actualiza el listado y revisa tu disponibilidad.",
        };
      }
    }
    return {
      error:
        "No hemos podido confirmar el envío. Recarga el listado para comprobar tu interés antes de intentarlo otra vez.",
    };
  }
  completed();
}
