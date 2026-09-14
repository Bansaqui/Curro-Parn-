import type { Snapshot } from "@/features/snapshot/schema";
import type { PublishInput, Job } from "@/features/jobs/schema";
export const businessId = "11111111-1111-4111-8111-111111111111";
export const venueId = "22222222-2222-4222-8222-222222222222";
export const otherId = "33333333-3333-4333-8333-333333333333";
export const jobId = "44444444-4444-4444-8444-444444444444";
export const input: PublishInput = {
  businessId,
  venueId,
  title: "Refuerzo de sala",
  specialty: "Camarero/a",
  description: "",
  start: "2026-09-20T10:00",
  end: "2026-09-20T14:00",
  slots: "2",
  payEuros: "85,50",
  urgent: "no",
};
export const job: Job = {
  id: jobId,
  business_id: businessId,
  venue_id: venueId,
  venue_name: "Centro",
  business_name: "Costa",
  title: input.title,
  specialty: input.specialty,
  starts_at: "2026-09-20T08:00:00Z",
  ends_at: "2026-09-20T12:00:00Z",
  slots: 2,
  pay_cents: 8550,
  urgent: false,
  state: "published",
};
export function snapshot(): Snapshot {
  return {
    profile: {
      id: otherId,
      role: "business",
      display_name: "QA",
      specialty: null,
      available: false,
    },
    availability: [],
    jobs: [job],
    applications: [],
    businesses: [
      {
        id: businessId,
        display_name: "Costa",
        legal_name: "Costa SL",
        member_role: "owner",
      },
    ],
    venues: [
      {
        id: venueId,
        business_id: businessId,
        name: "Centro",
        address: "Calle Real 1",
        city: "Málaga",
        active: true,
      },
    ],
  };
}
export function form(values: Record<string, string>) {
  const f = new FormData();
  Object.entries(values).forEach(([k, v]) => f.set(k, v));
  return f;
}
