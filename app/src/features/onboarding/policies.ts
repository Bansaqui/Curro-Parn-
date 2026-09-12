import "server-only";
import { createClient } from "@/lib/supabase/server";
import { requireIdentity } from "@/features/auth/session";
import { AppError, reportError } from "@/lib/utils/errors";
export async function getPolicies() {
  await requireIdentity();
  const client = await createClient();
  const { data, error } = await client
    .from("cp_policy_documents")
    .select("policy_code,version,status,production_ready")
    .eq("current_for_onboarding", true);
  if (error) {
    reportError("policy.read", error);
    throw new AppError("SNAPSHOT");
  }
  const terms = data?.find((p) => p.policy_code === "terms_of_use");
  const privacy = data?.find((p) => p.policy_code === "privacy_notice");
  if (!terms || !privacy) throw new AppError("POLICY_CHANGED");
  // This UI only represents the explicitly authorized pilot drafts. Fail closed
  // if remote policy metadata changes before reviewed documents are implemented.
  if ([terms, privacy].some((p) => p.status !== "draft" || p.production_ready))
    throw new AppError("POLICY_CHANGED");
  return { terms, privacy };
}
