import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireProfile } from "@/features/auth/session";
import { getSnapshot } from "@/features/snapshot/server";
import { candidateContext } from "@/features/jobs/selection/selectors";
import { createClient } from "@/lib/supabase/server";
import { readTrustProfile } from "@/features/profile/commands";
import { TrustProfileView } from "@/features/profile/view";
export default async function CandidateProfilePage({
  params,
}: {
  params: Promise<{ jobId: string; applicationId: string }>;
}) {
  await requireProfile("business");
  const ids = z
    .object({ jobId: z.uuid(), applicationId: z.uuid() })
    .safeParse(await params);
  if (!ids.success) notFound();
  const { jobId, applicationId } = ids.data;
  const context = candidateContext(await getSnapshot(), jobId);
  if (!context?.applications.some((a) => a.id === applicationId)) notFound();
  // The command independently verifies membership, job ownership and an actual apply event.
  let profile;
  try {
    profile = await readTrustProfile(await createClient(), applicationId);
  } catch {
    notFound();
  }
  return (
    <div className="home profile-trust">
      <Link
        className="button secondary"
        href={`/negocio/curros/${jobId}/candidaturas`}
      >
        Volver a candidaturas
      </Link>
      <h1>Perfil profesional</h1>
      <TrustProfileView profile={profile} />
    </div>
  );
}
