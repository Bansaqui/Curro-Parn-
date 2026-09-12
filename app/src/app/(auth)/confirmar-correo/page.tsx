import Link from "next/link";
import { AuthShell } from "@/components/layout/auth-shell";
export default function Page() {
  return (
    <AuthShell
      eyebrow="REVISA TU BANDEJA"
      title="Confirma tu correo."
      description="Abre el enlace que te hemos enviado para continuar. Revisa también la carpeta de correo no deseado."
    >
      <Link className="button" href="/login">
        Volver a entrar
      </Link>
    </AuthShell>
  );
}
