import Link from "next/link";
import { requireProfile } from "@/features/auth/session";
import { getSnapshot } from "@/features/snapshot/server";
import {
  chronologicalSlots,
  formatAvailabilityDate,
} from "@/features/availability/schema";
import {
  AvailabilityForm,
  RemoveAvailabilityForm,
} from "@/features/availability/forms";
import { AvailableSwitch } from "@/features/availability/status-form";
import { availabilityMessage } from "@/features/availability/status";
import { Card, EmptyState, Alert } from "@/components/ui";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ result?: string }>;
}) {
  const profile = await requireProfile("worker");
  const snapshot = await getSnapshot();
  const slots = chronologicalSlots(
    snapshot.availability.filter((slot) => slot.worker_id === profile.id),
  );
  const { result } = await searchParams;
  return (
    <div className="home">
      <Link href="/inicio" className="quiet-link">
        ← Volver a inicio
      </Link>
      <h1>Mi disponibilidad</h1>
      <p className="lead">
        Indica cuándo puedes trabajar. Todas las horas se muestran en horario
        peninsular.
      </p>
      {result === "created" && <Alert success>Disponibilidad añadida.</Alert>}
      {result === "deleted" && <Alert success>Franja eliminada.</Alert>}
      {result === "check-create" && (
        <Alert>
          No hemos podido confirmar si se guardó la franja. Revisa las franjas y
          el estado actual antes de volver a añadirla.
        </Alert>
      )}
      {result === "status" && <Alert success>Estado actualizado.</Alert>}
      {result === "check-status" && (
        <Alert>
          La franja se ha guardado, pero no hemos podido confirmar que sigas en
          OFF. Revisa el estado leído abajo antes de continuar.
        </Alert>
      )}
      <Card>
        <h2>Disponible para Curros</h2>
        <AvailableSwitch
          key={String(snapshot.profile.available) + result}
          available={snapshot.profile.available}
          message={availabilityMessage(snapshot.profile.available, slots)}
        />
      </Card>
      <Card>
        <h2>Añadir franja</h2>
        <AvailabilityForm key={slots.map((slot) => slot.id).join(",")} />
      </Card>
      <section className="availability-list" aria-labelledby="slots-title">
        <h2 id="slots-title">Mi disponibilidad · {slots.length}</h2>
        {slots.length === 0 ? (
          <EmptyState title="Aún no has añadido disponibilidad.">
            Añade tu primera franja con el formulario de arriba.
          </EmptyState>
        ) : (
          <ul>
            {slots.map((slot) => (
              <li key={slot.id}>
                <Card>
                  <dl>
                    <dt>Inicio</dt>
                    <dd>
                      <time dateTime={slot.starts_at}>
                        {formatAvailabilityDate(slot.starts_at)}
                      </time>
                    </dd>
                    <dt>Fin</dt>
                    <dd>
                      <time dateTime={slot.ends_at}>
                        {formatAvailabilityDate(slot.ends_at)}
                      </time>
                    </dd>
                  </dl>
                  <RemoveAvailabilityForm id={slot.id} />
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
