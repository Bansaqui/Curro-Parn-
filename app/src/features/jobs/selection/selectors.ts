import type { Snapshot } from "@/features/snapshot/schema";
import type { Application } from "../interest/schema";
import { isActiveAssignment } from "./schema";
export function candidateContext(snapshot: Snapshot, jobId: string) {
  if (snapshot.profile.role !== "business") return null;
  const job = snapshot.jobs.find((job) => job.id === jobId);
  if (!job) return null;
  const membership = snapshot.businesses.find((b) => b.id === job.business_id);
  if (!membership) return null;
  return {
    job,
    canManage:
      membership.member_role === "owner" ||
      membership.member_role === "manager",
    applications: snapshot.applications
      .filter((a) => a.job_id === job.id && a.business_id === job.business_id)
      .sort(
        (a, b) =>
          Date.parse(a.created_at) - Date.parse(b.created_at) ||
          a.id.localeCompare(b.id),
      ),
  };
}
export function canSelect(
  state: Application["state"],
  job: { state: string; starts_at: string; occupied: number; slots: number },
  now: number,
) {
  return (
    state === "applied" &&
    job.state === "published" &&
    Date.parse(job.starts_at) > now &&
    job.occupied < job.slots
  );
}
export function canReject(state: Application["state"]) {
  return state === "applied" || state === "invited";
}
export function selectionEvidence(
  snapshot: Snapshot,
  application: Application,
) {
  const assignment = snapshot.assignments.find(
    (a) =>
      a.application_id === application.id &&
      a.worker_id === application.worker_id &&
      a.job_id === application.job_id,
  );
  if (!assignment)
    return "La asignación no aparece en esta consulta. Actualiza para comprobarla.";
  return isActiveAssignment(assignment)
    ? "Plaza asignada."
    : "La plaza de esta selección fue liberada.";
}
