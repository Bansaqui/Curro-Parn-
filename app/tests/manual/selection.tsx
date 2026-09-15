import { createRoot } from "react-dom/client";
import { useState } from "react";
import { CandidateList } from "../../src/features/jobs/selection/list";
import { WorkerJobList } from "../../src/features/jobs/interest/list";
import { workerJobs } from "../../src/features/jobs/interest/selectors";
import { snapshot, jobId, otherId } from "../jobs-fixtures";
import { application } from "../interest-fixtures";
import "../../src/app/globals.css";
function Fixture() {
  const [mode, setMode] = useState("candidates");
  const s = snapshot();
  const now = Date.parse("2026-09-14T10:00:00Z");
  const states = [
    "applied",
    "selected",
    "rejected",
    "withdrawn",
    "invited",
  ] as const;
  s.applications = states.map((state, i) => ({
    ...application,
    id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
    worker_name: [
      "Lucía García",
      "Álex Romero",
      "María López",
      "Dani Ruiz",
      "Carmen Martín",
    ][i],
    state,
  }));
  s.assignments = [
    {
      id: otherId,
      application_id: s.applications[1].id,
      job_id: jobId,
      worker_id: application.worker_id,
      state: "selected",
    },
  ];
  s.jobs[0] = { ...s.jobs[0], occupied: mode === "full" ? 2 : 1 };
  if (mode === "staff") s.businesses[0].member_role = "staff";
  const worker = { ...s, profile: { ...s.profile, role: "worker" as const } };
  return (
    <main className="app-main">
      <div className="home">
        <h1>Candidaturas</h1>
        <p>QA aislada: datos simulados, sin conexión a Supabase.</p>
        <nav className="candidate-actions" aria-label="Escenarios QA">
          {["candidates", "full", "staff", "worker"].map((value) => (
            <button
              key={value}
              className="button"
              onClick={() => setMode(value)}
            >
              {value}
            </button>
          ))}
        </nav>
        {mode === "worker" ? (
          states.map((state) => (
            <WorkerJobList
              key={state}
              entries={workerJobs(
                { ...worker, applications: [{ ...application, state }] },
                now,
              )}
            />
          ))
        ) : (
          <CandidateList key={mode} snapshot={s} jobId={jobId} now={now} />
        )}
      </div>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<Fixture />);
