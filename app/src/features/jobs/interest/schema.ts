import { z } from "zod";
export const interestInputSchema = z.object({
  jobId: z.uuid("El Curro no es válido. Recarga la página."),
});
export const applicationSchema = z.object({
  id: z.uuid(),
  job_id: z.uuid(),
  worker_id: z.uuid(),
  state: z.enum(["invited", "applied", "selected", "rejected", "withdrawn"]),
});
export type Application = z.infer<typeof applicationSchema>;
