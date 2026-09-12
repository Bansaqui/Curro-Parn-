import { redirect } from "next/navigation";
import { getSnapshot } from "@/features/snapshot/server";
import { homeDestination } from "@/features/snapshot/schema";
import { Card, EmptyState } from "@/components/ui";
export default async function Page() {
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
        <>
          <Card>
            <span className="eyebrow">PROFESIONAL</span>
            <h2>{profile.specialty}</h2>
            <span className={`status ${profile.available ? "available" : ""}`}>
              <span />
              {profile.available ? "Disponible" : "No disponible"}
            </span>
            <p className="muted">
              Estado actual de tu perfil. La gestión de disponibilidad llegará
              en una próxima fase.
            </p>
          </Card>
          <EmptyState title="Tu próximo curro está por venir.">
            Próximamente aparecerán aquí los Curros compatibles contigo.
          </EmptyState>
        </>
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
          <EmptyState title="Tu equipo, en el siguiente paso.">
            La publicación de Curros llegará en una próxima fase.
          </EmptyState>
        </>
      )}
    </div>
  );
}
