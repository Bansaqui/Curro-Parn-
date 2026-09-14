import { createRoot } from "react-dom/client";
import { WorkerJobList } from "../../src/features/jobs/interest/list";
import { Brand } from "../../src/components/layout/brand";
import { job, otherId } from "../jobs-fixtures";
import { application } from "../interest-fixtures";
import "../../src/app/globals.css";
createRoot(document.getElementById("root")!).render(
  <div className="app-shell">
    <header>
      <Brand />
      <strong>QA AISLADO · SIN BACKEND</strong>
    </header>
    <main className="app-main">
      <div className="home">
        <h1>Curros disponibles</h1>
        <p>
          Datos simulados. Enviar espera 6 segundos y muestra un error. No crea
          candidaturas.
        </p>
        <WorkerJobList
          entries={[
            { job: { ...job, urgent: true }, availability: "covered" },
            {
              job: { ...job, id: otherId, title: "Curro con interés enviado" },
              application: { ...application, job_id: otherId },
              availability: "uncovered",
            },
          ]}
        />
        <WorkerJobList entries={[]} />
      </div>
    </main>
  </div>,
);
