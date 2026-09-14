import type { Snapshot } from "@/features/snapshot/schema";
import type { Job } from "../schema";
import type { Application } from "./schema";
import { coversTurn } from "@/features/availability/status";
export type WorkerJob = {
  job: Job;
  application?: Application;
  availability: "off" | "uncovered" | "covered";
};
export function ownApplication(snapshot: Snapshot, jobId: string) {
  return snapshot.applications.find(
    (a) => a.worker_id === snapshot.profile.id && a.job_id === jobId,
  );
}
export function workerJobs(snapshot: Snapshot, now = Date.now()): WorkerJob[] {
  if (snapshot.profile.role !== "worker") return [];
  // Obvious eligibility only. Availability coverage, capacity and overlaps stay in apply.
  return snapshot.jobs
    .filter(
      (job) =>
        job.state === "published" &&
        Date.parse(job.starts_at) > now &&
        job.specialty === snapshot.profile.specialty,
    )
    .sort(
      (a, b) =>
        Date.parse(a.starts_at) - Date.parse(b.starts_at) ||
        a.id.localeCompare(b.id),
    )
    .map((job) => ({
      job,
      application: ownApplication(snapshot, job.id),
      availability: !snapshot.profile.available
        ? "off"
        : coversTurn(
              snapshot.availability,
              snapshot.profile.id,
              job.starts_at,
              job.ends_at,
            )
          ? "covered"
          : "uncovered",
    }));
}
export function interestLabel(state?: Application["state"]) {
  switch (state) {
    case "applied":
      return "Interés enviado";
    case "selected":
      return "Interés enviado · Candidatura seleccionada";
    case "rejected":
      return "Candidatura rechazada";
    case "withdrawn":
      return "Candidatura retirada";
    case "invited":
      return "Invitación recibida";
    default:
      return null;
  }
}
export function canSendInterest(state?: Application["state"]) {
  return state === undefined || state === "invited";
}
