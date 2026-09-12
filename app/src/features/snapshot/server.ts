import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/features/auth/session";
import { snapshotSchema } from "./schema";
import { AppError, reportError } from "@/lib/utils/errors";
export const getSnapshot = cache(async () => {
  const profile = await requireProfile();
  const client = await createClient();
  const { data, error } = await client.rpc("cp_command", {
    p_action: "snapshot",
    p_data: {},
  });
  const parsed = snapshotSchema.safeParse(data);
  if (
    error ||
    !parsed.success ||
    parsed.data.profile.id !== profile.id ||
    parsed.data.profile.role !== profile.role
  ) {
    reportError("snapshot.read", error ?? new AppError("SNAPSHOT"));
    throw new AppError("SNAPSHOT");
  }
  return parsed.data;
});
