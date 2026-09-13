import Link from "next/link";
import { requireProfile } from "@/features/auth/session";
import { getSnapshot } from "@/features/snapshot/server";
import { publishingOptions } from "@/features/jobs/access";
import { JobForm } from "@/features/jobs/form";
import { Card, EmptyState } from "@/components/ui";
export default async function Page() {
  await requireProfile("business");
  const snapshot = await getSnapshot();
  const { businesses, venues } = publishingOptions(snapshot);
  return (
    <div className="home">
      <Link href="/inicio" className="quiet-link">
        ← Volver a inicio
      </Link>
      <h1>Publicar Curro</h1>
      {!businesses.length ? (
        <EmptyState title="Necesitas un negocio que puedas gestionar.">
          Solo propietarios y gestores activos pueden publicar Curros.{" "}
          {snapshot.businesses.length === 0 && (
            <Link href="/negocio/nuevo">Crear negocio</Link>
          )}
        </EmptyState>
      ) : !venues.length ? (
        <EmptyState title="Necesitas un local activo.">
          Añade un local a un negocio que gestiones antes de publicar.{" "}
          <Link href="/negocio/local/nuevo">Añadir local</Link>
        </EmptyState>
      ) : (
        <Card>
          <p className="lead">Cuéntanos qué necesita tu equipo.</p>
          <JobForm
            businesses={businesses.filter((b) =>
              venues.some((v) => v.business_id === b.id),
            )}
            venues={venues}
          />
        </Card>
      )}
    </div>
  );
}
