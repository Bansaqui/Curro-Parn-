"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { publicConfig } from "@/lib/supabase/env";
import {
  loginSchema,
  registerSchema,
  recoverySchema,
  passwordSchema,
} from "@/lib/validation/schemas";
import { formError, type FormState, AppError } from "@/lib/utils/errors";
import { safeNext } from "@/lib/utils/redirects";
import { appOrigin } from "./origin";
import { requireIdentity } from "./session";
function configError(): FormState | null {
  return publicConfig()
    ? null
    : formError("auth.config", new AppError("CONFIG"));
}
export async function login(
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return {
      fields: parsed.error.flatten().fieldErrors,
      error: "Revisa los campos indicados.",
    };
  const config = configError();
  if (config) return config;
  const client = await createClient();
  const { error } = await client.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) return formError("auth.login", error);
  redirect(safeNext(parsed.data.next));
}
export async function register(
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return {
      fields: parsed.error.flatten().fieldErrors,
      error: "Revisa los campos indicados.",
    };
  const config = configError();
  if (config) return config;
  const client = await createClient();
  let origin: string;
  try {
    origin = appOrigin();
  } catch (error) {
    return formError("auth.origin", error);
  }
  const { data, error } = await client.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });
  if (error) return formError("auth.register", error);
  if (data.session) redirect("/onboarding");
  return {
    success:
      "Revisa tu correo. Si la dirección puede registrarse, recibirás un enlace para confirmar tu cuenta. Ábrelo en este mismo navegador.",
  };
}
export async function recoverPassword(
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = recoverySchema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return {
      fields: parsed.error.flatten().fieldErrors,
      error: "Revisa tu correo.",
    };
  const config = configError();
  if (config) return config;
  const client = await createClient();
  try {
    const { error } = await client.auth.resetPasswordForEmail(
      parsed.data.email,
      { redirectTo: `${appOrigin()}/auth/callback?next=/actualizar-password` },
    );
    if (error) return formError("auth.recovery", error);
  } catch (error) {
    return formError("auth.recovery", error);
  }
  return {
    success:
      "Si existe una cuenta con ese correo, recibirás un enlace para cambiar la contraseña. Ábrelo en este mismo navegador.",
  };
}
export async function updatePassword(
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  await requireIdentity();
  const parsed = passwordSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return {
      fields: parsed.error.flatten().fieldErrors,
      error: "Revisa la nueva contraseña.",
    };
  const client = await createClient();
  const { error } = await client.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) return formError("auth.password", error);
  const { error: signOutError } = await client.auth.signOut({
    scope: "global",
  });
  if (signOutError) return formError("auth.password.signout", signOutError);
  redirect("/login?message=password-updated");
}
export async function logout(): Promise<FormState> {
  const client = await createClient();
  const { error } = await client.auth.signOut({ scope: "local" });
  if (error) return formError("auth.logout", error);
  redirect("/login");
}
