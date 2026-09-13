"use client";
import { useState } from "react";
import { Label } from "@/components/ui";
import { ActionForm, Field, FieldError } from "@/components/ui/action-form";
import { specialties } from "@/lib/validation/schemas";
import { saveJob } from "./actions";
export function JobForm({
  businesses,
  venues,
}: {
  businesses: { id: string; display_name: string }[];
  venues: { id: string; business_id: string; name: string }[];
}) {
  const [businessId, setBusinessId] = useState(businesses[0]?.id ?? "");
  const localVenues = venues.filter((v) => v.business_id === businessId);
  return (
    <ActionForm
      action={saveJob}
      kind="publish"
      submit="Publicar Curro"
      pending="Publicando…"
    >
      <div className="field">
        <Label htmlFor="businessId">Negocio</Label>
        <select
          className="input"
          name="businessId"
          id="businessId"
          required
          value={businessId}
          onChange={(e) => setBusinessId(e.target.value)}
          aria-describedby="businessId-error"
        >
          {businesses.map((b) => (
            <option key={b.id} value={b.id}>
              {b.display_name}
            </option>
          ))}
        </select>
        <FieldError name="businessId" />
      </div>
      <div className="field">
        <Label htmlFor="venueId">Local</Label>
        <select
          key={businessId}
          className="input"
          name="venueId"
          id="venueId"
          required
          defaultValue=""
          aria-describedby="venueId-error"
        >
          <option value="" disabled>
            Selecciona un local
          </option>
          {localVenues.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
        <FieldError name="venueId" />
      </div>
      <Field
        name="title"
        label="Título del Curro"
        required
        minLength={3}
        maxLength={120}
      />
      <div className="field">
        <Label htmlFor="specialty">Especialidad</Label>
        <select
          className="input"
          name="specialty"
          id="specialty"
          required
          defaultValue=""
          aria-describedby="specialty-error"
        >
          <option value="" disabled>
            Selecciona una especialidad
          </option>
          {specialties.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <FieldError name="specialty" />
      </div>
      <Field
        name="start"
        label="Fecha y hora de inicio"
        type="datetime-local"
        required
        step={60}
        hint="Horario peninsular (Europe/Madrid). El inicio debe ser futuro."
      />
      <Field
        name="end"
        label="Fecha y hora de fin"
        type="datetime-local"
        required
        step={60}
        hint="Horario peninsular. Duración máxima: 18 horas."
      />
      <Field
        name="slots"
        label="Número de plazas"
        type="number"
        inputMode="numeric"
        required
        min={1}
        max={20}
        step={1}
        defaultValue="1"
      />
      <Field
        name="payEuros"
        label="Remuneración (€)"
        type="text"
        inputMode="decimal"
        required
        maxLength={9}
        placeholder="Ej.: 85,50"
        hint="Importe en euros, hasta dos decimales. Acepta coma o punto, sin separadores de miles. Máximo: 100.000 €."
      />
      <div className="field">
        <Label htmlFor="description">Descripción (opcional)</Label>
        <textarea
          className="input job-description"
          name="description"
          id="description"
          maxLength={2000}
          rows={4}
          aria-describedby="description-error"
        />
        <FieldError name="description" />
      </div>
      <div className="field">
        <Label htmlFor="urgent">¿Es urgente?</Label>
        <select
          className="input"
          name="urgent"
          id="urgent"
          defaultValue="no"
          aria-describedby="urgent-error"
        >
          <option value="no">No</option>
          <option value="yes">Sí</option>
        </select>
        <FieldError name="urgent" />
      </div>
    </ActionForm>
  );
}
