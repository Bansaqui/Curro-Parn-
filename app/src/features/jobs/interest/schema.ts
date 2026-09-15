import { z } from "zod";
export const interestInputSchema = z.object({
  jobId: z.uuid("El Curro no es válido. Recarga la página."),
});
export const applicationSchema = z.object({
  id: z.uuid(),
  job_id: z.uuid(),
  worker_id: z.uuid(),
  business_id: z.uuid(),
  worker_name: z.string().min(1),
  created_at: z.iso.datetime({ offset: true }),
  state: z.enum(["invited", "applied", "selected", "rejected", "withdrawn"]),
});
export type Application = z.infer<typeof applicationSchema>;
