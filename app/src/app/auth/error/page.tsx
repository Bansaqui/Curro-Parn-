import Link from "next/link";
import { AuthShell } from "@/components/layout/auth-shell";
export default function Page() {
  return (
    <AuthShell
      eyebrow="ENLACE NO DISPONIBLE"
      title="Vamos a intentarlo otra vez."
      description="El enlace puede haber caducado, ya haberse utilizado o pertenecer a otro navegador. Vuelve al navegador donde lo solicitaste."
    >
      <Link className="button" href="/recuperar-password">
        Recuperar acceso
      </Link>
      <Link href="/login" className="form-footer">
        Volver a entrar
      </Link>
    </AuthShell>
  );
}
