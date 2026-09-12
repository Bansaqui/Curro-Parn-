import Link from "next/link";
import type { ReactNode } from "react";
import { Brand } from "./brand";
import { Card } from "@/components/ui";
export function AuthShell({
  title,
  eyebrow,
  description,
  children,
}: {
  title: string;
  eyebrow: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="auth-shell">
      <header>
        <Brand />
        <Link href="/" className="quiet-link">
          Volver al inicio ↗
        </Link>
      </header>
      <main id="main" className="auth-main">
        <div className="auth-intro">
          <span className="eyebrow">HOSTELERÍA · MÁLAGA</span>
          <h2>
            Tu próximo
            <br />
            paso empieza
            <br />
            <em>aquí.</em>
          </h2>
          <p>
            Personas y negocios.
            <br />
            El mismo lugar para encontrarse.
          </p>
          <span className="pilot-label">MVP en desarrollo</span>
        </div>
        <Card className="auth-card">
          <span className="eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          <p className="lead">{description}</p>
          {children}
        </Card>
      </main>
      <footer>Málaga es solo el principio.</footer>
    </div>
  );
}
