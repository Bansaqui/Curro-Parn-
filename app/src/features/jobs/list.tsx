import { Card, EmptyState } from "@/components/ui";
import { formatAvailabilityDate } from "@/features/availability/schema";
import { formatPay, type Job } from "./schema";
import Link from "next/link";
import type { Application } from "./interest/schema";
export function JobList({
  jobs,
  applications = [],
}: {
  jobs: Job[];
  applications?: Application[];
}) {
  const counts = new Map<string, number>();
  for (const a of applications)
    counts.set(a.job_id, (counts.get(a.job_id) ?? 0) + 1);
  if (!jobs.length)
    return (
      <EmptyState title="Aún no has publicado ningún Curro.">
        Aquí verás los Curros de tus negocios.
      </EmptyState>
    );
  return (
    <section className="jobs-list" aria-labelledby="jobs-title">
      <h2 id="jobs-title">Curros de tus negocios</h2>
      <ul>
        {jobs.map((job) => (
          <li key={job.id}>
            <Card>
              <span className="eyebrow">
                {job.state === "published" ? "Publicado" : "Cancelado"}
                {job.urgent ? " · Urgente" : ""}
              </span>
              <h3>{job.title}</h3>
              <p className="muted">
                {job.venue_name} · {job.specialty}
              </p>
              <dl>
                <dt>Inicio</dt>
                <dd>
                  <time dateTime={job.starts_at}>
                    {formatAvailabilityDate(job.starts_at)}
                  </time>
                </dd>
                <dt>Fin</dt>
                <dd>
                  <time dateTime={job.ends_at}>
                    {formatAvailabilityDate(job.ends_at)}
                  </time>
                </dd>
                <dt>Plazas</dt>
                <dd>
                  {job.occupied} / {job.slots} cubiertas
                </dd>
                <dt>Remuneración</dt>
                <dd>{formatPay(job.pay_cents)}</dd>
              </dl>
              <p>
                {counts.get(job.id) ?? 0} candidaturas
                {applications.length >= 500 ? " en esta consulta parcial" : ""}
              </p>
              <Link
                className="button"
                href={`/negocio/curros/${job.id}/candidaturas`}
              >
                Ver candidaturas
              </Link>
            </Card>
          </li>
        ))}
      </ul>
      <p className="muted">
        Horario peninsular. Hasta 200 Curros devueltos por el servicio; próximos
        primero.
      </p>
    </section>
  );
}
