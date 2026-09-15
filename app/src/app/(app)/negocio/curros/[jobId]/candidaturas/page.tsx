import Link from "next/link";
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
      <Link href="/inicio" className="quiet-link">
        ← Volver a inicio
      </Link>
      <h1>Candidaturas</h1>
      <p className="lead">
        {context.job.title} · {context.job.venue_name}
      </p>
      {(result === "selected" || result === "rejected") && (
        <Alert success>
          Consulta actualizada. Comprueba el estado de la candidatura abajo.
        </Alert>
      )}
      <a href={`/negocio/curros/${jobId}/candidaturas`} className="quiet-link">
        Actualizar candidaturas
      </a>
      <CandidateList snapshot={snapshot} jobId={jobId} now={getRequestTime()} />
    </div>
  );
}
