import { PasswordForm } from "@/features/auth/forms";
import { requireIdentity } from "@/features/auth/session";
import { Card } from "@/components/ui";
export default async function Page() {
  await requireIdentity();
  return (
    <Card className="setup-card">
      <span className="eyebrow">TU ACCESO</span>
      <h1>Nueva contraseña.</h1>
      <p className="lead">
        Al guardarla, cerraremos tus sesiones. Vuelve a entrar con la nueva
        contraseña.
      </p>
      <PasswordForm />
    </Card>
  );
}
