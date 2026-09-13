import { z } from "zod";
import { madridInstant } from "@/features/availability/schema";
import { specialties } from "@/lib/validation/schemas";

// Decimal strings only: no grouping separators, exponent or floating-point rounding.
export function eurosToCents(value: string): number | null {
  const match = /^(\d{1,6})(?:[.,](\d{1,2}))?$/.exec(value.trim());
  if (!match) return null;
  const cents =
    Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  return cents >= 1 && cents <= 10_000_000 ? cents : null;
}
const date = z
  .string()
  .min(1, "Indica la fecha y la hora.")
  .refine(
    (value) => madridInstant(value) !== null,
    "Indica una hora peninsular válida, sin ambigüedad por el cambio de horario.",
  );
export const publishInputSchema = z
  .object({
    businessId: z.uuid("Selecciona un negocio válido."),
    venueId: z.uuid("Selecciona un local válido."),
    title: z
      .string()
      .trim()
      .min(3, "El título debe tener al menos 3 caracteres.")
      .max(120, "El título admite como máximo 120 caracteres."),
    specialty: z.enum(specialties, { error: "Elige una especialidad." }),
    description: z
      .string()
      .trim()
      .max(2000, "La descripción admite como máximo 2000 caracteres.")
      .default(""),
    start: date,
    end: date,
    slots: z
      .string()
      .regex(
        /^(?:[1-9]|1[0-9]|20)$/,
        "Indica entre 1 y 20 plazas, sin decimales.",
      ),
    payEuros: z
      .string()
      .refine(
        (v) => eurosToCents(v) !== null,
        "Indica entre 0,01 y 100.000 euros, con hasta dos decimales y sin separador de miles.",
      ),
    urgent: z.enum(["no", "yes"], { error: "Indica si el Curro es urgente." }),
  })
  .superRefine((value, context) => {
    const start = madridInstant(value.start),
      end = madridInstant(value.end);
    if (!start || !end) return;
    if (Date.parse(start) <= Date.now())
      context.addIssue({
        code: "custom",
        path: ["start"],
        message: "El inicio debe ser futuro.",
      });
    const duration = Date.parse(end) - Date.parse(start);
    if (duration <= 0)
      context.addIssue({
        code: "custom",
        path: ["end"],
        message: "El fin debe ser posterior al inicio.",
      });
    if (duration > 18 * 3600000)
      context.addIssue({
        code: "custom",
        path: ["end"],
        message: "Un Curro puede durar como máximo 18 horas.",
      });
  });
export type PublishInput = z.infer<typeof publishInputSchema>;
export const jobSchema = z
  .object({
    id: z.uuid(),
    business_id: z.uuid(),
    venue_id: z.uuid(),
    title: z.string(),
    venue_name: z.string(),
    specialty: z.enum(specialties),
    starts_at: z.iso.datetime({ offset: true }),
    ends_at: z.iso.datetime({ offset: true }),
    slots: z.number().int().min(1).max(20),
    pay_cents: z.number().int().min(1).max(10_000_000),
    urgent: z.boolean(),
    state: z.enum(["published", "cancelled"]),
  })
  .refine(
    (j) => Date.parse(j.ends_at) > Date.parse(j.starts_at),
    "Fechas de Curro inválidas.",
  );
export type Job = z.infer<typeof jobSchema>;
export function formatPay(cents: number) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}
