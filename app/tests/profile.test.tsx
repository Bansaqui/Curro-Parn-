import { expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { TrustProfileView } from "@/features/profile/view";
import { ProfileForm, ExperienceForm } from "@/features/profile/forms";
import {
  profileSettingsSchema,
  experienceSchema,
  profileTrustSchema,
} from "@/features/profile/schema";
import {
  readTrustProfile,
  writeProfile,
  writeExperience,
  deleteExperience,
} from "@/features/profile/commands";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { trustProfile, experience } from "./profile-fixtures";
import { isProtectedPath, safeNext } from "@/lib/utils/redirects";
const settings = {
  specialties: ["Camarero/a" as const],
  primary_specialty: "Camarero/a" as const,
  skills: [],
};
it("parses command profile and rejects missing primary", () => {
  expect(profileTrustSchema.parse(trustProfile)).toEqual(trustProfile);
  expect(
    profileTrustSchema.safeParse({
      ...trustProfile,
      specialties: [{ specialty: "Camarero/a", is_primary: false }],
    }).success,
  ).toBe(false);
});
it.each(["", "2020-02-30", "2099-01-01", "2020-13-01"])(
  "rejects invalid date %s",
  (start_date) => {
    expect(
      experienceSchema.safeParse({
        employer_name: "Restaurante",
        role_label: "Sala",
        description: "",
        end_date: null,
        start_date,
      }).success,
    ).toBe(false);
  },
);
it("requires included primary and unique skills", () => {
  expect(
    profileSettingsSchema.safeParse({
      ...settings,
      primary_specialty: "Bartender",
    }).success,
  ).toBe(false);
  expect(
    profileSettingsSchema.safeParse({ ...settings, skills: ["Sala", "Sala"] })
      .success,
  ).toBe(false);
});
it("renders useful empty states without claiming verification", () => {
  const html = renderToStaticMarkup(
    <TrustProfileView profile={trustProfile} />,
  );
  expect(html).toContain("Nuevo en Curro");
  expect(html).toContain("Aún no hay experiencias");
  expect(html).toContain("Principal");
  expect(html).not.toContain("Editar experiencia");
});
it("business read-only hides editing; worker can edit declared only", () => {
  const profile = { ...trustProfile, experience: [experience] };
  expect(
    renderToStaticMarkup(<TrustProfileView profile={profile} />),
  ).not.toContain("Eliminar experiencia");
  expect(
    renderToStaticMarkup(<TrustProfileView profile={profile} editable />),
  ).toContain("Editar experiencia");
  expect(
    renderToStaticMarkup(
      <TrustProfileView
        profile={{
          ...profile,
          experience: [{ ...experience, verification_status: "verified" }],
        }}
        editable
      />,
    ),
  ).not.toContain("Editar experiencia");
});
it("existing workers do not get the new label", () => {
  expect(
    renderToStaticMarkup(
      <TrustProfileView profile={{ ...trustProfile, is_new: false }} />,
    ),
  ).not.toContain("Nuevo en Curro");
});
it("forms use controlled vocabulary, distinct labels and neutral experience", () => {
  const html = renderToStaticMarkup(
    <>
      <ProfileForm profile={trustProfile} />
      <ExperienceForm experience={experience} />
      <ExperienceForm />
    </>,
  );
  expect(html).toContain("Especialidad principal");
  expect(html).toContain("Coctelería");
  expect(html).not.toContain('name="verification_status"');
  expect(html).toContain('maxLength="600"');
  const ids = [...html.matchAll(/ id="([^"]+)"/g)].map((x) => x[1]);
  expect(new Set(ids).size).toBe(ids.length);
});
it("protects and permits login destination for own profile", () => {
  expect(isProtectedPath("/perfil")).toBe(true);
  expect(safeNext("/perfil")).toBe("/perfil");
});
it("routes all operations through cp_command with minimum payloads", async () => {
  const rpc = vi.fn().mockResolvedValue({ data: trustProfile, error: null });
  const client = { rpc } as unknown as SupabaseClient<Database>;
  expect(await readTrustProfile(client)).toEqual(trustProfile);
  expect(rpc).toHaveBeenLastCalledWith("cp_command", {
    p_action: "worker_profile",
    p_data: {},
  });
  await readTrustProfile(client, experience.id);
  expect(rpc).toHaveBeenLastCalledWith("cp_command", {
    p_action: "worker_profile",
    p_data: { application_id: experience.id },
  });
  rpc.mockResolvedValue({ data: { ok: true }, error: null });
  await writeProfile(client, settings);
  expect(rpc).toHaveBeenLastCalledWith("cp_command", {
    p_action: "worker_profile_save",
    p_data: settings,
  });
  const { verification_status: _, ...data } = experience;
  void _;
  await writeExperience(client, data);
  expect(rpc).toHaveBeenLastCalledWith("cp_command", {
    p_action: "worker_experience_save",
    p_data: data,
  });
  await deleteExperience(client, experience.id);
  expect(rpc).toHaveBeenLastCalledWith("cp_command", {
    p_action: "worker_experience_delete",
    p_data: { id: experience.id },
  });
  rpc.mockResolvedValue({ data: null, error: { code: "42501" } });
  await expect(readTrustProfile(client)).rejects.toMatchObject({
    code: "42501",
  });
});
