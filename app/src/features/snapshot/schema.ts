import { z } from "zod";
import { availabilitySlotSchema } from "@/features/availability/schema";
import { jobSchema } from "@/features/jobs/schema";
export const snapshotSchema = z.object({
  profile: z.object({
    id: z.uuid(),
    role: z.enum(["worker", "business"]),
    display_name: z.string(),
    specialty: z.string().nullable(),
    available: z.boolean(),
  }),
  jobs: z.array(jobSchema),
  availability: z.array(availabilitySlotSchema),
  businesses: z.array(
    z.object({
      id: z.uuid(),
      display_name: z.string(),
      legal_name: z.string(),
      member_role: z.enum(["owner", "manager", "staff"]),
    }),
  ),
  venues: z.array(
    z.object({
      id: z.uuid(),
      business_id: z.uuid(),
      name: z.string(),
      address: z.string(),
      city: z.string(),
      active: z.boolean(),
    }),
  ),
});
export type Snapshot = z.infer<typeof snapshotSchema>;
export function managedBusinesses(snapshot: Snapshot) {
  return snapshot.businesses.filter(
    (b) => b.member_role === "owner" || b.member_role === "manager",
  );
}
export function homeDestination(snapshot: Snapshot): string {
  if (snapshot.profile.role === "worker") return "/inicio";
  if (!snapshot.businesses.length) return "/negocio/nuevo";
  if (
    !snapshot.venues.some((v) => v.active) &&
    managedBusinesses(snapshot).length
  )
    return "/negocio/local/nuevo";
  return "/inicio";
}
