import { chronologicalSlots, type AvailabilitySlot } from "./schema";
export const availableWithoutSlots =
  "Estás disponible, pero aún no sabemos cuándo. Añade al menos una franja para encontrar Curros compatibles.";
export const unavailableMessage =
  "Ahora estás fuera del matching. Tus horarios seguirán guardados.";
export function availabilityMessage(
  available: boolean,
  slots: AvailabilitySlot[],
  now = Date.now(),
) {
  if (!available) return unavailableMessage;
  if (!slots.length) return availableWithoutSlots;
  if (!slots.some((s) => Date.parse(s.ends_at) > now))
    return "Tus franjas han terminado. Añade nuevos horarios para encontrar Curros compatibles.";
  return "Quieres recibir Curros. Tus franjas indican cuándo puedes trabajar; las condiciones de cada Curro se comprueban al enviar tu interés.";
}
export function nextAvailability(
  slots: AvailabilitySlot[],
  workerId: string,
  now = Date.now(),
) {
  return chronologicalSlots(
    slots.filter(
      (s) => s.worker_id === workerId && Date.parse(s.ends_at) > now,
    ),
  )[0];
}
export function coversTurn(
  slots: AvailabilitySlot[],
  workerId: string,
  start: string,
  end: string,
) {
  // The existing apply RPC requires one range covering the entire turn, not a union.
  return slots.some(
    (s) =>
      s.worker_id === workerId &&
      Date.parse(s.starts_at) <= Date.parse(start) &&
      Date.parse(s.ends_at) >= Date.parse(end),
  );
}
