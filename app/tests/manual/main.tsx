import { createRoot } from "react-dom/client";
import { OnboardingForm } from "../../src/features/onboarding/form";
import { Card } from "../../src/components/ui";
import { Brand } from "../../src/components/layout/brand";
import "../../src/app/globals.css";
createRoot(document.getElementById("root")!).render(
  <div className="app-shell">
    <header>
      <Brand />
      <strong>QA AISLADO · SIN BACKEND</strong>
    </header>
    <main className="app-main" id="main">
      <Card className="setup-card">
        <h1>Tu sitio empieza aquí.</h1>
        <p>
          Prueba de interfaz. Enviar espera 6 segundos y muestra un error
          simulado. No guarda datos ni aceptaciones.
        </p>
        <OnboardingForm termsVersion="qa-local" privacyVersion="qa-local" />
      </Card>
    </main>
  </div>,
);
