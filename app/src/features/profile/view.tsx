import { Card } from "@/components/ui";
import { StatusBadge } from "@/components/ui/status-badge";
import type { TrustProfile } from "./schema";
import { ExperienceForm, RemoveExperienceForm } from "./forms";
export function TrustProfileView({
  profile,
  editable = false,
}: {
  profile: TrustProfile;
  editable?: boolean;
}) {
  return (
    <div className="profile-trust">
      <Card>
        <h2>{profile.display_name}</h2>
        {profile.is_new && (
          <>
            <StatusBadge tone="neutral">Nuevo en Curro &amp; Parné</StatusBadge>
            <p className="muted">
              Aún no tiene Curros finalizados en la plataforma. Esto no indica
              falta de experiencia profesional.
            </p>
          </>
        )}
        <h3>Especialidades</h3>
        {profile.specialties.length ? (
          <ul>
            {profile.specialties.map((s) => (
              <li key={s.specialty}>
                {s.specialty}
                {s.is_primary && " · Principal"}
              </li>
            ))}
          </ul>
        ) : (
          <p>Aún no has añadido especialidades.</p>
        )}
        <h3>Habilidades</h3>
        <p>
          {profile.skills.length
            ? profile.skills.join(" · ")
            : "Sin habilidades añadidas."}
        </p>
      </Card>
      <Card>
        <h2>Experiencia profesional</h2>
        <p className="muted">
          Experiencia declarada por el profesional. No equivale a una
          verificación documental ni laboral.
        </p>
        {!profile.experience.length && <p>Aún no hay experiencias añadidas.</p>}
        {profile.experience.map((e, i) => (
          <article className="profile-experience" key={e.id ?? i}>
            <h3>
              {e.role_label} · {e.employer_name}
            </h3>
            <p>
              <time dateTime={e.start_date}>{e.start_date}</time> —{" "}
              {e.end_date ? (
                <time dateTime={e.end_date}>{e.end_date}</time>
              ) : (
                "Actualidad"
              )}
            </p>
            <p>{e.description}</p>
            <p className="muted">
              {e.verification_status === "declared"
                ? "Experiencia declarada"
                : "Estado gestionado por la plataforma"}
            </p>
            {editable && e.id && e.verification_status === "declared" && (
              <>
                <details>
                  <summary>Editar experiencia</summary>
                  <ExperienceForm experience={e} />
                </details>
                <RemoveExperienceForm id={e.id} />
              </>
            )}
          </article>
        ))}
      </Card>
    </div>
  );
}
