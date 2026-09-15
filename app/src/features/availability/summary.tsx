import Link from "next/link";
import { Card } from "@/components/ui";
import { formatAvailabilityDate } from "./schema";
import { availabilityMessage, nextAvailability } from "./status";
import type { Snapshot } from "@/features/snapshot/schema";
export function WorkerAvailabilitySummary({
  snapshot,
  now,
}: {
  snapshot: Snapshot;
  now: number;
}) {
  const slots = snapshot.availability.filter(
    (s) => s.worker_id === snapshot.profile.id,
  );
  const next = nextAvailability(slots, snapshot.profile.id, now);
  return (
    <>
      <Card>
        <h2>Disponible para Curros</h2>
        <span
          className={`status ${snapshot.profile.available ? "available" : ""}`}
        >
          <span />
          {snapshot.profile.available ? "ON" : "OFF"}
        </span>
        <p className="muted">
          {availabilityMessage(snapshot.profile.available, slots, now)}
        </p>
        <h3>Mi disponibilidad</h3>
        {next ? (
          <p>
            {Date.parse(next.starts_at) <= now
              ? "Franja en curso"
              : "Próxima franja"}
            <br />
            <time dateTime={next.starts_at}>
              {formatAvailabilityDate(next.starts_at)}
            </time>{" "}
            —{" "}
            <time dateTime={next.ends_at}>
              {formatAvailabilityDate(next.ends_at)}
            </time>
          </p>
        ) : (
          <p className="muted">No hay próximas franjas guardadas.</p>
        )}
        <div className="context-actions">
          <Link href="/perfil" className="button secondary">
            Mi perfil
          </Link>
          <Link href="/curros" className="button">
            Ver Curros
          </Link>
          <Link href="/disponibilidad" className="button secondary">
            Gestionar disponibilidad
          </Link>
        </div>
      </Card>
      <Card className="card-subtle">
        <h2>Actividad</h2>
        <p className="muted">
          Consulta el estado de tus candidaturas en Ver Curros: interés enviado,
          seleccionado o no seleccionado.
        </p>
      </Card>
    </>
  );
}
