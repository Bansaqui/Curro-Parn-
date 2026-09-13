import { createRoot } from "react-dom/client";
import { JobForm } from "../../src/features/jobs/form";
import { JobList } from "../../src/features/jobs/list";
import { Card } from "../../src/components/ui";
import { Brand } from "../../src/components/layout/brand";
import { snapshot, otherId, job } from "../jobs-fixtures";
import "../../src/app/globals.css";
const sample = snapshot();
createRoot(document.getElementById("root")!).render(
  <div className="app-shell">
    <header>
      <Brand />
      <strong>QA AISLADO · SIN BACKEND</strong>
    </header>
    <main className="app-main" id="main">
      <div className="home">
        <h1>Publicar Curro</h1>
        <p>
          Enviar espera 6 segundos y muestra un error simulado. No publica
          datos.
        </p>
        <Card>
          <JobForm
            businesses={[
              ...sample.businesses,
              { id: otherId, display_name: "Segundo negocio QA" },
            ]}
            venues={[
              ...sample.venues,
              { id: otherId, business_id: otherId, name: "Segundo local QA" },
            ]}
          />
        </Card>
        <JobList jobs={[]} />
        <JobList jobs={[{ ...job, urgent: true }]} />
      </div>
    </main>
  </div>,
);
