import Link from "next/link";
import { AuthShell } from "@/components/layout/auth-shell";
import { RecoveryForm } from "@/features/auth/forms";
export default function Page() {
  return (
    <AuthShell
      eyebrow="RECUPERAR ACCESO"
      title="Volvamos a entrar."
      description="Te enviaremos un enlace para elegir una nueva contraseña."
    >
      <RecoveryForm />
      <Link className="form-footer" href="/login">
        Volver a entrar
      </Link>
    </AuthShell>
  );
}
