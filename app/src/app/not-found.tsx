import Link from "next/link";
import { AuthShell } from "@/components/layout/auth-shell";
export default function NotFound() {
  return (
    <AuthShell
      eyebrow="404"
      title="Por aquí no era."
      description="Esta página no existe o ha cambiado de dirección."
    >
      <Link href="/" className="button">
        Volver al inicio
      </Link>
    </AuthShell>
  );
}
