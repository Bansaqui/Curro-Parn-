import type { TrustProfile } from "@/features/profile/schema";
export const trustProfile: TrustProfile = {
  display_name: "Lucía García",
  legacy_specialty: "Camarero/a",
  specialties: [
    { specialty: "Camarero/a", is_primary: true },
    { specialty: "Bartender", is_primary: false },
  ],
  skills: ["Sala", "TPV"],
  experience: [],
  is_new: true,
};
export const experience = {
  id: "00000000-0000-4000-8000-000000000010",
  employer_name: "Restaurante Málaga",
  role_label: "Camarera de sala",
  start_date: "2020-01-01",
  end_date: null,
  description: "Servicio en terraza y sala",
  verification_status: "declared" as const,
};
