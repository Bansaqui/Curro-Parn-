import { createRoot } from "react-dom/client";
import { useState } from "react";
import { WorkerAvailabilitySummary } from "../../src/features/availability/summary";
import { AvailableSwitch } from "../../src/features/availability/status-form";
import { AvailabilityForm } from "../../src/features/availability/forms";
import { WorkerJobList } from "../../src/features/jobs/interest/list";
import { CandidateList } from "../../src/features/jobs/selection/list";
import { BackLink } from "../../src/components/ui/back-link";
import { RefreshLink } from "../../src/components/ui/refresh-link";
import { Card } from "../../src/components/ui";
import { workerSnapshot, application } from "../interest-fixtures";
import { snapshot, jobId, job } from "../jobs-fixtures";
import "../../src/app/globals.css";
function Fixture() {
  const [screen, setScreen] = useState("Inicio");
  const now = Date.parse("2026-09-15T10:00:00Z");
  const s = snapshot();
  s.applications = (
    ["applied", "selected", "rejected", "withdrawn"] as const
  ).map((state, i) => ({
    ...application,
    id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
    worker_name: ["Lucía García", "Álex Romero", "María López", "Dani Ruiz"][i],
    state,
  }));
  s.jobs[0] = { ...job, occupied: screen === "Completo" ? 2 : 1 };
  s.assignments = [
    {
      id: jobId,
      application_id: s.applications[1].id,
      job_id: jobId,
      worker_id: application.worker_id,
      state: "selected",
    },
  ];
  return (
    <main className="app-main">
      <div className="home">
        <nav className="context-actions" aria-label="Escenarios QA">
          {[
            "Inicio",
            "Curros",
            "Disponibilidad",
            "Candidaturas",
            "Completo",
          ].map((name) => (
            <button
              className="button secondary"
              key={name}
              onClick={() => setScreen(name)}
            >
              {name}
            </button>
          ))}
        </nav>
        {screen === "Inicio" ? (
          <>
            <h1>Hola, Lucía.</h1>
            <WorkerAvailabilitySummary snapshot={workerSnapshot()} now={now} />
          </>
        ) : (
          <>
            <BackLink />
            <h1>
              {screen === "Curros"
                ? "Curros disponibles"
                : screen === "Disponibilidad"
                  ? "Mi disponibilidad"
                  : "Candidaturas"}
            </h1>
            {screen === "Curros" ? (
              <>
                <p className="lead">
                  Curros de tu especialidad, próximos primero.
                </p>
                <div className="context-actions">
                  <a className="button secondary" href="/disponibilidad">
                    Gestionar disponibilidad
                  </a>
                </div>
                <WorkerJobList
                  entries={s.applications.map((a) => ({
                    job: { ...job, id: a.id },
                    application: { ...a, job_id: a.id },
                    availability: "covered",
                  }))}
                />
              </>
            ) : screen === "Disponibilidad" ? (
              <>
                <p className="lead">
                  Indica cuándo puedes trabajar. Horario peninsular.
                </p>
                <div className="context-actions">
                  <a className="button secondary" href="/curros">
                    Ver Curros disponibles
                  </a>
                </div>
                <Card>
                  <h2>Disponible para Curros</h2>
                  <AvailableSwitch
                    available
                    message="Estás disponible, pero aún no sabemos cuándo. Añade al menos una franja para encontrar Curros compatibles."
                  />
                </Card>
                <Card>
                  <h2>Añadir franja</h2>
                  <AvailabilityForm />
                </Card>
              </>
            ) : (
              <>
                <p className="lead">
                  {job.title} · {job.business_name}
                </p>
                <div className="context-actions">
                  <RefreshLink href={`/negocio/curros/${jobId}/candidaturas`} />
                </div>
                <CandidateList
                  key={screen}
                  snapshot={s}
                  jobId={jobId}
                  now={now}
                />
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<Fixture />);
