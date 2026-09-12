import { AuthShell } from "@/components/layout/auth-shell";
import { LoginForm } from "@/features/auth/forms";
import { safeNext } from "@/lib/utils/redirects";
import { Alert } from "@/components/ui";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; message?: string }>;
}) {
  const query = await searchParams;
  return (
    <AuthShell
      eyebrow="BIENVENIDO DE NUEVO"
      title="Vamos al curro."
      description="Entra con tu correo y continúa donde lo dejaste."
    >
      {query.message === "password-updated" && (
        <Alert success>Contraseña actualizada. Entra de nuevo.</Alert>
      )}
      <LoginForm next={safeNext(query.next)} />
    </AuthShell>
  );
}
