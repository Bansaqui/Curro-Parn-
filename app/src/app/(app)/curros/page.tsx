import Link from "next/link";
import { BackLink } from "@/components/ui/back-link";
import { requireProfile } from "@/features/auth/session";
import { getSnapshot } from "@/features/snapshot/server";
import { workerJobs } from "@/features/jobs/interest/selectors";
import { WorkerJobList } from "@/features/jobs/interest/list";
import { Alert } from "@/components/ui";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ interest?: string }>;
}) {
  await requireProfile("worker");
  const snapshot = await getSnapshot();
  const { interest } = await searchParams;
  return (
    <div className="home">
      <BackLink />
      <h1>Curros disponibles</h1>
      <p className="lead">
        Curros de tu especialidad, próximos primero. Horario peninsular.
      </p>
      <p className="muted">
        Al enviar tu interés se comprueban disponibilidad, plazas y posibles
        solapes.
      </p>
      <div className="context-actions">
        <Link href="/disponibilidad" className="button secondary">
          Gestionar disponibilidad
        </Link>
      </div>
      {interest === "sent" && (
        <Alert success>
          Interés enviado. Puedes consultar su estado en la tarjeta del Curro.
        </Alert>
      )}
      <WorkerJobList entries={workerJobs(snapshot)} />
    </div>
  );
}
