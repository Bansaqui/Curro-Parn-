"use client";
import { useState } from "react";
import Link from "next/link";
import { ActionForm, Field, FieldError } from "@/components/ui/action-form";
import { Label } from "@/components/ui";
import { specialties } from "@/lib/validation/schemas";
import { completeOnboarding } from "./actions";
export function OnboardingForm({
  termsVersion,
  privacyVersion,
}: {
  termsVersion: string;
  privacyVersion: string;
}) {
  const [role, setRole] = useState<"worker" | "business">("worker");
  return (
    <ActionForm
      action={completeOnboarding}
      kind="onboarding"
      submit="Continuar"
      pending="Preparando tu cuenta…"
    >
      <fieldset className="role-choice">
        <legend>¿Cómo quieres empezar?</legend>
        <div>
          {(
            [
              ["worker", "Soy profesional", "Quiero encontrar curro"],
              ["business", "Tengo un negocio", "Busco personal"],
            ] as const
          ).map(([value, title, description]) => (
            <label key={value} className={role === value ? "selected" : ""}>
              <input
                type="radio"
                name="role"
                value={value}
                checked={role === value}
                onChange={() => setRole(value)}
              />
              <span>
                <strong>{title}</strong>
                <small>{description}</small>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <Field
        name="displayName"
        label="Tu nombre personal"
        autoComplete="name"
        required
        minLength={2}
        maxLength={100}
      />
      {role === "worker" && (
        <div className="field">
          <Label htmlFor="specialty">Especialidad</Label>
          <select
            className="input"
            id="specialty"
            name="specialty"
            required
            defaultValue=""
          >
            <option value="" disabled>
              Elige tu especialidad
            </option>
            {specialties.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <FieldError name="specialty" />
        </div>
      )}
      <input type="hidden" name="termsVersion" value={termsVersion} />
      <input type="hidden" name="privacyVersion" value={privacyVersion} />
      <div className="legal-note">
        <strong>Piloto en desarrollo</strong>
        <p>
          Los documentos están en borrador y pendientes de revisión legal. Estas
          aceptaciones se registran para el piloto; no habilitan el lanzamiento
          a producción.
        </p>
      </div>
      <div className="acceptance">
        <label>
          <input
            type="checkbox"
            name="acceptTerms"
            required
            aria-describedby="acceptTerms-error"
          />
          He leído y acepto los Términos de uso
        </label>
        <Link href="/legal/terminos" target="_blank" rel="noopener noreferrer">
          Ver Términos de uso{" "}
          <span className="sr-only">(abre otra pestaña)</span>↗
        </Link>
        <small>Borrador · {termsVersion}</small>
        <FieldError name="acceptTerms" />
      </div>
      <div className="acceptance">
        <label>
          <input
            type="checkbox"
            name="acceptPrivacy"
            required
            aria-describedby="acceptPrivacy-error"
          />
          He leído y acepto la Política de privacidad
        </label>
        <Link
          href="/legal/privacidad"
          target="_blank"
          rel="noopener noreferrer"
        >
          Ver Política de privacidad{" "}
          <span className="sr-only">(abre otra pestaña)</span>↗
        </Link>
        <small>Borrador · {privacyVersion}</small>
        <FieldError name="acceptPrivacy" />
      </div>
    </ActionForm>
  );
}
