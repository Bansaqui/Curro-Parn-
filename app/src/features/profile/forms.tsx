"use client";
import { useId } from "react";
import { ActionForm } from "@/components/ui/action-form";
import { specialties } from "@/lib/validation/schemas";
import { skills, type TrustProfile, type Experience } from "./schema";
import { saveProfile, saveExperience, removeExperience } from "./actions";
export function ProfileForm({ profile }: { profile: TrustProfile }) {
  const id = useId();
  return (
    <ActionForm
      action={saveProfile}
      submit="Guardar especialidades y habilidades"
    >
      <fieldset className="profile-options">
        <legend>Especialidades</legend>
        {specialties.map((s) => (
          <label key={s}>
            <input
              type="checkbox"
              name="specialties"
              value={s}
              defaultChecked={profile.specialties.some(
                (x) => x.specialty === s,
              )}
            />
            {s}
          </label>
        ))}
      </fieldset>
      <label className="label" htmlFor={id}>
        Especialidad principal
      </label>
      <select
        id={id}
        name="primary_specialty"
        className="input"
        defaultValue={
          profile.specialties.find((s) => s.is_primary)?.specialty ??
          profile.legacy_specialty
        }
      >
        {specialties.map((s) => (
          <option key={s}>{s}</option>
        ))}
      </select>
      <p className="muted">
        La compatibilidad con los Curros sigue usando tu especialidad inicial:{" "}
        {profile.legacy_specialty}. Estas nuevas especialidades todavía no
        cambian el matching.
      </p>
      <fieldset className="profile-options">
        <legend>Habilidades</legend>
        {skills.map((s) => (
          <label key={s}>
            <input
              type="checkbox"
              name="skills"
              value={s}
              defaultChecked={profile.skills.includes(s)}
            />
            {s}
          </label>
        ))}
      </fieldset>
    </ActionForm>
  );
}
export function ExperienceForm({ experience }: { experience?: Experience }) {
  const id = useId();
  return (
    <ActionForm
      action={saveExperience}
      submit={experience ? "Guardar experiencia" : "Añadir experiencia"}
    >
      {experience?.id && (
        <input type="hidden" name="id" value={experience.id} />
      )}
      <label className="label" htmlFor={id + "employer"}>
        Nombre del negocio
      </label>
      <input
        className="input"
        id={id + "employer"}
        name="employer_name"
        required
        minLength={2}
        maxLength={100}
        defaultValue={experience?.employer_name}
      />
      <label className="label" htmlFor={id + "role"}>
        Función o especialidad
      </label>
      <input
        className="input"
        id={id + "role"}
        name="role_label"
        required
        minLength={2}
        maxLength={100}
        defaultValue={experience?.role_label}
      />
      <label className="label" htmlFor={id + "start"}>
        Fecha de inicio
      </label>
      <input
        className="input"
        id={id + "start"}
        name="start_date"
        type="date"
        required
        defaultValue={experience?.start_date}
      />
      <label className="label" htmlFor={id + "end"}>
        Fecha de fin (opcional)
      </label>
      <input
        className="input"
        id={id + "end"}
        name="end_date"
        type="date"
        defaultValue={experience?.end_date ?? ""}
        aria-describedby={id + "hint"}
      />
      <small id={id + "hint"}>Déjala vacía si continúas en este negocio.</small>
      <label className="label" htmlFor={id + "description"}>
        Descripción breve (opcional)
      </label>
      <textarea
        className="input"
        id={id + "description"}
        name="description"
        maxLength={600}
        rows={3}
        defaultValue={experience?.description}
      />
    </ActionForm>
  );
}
export function RemoveExperienceForm({ id }: { id: string }) {
  return (
    <details className="profile-remove">
      <summary>Eliminar experiencia</summary>
      <p>Se eliminará esta experiencia de tu perfil.</p>
      <ActionForm
        action={removeExperience}
        submit="Confirmar eliminación"
        pending="Eliminando…"
      >
        <input type="hidden" name="id" value={id} />
      </ActionForm>
    </details>
  );
}
