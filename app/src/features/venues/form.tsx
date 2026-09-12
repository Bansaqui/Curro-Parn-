"use client";
import { ActionForm, Field, FieldError } from "@/components/ui/action-form";
import { Label } from "@/components/ui";
import { saveVenue } from "./actions";
export function VenueForm({
  businesses,
}: {
  businesses: { id: string; display_name: string }[];
}) {
  return (
    <ActionForm
      action={saveVenue}
      kind="venue"
      submit="Guardar local"
      pending="Guardando local…"
    >
      <div className="field">
        <Label htmlFor="businessId">Negocio</Label>
        <select name="businessId" id="businessId" className="input" required>
          {businesses.map((b) => (
            <option value={b.id} key={b.id}>
              {b.display_name}
            </option>
          ))}
        </select>
        <FieldError name="businessId" />
      </div>
      <Field
        name="name"
        label="Nombre del local"
        minLength={2}
        maxLength={120}
        required
      />
      <Field
        name="address"
        label="Dirección"
        autoComplete="street-address"
        minLength={3}
        maxLength={250}
        required
      />
      <Field
        name="city"
        label="Ciudad"
        value="Málaga"
        readOnly
        hint="El piloto comienza en Málaga."
      />
    </ActionForm>
  );
}
