import { z } from "zod";
export const availabilityZone = "Europe/Madrid";
const partsFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: availabilityZone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
// datetime-local has no offset. Resolve peninsular time explicitly, independent
// of browser/server TZ. Reject DST gaps and repeated hours instead of guessing.
export function madridInstant(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const naive = Date.parse(value + ":00Z");
  if (!Number.isFinite(naive)) return null;
  const candidates = [60, 120]
    .map((offset) => new Date(naive - offset * 60000))
    .filter((date) => {
      const p = Object.fromEntries(
        partsFormatter
          .formatToParts(date)
          .map((part) => [part.type, part.value]),
      );
      return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}` === value;
    });
  return candidates.length === 1 ? candidates[0].toISOString() : null;
}
const localDate = z
  .string()
  .min(1, "Indica la fecha y la hora.")
  .refine(
    (value) => madridInstant(value) !== null,
    "Indica una fecha y hora peninsular válida. Evita la hora repetida del cambio de horario.",
  );
export const availabilityInputSchema = z
  .object({ start: localDate, end: localDate })
  .superRefine((value, context) => {
    const start = madridInstant(value.start),
      end = madridInstant(value.end);
    if (!start || !end) return;
    const duration = Date.parse(end) - Date.parse(start);
    if (duration <= 0)
      context.addIssue({
        code: "custom",
        path: ["end"],
        message: "El fin debe ser posterior al inicio.",
      });
    if (duration > 31 * 86400000)
      context.addIssue({
        code: "custom",
        path: ["end"],
        message: "Cada franja puede durar como máximo 31 días.",
      });
  });
export const deleteAvailabilitySchema = z.object({
  id: z.uuid("La franja no es válida."),
});
export const availabilitySlotSchema = z
  .object({
    id: z.uuid(),
    worker_id: z.uuid(),
    starts_at: z.iso.datetime({ offset: true }),
    ends_at: z.iso.datetime({ offset: true }),
  })
  .refine(
    (slot) => Date.parse(slot.ends_at) > Date.parse(slot.starts_at),
    "Rango de disponibilidad inválido.",
  );
export type AvailabilitySlot = z.infer<typeof availabilitySlotSchema>;
export type AvailabilityInput = z.infer<typeof availabilityInputSchema>;
export function chronologicalSlots(slots: AvailabilitySlot[]) {
  return [...slots].sort(
    (a, b) =>
      Date.parse(a.starts_at) - Date.parse(b.starts_at) ||
      a.id.localeCompare(b.id),
  );
}
export function formatAvailabilityDate(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    timeZone: availabilityZone,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
