import Link from "next/link";
import { getRequestTime } from "@/lib/utils/request-time";
import { redirect } from "next/navigation";
import { getSnapshot } from "@/features/snapshot/server";
import { homeDestination } from "@/features/snapshot/schema";
import { JobList } from "@/features/jobs/list";
import { ownJobs, publishingOptions } from "@/features/jobs/access";
import { WorkerAvailabilitySummary } from "@/features/availability/summary";
import { Card, Alert } from "@/components/ui";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ published?: string }>;
}) {
  const { published } = await searchParams;
  const snapshot = await getSnapshot();
  const destination = homeDestination(snapshot);
  if (destination !== "/inicio") redirect(destination);
  const { profile, businesses, venues } = snapshot;
  return (
    <div className="home">
      <span className="eyebrow">TU ESPACIO · MÁLAGA</span>
      <h1>Hola, {profile.display_name}.</h1>
      <p className="lead">
        {profile.role === "worker"
          ? "Tu próximo turno empieza contigo."
          : "Tu negocio ya tiene su sitio."}
      </p>
      {profile.role === "worker" ? (
        <WorkerAvailabilitySummary snapshot={snapshot} now={getRequestTime()} />
      ) : (
        <>
          <div className="business-list">
            {businesses.map((b) => (
              <Card key={b.id}>
                <span className="eyebrow">
                  NEGOCIO ·{" "}
                  {b.member_role === "owner"
                    ? "PROPIETARIO"
                    : b.member_role === "manager"
                      ? "GESTOR"
                      : "MIEMBRO"}
                </span>
                <h2>{b.display_name}</h2>
                {venues
                  .filter((v) => v.business_id === b.id && v.active)
                  .map((v) => (
                    <div className="venue" key={v.id}>
                      <strong>{v.name}</strong>
                      <span>
                        {v.address} · {v.city}
                      </span>
                    </div>
                  ))}
                {!venues.some((v) => v.business_id === b.id && v.active) && (
                  <p className="muted">
                    Todavía no hay un local activo. Su propietario o gestor
                    puede añadirlo.
                  </p>
                )}
              </Card>
            ))}
          </div>
          {published === "1" && <Alert success>Curro publicado.</Alert>}
          {publishingOptions(snapshot).businesses.length > 0 && (
            <Link href="/negocio/curros/nuevo" className="button">
              Publicar Curro
            </Link>
          )}
          <JobList jobs={ownJobs(snapshot)} applications={snapshot.applications} />
        </>
      )}
    </div>
  );
}
