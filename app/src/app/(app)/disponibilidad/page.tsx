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
      <h1>Disponibilidad</h1>
      <p className="lead">
        Indica cuándo puedes trabajar. Todas las horas se muestran en horario
        peninsular.
      </p>
      {result === "created" && <Alert success>Disponibilidad añadida.</Alert>}
      {result === "deleted" && <Alert success>Franja eliminada.</Alert>}
      <Card>
        <h2>Tu estado</h2>
        <span
          className={`status ${snapshot.profile.available ? "available" : ""}`}
        >
          <span />
          {snapshot.profile.available ? "Disponible" : "No disponible"}
        </span>
        <p className="muted">
          Añadir una franja te marca como disponible. Eliminar franjas no cambia
          esta marca del perfil.
        </p>
      </Card>
      <Card>
        <h2>Añadir disponibilidad</h2>
        <AvailabilityForm key={slots.map((slot) => slot.id).join(",")} />
      </Card>
      <section className="availability-list" aria-labelledby="slots-title">
        <h2 id="slots-title">Tus franjas · {slots.length}</h2>
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
