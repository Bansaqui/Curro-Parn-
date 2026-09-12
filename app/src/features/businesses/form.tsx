"use client";
import { ActionForm, Field } from "@/components/ui/action-form";
import { saveBusiness } from "./actions";
export function BusinessForm() {
  return (
    <ActionForm
      action={saveBusiness}
      kind="business"
      submit="Continuar al local"
      pending="Creando negocio…"
    >
      <Field
        name="legalName"
        label="Nombre legal"
        autoComplete="organization"
        minLength={2}
        maxLength={160}
        required
      />
      <Field
        name="displayName"
        label="Nombre comercial"
        minLength={2}
        maxLength={120}
        required
      />
      <Field
        name="taxId"
        label="NIF / CIF (opcional)"
        maxLength={32}
        hint="Puedes dejarlo vacío en esta fase."
      />
    </ActionForm>
  );
}
