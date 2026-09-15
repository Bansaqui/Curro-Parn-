import { z } from "zod";
export const selectionInputSchema = z.object({
  jobId: z.uuid(),
  applicationId: z.uuid(),
  decision: z.enum(["select", "reject"]),
});
export const assignmentSchema = z.object({
  id: z.uuid(),
  application_id: z.uuid(),
  job_id: z.uuid(),
  worker_id: z.uuid(),
  state: z.enum([
    "selected",
    "conditions_ready",
    "confirmed",
    "working",
    "payment_pending",
    "business_paid",
    "closed",
    "cancelled",
    "no_show",
    "replaced",
  ]),
});
export type Assignment = z.infer<typeof assignmentSchema>;
export const releasedStates: readonly Assignment["state"][] = [
  "cancelled",
  "no_show",
  "replaced",
];
export function isActiveAssignment(assignment: Assignment) {
  return !releasedStates.includes(assignment.state);
}
