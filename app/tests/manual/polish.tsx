import { createRoot } from "react-dom/client";
import { Card } from "../../src/components/ui";
import { AvailableSwitch } from "../../src/features/availability/status-form";
import { availabilityMessage } from "../../src/features/availability/status";
import { WorkerAvailabilitySummary } from "../../src/features/availability/summary";
import { WorkerJobList } from "../../src/features/jobs/interest/list";
import { workerSnapshot, application } from "../interest-fixtures";
import { job } from "../jobs-fixtures";
import "../../src/app/globals.css";
const s = workerSnapshot();
s.profile.available = false;
s.availability = [
  {
    id: job.id,
    worker_id: s.profile.id,
    starts_at: "2027-09-20T08:00:00Z",
    ends_at: "2027-09-20T12:00:00Z",
  },
];
createRoot(document.getElementById("root")!).render(
  <main className="app-main">
    <div className="home">
      <h1>QA AISLADO · SIN BACKEND</h1>
      <p>
        Los interruptores esperan y muestran un error simulado, sin guardar
        datos.
      </p>
      <Card>
        <h2>Disponible para Curros — ON sin franjas</h2>
        <AvailableSwitch available message={availabilityMessage(true, [])} />
      </Card>
      <Card>
        <h2>Disponible para Curros — OFF con franjas</h2>
        <AvailableSwitch
          available={false}
          message={availabilityMessage(false, s.availability)}
        />
      </Card>
      <WorkerAvailabilitySummary snapshot={s} now={Date.now()} />
      <WorkerJobList
        entries={[
          { job, availability: "uncovered" },
          {
            job: { ...job, id: s.profile.id },
            application,
            availability: "uncovered",
          },
        ]}
      />
    </div>
  </main>,
);
