"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/features/auth/session";
import { getSnapshot } from "@/features/snapshot/server";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/utils/errors";
import { selectionInputSchema } from "./schema";
import { candidateContext, canSelect, canReject } from "./selectors";
import { decideApplication } from "./commands";
import { selectionError } from "./errors";
export async function saveDecision(
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  await requireProfile("business");
  const parsed = selectionInputSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return { error: "La candidatura no es válida. Actualiza la página." };
  const value = parsed.data;
  const context = candidateContext(await getSnapshot(), value.jobId);
  const application = context?.applications.find(
    (a) => a.id === value.applicationId,
  );
  if (!context?.canManage || !application)
    return { error: "No tienes permiso para gestionar esta candidatura." };
  const path = `/negocio/curros/${value.jobId}/candidaturas`;
  if (
    value.decision === "select"
      ? !canSelect(application.state, context.job, Date.now())
      : !canReject(application.state)
  ) {
    revalidatePath(path);
    return {
      error:
        "La candidatura o las plazas han cambiado. Actualiza las candidaturas.",
    };
  }
  try {
    await decideApplication(await createClient(), value);
  } catch (error) {
    revalidatePath(path);
    revalidatePath("/inicio");
    revalidatePath("/curros");
    return { error: selectionError(error) };
  }
  revalidatePath(path);
  revalidatePath("/inicio");
  revalidatePath("/curros");
  redirect(
    `${path}?result=${value.decision === "select" ? "selected" : "rejected"}`,
  );
}
