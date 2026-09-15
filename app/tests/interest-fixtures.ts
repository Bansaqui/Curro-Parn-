import type { Application } from "@/features/jobs/interest/schema";
import { snapshot, job, otherId, venueId, businessId } from "./jobs-fixtures";
export const application: Application = {
  id: venueId,
  job_id: job.id,
  worker_id: otherId,
  business_id: businessId,
  worker_name: "Profesional QA",
  created_at: "2026-09-14T10:00:00Z",
  state: "applied",
};
export function workerSnapshot() {
  const s = snapshot();
  s.profile.role = "worker";
  s.profile.specialty = job.specialty;
  s.profile.available = true;
  s.businesses = [];
  s.venues = [];
  s.applications = [];
  return s;
}
