import { Card, EmptyState } from "@/components/ui";
import { formatAvailabilityDate } from "@/features/availability/schema";
import { formatPay } from "../schema";
import { InterestForm } from "./form";
import type { WorkerJob } from "./selectors";
export function WorkerJobList({ entries }: { entries: WorkerJob[] }) {
  if (!entries.length)
    return (
      <EmptyState title="Ahora mismo no hay Curros compatibles contigo.">
        Vuelve más tarde y mantén tu disponibilidad actualizada.
      </EmptyState>
    );
  return (
    <section className="jobs-list" aria-label="Curros compatibles">
      <ul>
        {entries.map(({ job, application }) => (
          <li key={job.id}>
            <Card>
              <span className="eyebrow">
                Publicado{job.urgent ? " · Urgente" : ""}
              </span>
              <h2>{job.title}</h2>
              <p className="muted">
                {job.business_name} · {job.venue_name}
              </p>
              <p>{job.specialty}</p>
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
                <dd>{job.slots}</dd>
                <dt>Remuneración</dt>
                <dd>{formatPay(job.pay_cents)}</dd>
              </dl>
              <InterestForm jobId={job.id} state={application?.state} />
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
