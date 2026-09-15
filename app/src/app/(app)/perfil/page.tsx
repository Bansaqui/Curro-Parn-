import { requireProfile } from "@/features/auth/session";
import { createClient } from "@/lib/supabase/server";
import { readTrustProfile } from "@/features/profile/commands";
import { TrustProfileView } from "@/features/profile/view";
import { ProfileForm, ExperienceForm } from "@/features/profile/forms";
import { Card, Alert } from "@/components/ui";
import Link from "next/link";
export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ result?: string }>;
}) {
  await requireProfile("worker");
  const profile = await readTrustProfile(await createClient());
  const { result } = await searchParams;
  return (
    <div className="home profile-trust">
      <Link className="button secondary" href="/inicio">
        Volver a Inicio
      </Link>
      <h1>Mi perfil profesional</h1>
      {result === "saved" && <Alert success>Perfil guardado.</Alert>}
      {result === "check" && (
        <Alert>
          No pudimos confirmar la operación. Comprueba los datos guardados antes
          de intentarlo de nuevo.
        </Alert>
      )}
      <TrustProfileView profile={profile} editable />
      <Card>
        <h2>Especialidades y habilidades</h2>
        <ProfileForm profile={profile} />
      </Card>
      <Card>
        <h2>Añadir experiencia</h2>
        {profile.experience.length < 30 ? (
          <ExperienceForm />
        ) : (
          <p>Has alcanzado el máximo de 30 experiencias.</p>
        )}
        <p className="muted">
          No incluyas teléfonos, correos ni información sensible. Los negocios
          podrán leer este perfil cuando envíes una candidatura a uno de sus
          Curros.
        </p>
      </Card>
    </div>
  );
}
