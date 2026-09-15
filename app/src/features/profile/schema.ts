import { z } from "zod";
import { specialties } from "@/lib/validation/schemas";
export const skills = [
  "Sala",
  "Barra",
  "Bandeja",
  "TPV",
  "Terraza",
  "Eventos",
  "Barista",
  "Coctelería",
] as const;
const specialty = z.enum(specialties);
const skill = z.enum(skills);
export const profileSettingsSchema = z
  .strictObject({
    specialties: z.array(specialty).min(1).max(4),
    primary_specialty: specialty,
    skills: z.array(skill).max(8),
  })
  .refine(
    (d) =>
      d.specialties.includes(d.primary_specialty) &&
      new Set(d.specialties).size === d.specialties.length &&
      new Set(d.skills).size === d.skills.length,
    "Selecciona especialidades distintas y una principal incluida en ellas.",
  );
const date = z.iso
  .date("Escribe una fecha válida.")
  .refine(
    (d) => d <= new Date().toISOString().slice(0, 10),
    "La fecha no puede estar en el futuro.",
  );
const name = z
  .string()
  .trim()
  .min(2, "Escribe al menos 2 caracteres.")
  .max(100, "Máximo 100 caracteres.");
export const experienceSchema = z
  .strictObject({
    id: z.uuid().optional(),
    employer_name: name,
    role_label: name,
    start_date: date,
    end_date: date.nullable(),
    description: z.string().trim().max(600, "Máximo 600 caracteres."),
  })
  .refine((d) => !d.end_date || d.end_date >= d.start_date, {
    message: "La fecha de fin no puede ser anterior al inicio.",
    path: ["end_date"],
  });
export const profileTrustSchema = z.object({
  display_name: z.string(),
  legacy_specialty: specialty,
  specialties: z
    .array(z.object({ specialty, is_primary: z.boolean() }))
    .max(4)
    .refine((s) => !s.length || s.filter((x) => x.is_primary).length === 1),
  skills: z.array(skill).max(8),
  experience: z
    .array(
      z.object({
        id: z.uuid().nullable(),
        employer_name: z.string(),
        role_label: z.string(),
        start_date: z.iso.date(),
        end_date: z.iso.date().nullable(),
        description: z.string(),
        verification_status: z.enum(["declared", "verified"]),
      }),
    )
    .max(30),
  is_new: z.boolean(),
});
// Manual command contract for the pending migration; the remote generated Database export stays unchanged.
export type TrustProfile = z.infer<typeof profileTrustSchema>;
export type Experience = TrustProfile["experience"][number];
export type ProfileSettings = z.infer<typeof profileSettingsSchema>;
export type ExperienceInput = z.infer<typeof experienceSchema>;
