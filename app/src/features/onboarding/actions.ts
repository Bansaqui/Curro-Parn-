"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/features/auth/session";
import { onboard } from "@/lib/supabase/commands";
import { onboardingSchema } from "@/lib/validation/schemas";
import { AppError, formError, type FormState } from "@/lib/utils/errors";
import { getPolicies } from "./policies";
export async function completeOnboarding(
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  if (await getProfile()) redirect("/inicio");
  const parsed = onboardingSchema.safeParse({
    ...Object.fromEntries(form),
    acceptTerms: form.get("acceptTerms") === "on",
    acceptPrivacy: form.get("acceptPrivacy") === "on",
  });
  if (!parsed.success)
    return {
      error: "Revisa tus datos y acepta ambos documentos.",
      fields: parsed.error.flatten().fieldErrors,
    };
  try {
    const policies = await getPolicies();
    if (
      form.get("termsVersion") !== policies.terms.version ||
      form.get("privacyVersion") !== policies.privacy.version
    )
      throw new AppError("POLICY_CHANGED");
    await onboard(await createClient(), parsed.data);
  } catch (error) {
    return formError("onboarding.complete", error);
  }
  redirect(parsed.data.role === "worker" ? "/inicio" : "/negocio/nuevo");
}
