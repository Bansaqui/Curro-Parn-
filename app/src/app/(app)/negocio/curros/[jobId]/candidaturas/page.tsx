import { BackLink } from "@/components/ui/back-link";
import { RefreshLink } from "@/components/ui/refresh-link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireProfile } from "@/features/auth/session";
import { getSnapshot } from "@/features/snapshot/server";
import { getRequestTime } from "@/lib/utils/request-time";
import { candidateContext } from "@/features/jobs/selection/selectors";
import { CandidateList } from "@/features/jobs/selection/list";
import { Alert } from "@/components/ui";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ jobId: string }>;
  searchParams: Promise<{ result?: string }>;
}) {
  await requireProfile("business");
  const { jobId } = await params;
  if (!z.uuid().safeParse(jobId).success) notFound();
  const snapshot = await getSnapshot();
  const context = candidateContext(snapshot, jobId);
  if (!context) notFound();
  const { result } = await searchParams;
  return (
    <div className="home">
      <BackLink />
      <h1>Candidaturas</h1>
      <p className="lead">
        {context.job.title} · {context.job.business_name}
      </p>
      {(result === "selected" || result === "rejected") && (
        <Alert success>
          Consulta actualizada. Comprueba el estado de la candidatura abajo.
        </Alert>
      )}
      <div className="context-actions">
        <RefreshLink href={`/negocio/curros/${jobId}/candidaturas`} />
      </div>
      <CandidateList snapshot={snapshot} jobId={jobId} now={getRequestTime()} />
    </div>
  );
}
