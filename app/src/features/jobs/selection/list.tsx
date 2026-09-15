import { Card, EmptyState } from "@/components/ui";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatAvailabilityDate } from "@/features/availability/schema";
import type { Snapshot } from "@/features/snapshot/schema";
import { interestLabel } from "../interest/selectors";
import {
  candidateContext,
  canSelect,
  canReject,
  selectionEvidence,
} from "./selectors";
import { CandidateActions } from "./form";
export function CandidateList({
  snapshot,
  jobId,
  now,
}: {
  snapshot: Snapshot;
  jobId: string;
  now: number;
}) {
  const context = candidateContext(snapshot, jobId);
  if (!context) return null;
  const { job, applications, canManage } = context;
  return (
    <>
      <Card>
        <h2>Plazas</h2>
        <p className="capacity-count">
          {job.occupied} de {job.slots} cubiertas
        </p>
        <p className="muted">
          {Math.max(0, job.slots - job.occupied)}{" "}
          {job.slots - job.occupied === 1 ? "pendiente" : "pendientes"}
        </p>
        {job.occupied >= job.slots && (
          <p>
            <StatusBadge tone="positive">
              <span aria-hidden="true">✓ </span>Todas las plazas están cubiertas
            </StatusBadge>
          </p>
        )}
        {!canManage && (
          <p>
            Acceso de solo lectura. El propietario o gestor puede seleccionar y
            descartar.
          </p>
        )}
        {(job.state !== "published" || Date.parse(job.starts_at) <= now) && (
          <p>Este Curro ya no permite nuevas selecciones.</p>
        )}
      </Card>
      {!applications.length ? (
        <EmptyState title="Aún no hay candidaturas para este Curro.">
          Las personas interesadas aparecerán aquí.
        </EmptyState>
      ) : (
        <ul className="candidate-list">
          {applications.map((application) => (
            <li key={application.id}>
              <Card>
                <h2>{application.worker_name}</h2>
                <p className="muted">Especialidad del Curro: {job.specialty}</p>
                <p>
                  <StatusBadge
                    tone={
                      application.state === "selected"
                        ? "positive"
                        : application.state === "applied"
                          ? "copper"
                          : "neutral"
                    }
                  >
                    {application.state === "applied"
                      ? "Interés recibido"
                      : interestLabel(application.state)}
                  </StatusBadge>
                </p>
                <p className="muted">
                  Candidatura del{" "}
                  <time dateTime={application.created_at}>
                    {formatAvailabilityDate(application.created_at)}
                  </time>
                </p>
                {application.state === "selected" && (
                  <p>{selectionEvidence(snapshot, application)}</p>
                )}
                {canManage &&
                  (canSelect(application.state, job, now) ||
                    canReject(application.state)) && (
                    <CandidateActions
                      jobId={jobId}
                      applicationId={application.id}
                      selectable={canSelect(application.state, job, now)}
                      rejectable={canReject(application.state)}
                    />
                  )}
              </Card>
            </li>
          ))}
        </ul>
      )}
      <p className="muted">
        Por fecha de candidatura, sin ranking. Se muestran las candidaturas
        incluidas en la consulta actual
        {snapshot.applications.length >= 500
          ? " (límite de 500 alcanzado; el listado puede estar incompleto)"
          : ""}
        .
      </p>
    </>
  );
}
