import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { publicConfig } from "@/lib/supabase/env";
import { reportError, AppError } from "@/lib/utils/errors";
export const getIdentity = cache(async () => {
  if (!publicConfig()) return null;
  const client = await createClient();
  const { data, error } = await client.auth.getUser();
  if (error) {
    if (error.name !== "AuthSessionMissingError")
      reportError("auth.identity", error);
    return null;
  }
  return data.user;
});
export async function requireIdentity() {
  const user = await getIdentity();
  if (!user || user.is_anonymous) redirect("/login");
  if (!user.email_confirmed_at) redirect("/confirmar-correo");
  return user;
}
export const getProfile = cache(async () => {
  const user = await requireIdentity();
  const client = await createClient();
  const { data, error } = await client
    .from("cp_profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  if (error) {
    reportError("profile.read", error);
    throw new AppError("SNAPSHOT");
  }
  return data;
});
export async function requireProfile(role?: "worker" | "business") {
  const profile = await getProfile();
  if (!profile) redirect("/onboarding");
  if (profile.role !== "worker" && profile.role !== "business")
    throw new AppError("42501");
  if (role && profile.role !== role) redirect("/inicio");
  return profile;
}
