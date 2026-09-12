import { notFound } from "next/navigation";
import Link from "next/link";
import { AuthShell } from "@/components/layout/auth-shell";
export default async function Page({
  params,
}: {
  params: Promise<{ document: string }>;
}) {
  const { document } = await params;
  if (document !== "terminos" && document !== "privacidad") notFound();
  return (
    <AuthShell
      eyebrow={
        document === "terminos" ? "TÉRMINOS DE USO" : "POLÍTICA DE PRIVACIDAD"
      }
      title="Documento legal pendiente de revisión"
      description="El texto completo todavía no está disponible. Esta pantalla informativa no contiene un documento legal válido ni definitivo."
    >
      <div className="legal-note">
        <strong>Borrador MVP · No preparado para producción</strong>
        <p>
          La redacción y la revisión jurídica están pendientes. Las aceptaciones
          del onboarding pertenecen exclusivamente a esta fase piloto.
        </p>
      </div>
      <Link href="/onboarding" className="button">
        Volver al onboarding
      </Link>
    </AuthShell>
  );
}
