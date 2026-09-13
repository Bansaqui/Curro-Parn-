"use client";
import { ActionForm, Field } from "@/components/ui/action-form";
import { saveAvailability, removeAvailability } from "./actions";
export function AvailabilityForm() {
  return (
    <ActionForm
      action={saveAvailability}
      kind="availability"
      submit="Añadir disponibilidad"
      pending="Añadiendo…"
    >
      <Field
        name="start"
        label="Fecha y hora de inicio"
        type="datetime-local"
        step={60}
        required
      />
      <Field
        name="end"
        label="Fecha y hora de fin"
        type="datetime-local"
        step={60}
        required
        hint="Hora peninsular (Europe/Madrid). Máximo 31 días por franja."
      />
    </ActionForm>
  );
}
export function RemoveAvailabilityForm({ id }: { id: string }) {
  return (
    <ActionForm
      action={removeAvailability}
      submit="Eliminar franja"
      pending="Eliminando…"
    >
      <input type="hidden" name="id" value={id} />
    </ActionForm>
  );
}
