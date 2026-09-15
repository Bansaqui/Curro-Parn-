import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  requireProfile: vi.fn(),
  writeProfile: vi.fn(),
  writeExperience: vi.fn(),
  deleteExperience: vi.fn(),
  readTrustProfile: vi.fn(),
  getSnapshot: vi.fn(),
  revalidatePath: vi.fn(),
}));
vi.mock("@/features/auth/session", () => ({
  requireProfile: mocks.requireProfile,
}));
vi.mock("@/features/profile/commands", () => mocks);
vi.mock("@/features/snapshot/server", () => ({
  getSnapshot: mocks.getSnapshot,
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({
  redirect: (p: string) => {
    throw new Error("REDIRECT:" + p);
  },
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));
import {
  saveProfile,
  saveExperience,
  removeExperience,
} from "@/features/profile/actions";
import ProfilePage from "@/app/(app)/perfil/page";
import CandidatePage from "@/app/(app)/negocio/curros/[jobId]/candidaturas/[applicationId]/perfil/page";
import { trustProfile, experience } from "./profile-fixtures";
import { snapshot, jobId, otherId, form } from "./jobs-fixtures";
import { application } from "./interest-fixtures";
const settingForm = () =>
  form({ specialties: "Camarero/a", primary_specialty: "Camarero/a" });
beforeEach(() => {
  vi.resetAllMocks();
  mocks.readTrustProfile.mockResolvedValue(trustProfile);
  const s = snapshot();
  s.applications = [application];
  mocks.getSnapshot.mockResolvedValue(s);
});
it("worker saves own specialties through command and refreshes", async () => {
  await expect(saveProfile({}, settingForm())).rejects.toThrow("result=saved");
  expect(mocks.requireProfile).toHaveBeenCalledWith("worker");
  expect(mocks.writeProfile).toHaveBeenCalledExactlyOnceWith(
    {},
    {
      specialties: ["Camarero/a"],
      primary_specialty: "Camarero/a",
      skills: [],
    },
  );
  expect(mocks.revalidatePath).toHaveBeenCalledWith("/perfil");
});
it.each([saveProfile, saveExperience, removeExperience])(
  "role guard blocks mutation before command",
  async (action) => {
    mocks.requireProfile.mockRejectedValue(new Error("DENIED"));
    await expect(action({}, new FormData())).rejects.toThrow("DENIED");
    expect(mocks.writeProfile).not.toHaveBeenCalled();
    expect(mocks.writeExperience).not.toHaveBeenCalled();
    expect(mocks.deleteExperience).not.toHaveBeenCalled();
  },
);
it("validates fields before creating experience", async () => {
  expect(await saveExperience({}, form({ start_date: "bad" }))).toHaveProperty(
    "error",
  );
  expect(mocks.writeExperience).not.toHaveBeenCalled();
});
it("saves declared experience without accepting client verification data", async () => {
  await expect(
    saveExperience(
      {},
      form({ ...experience, end_date: "", verification_status: "verified" }),
    ),
  ).rejects.toThrow("result=saved");
  expect(mocks.writeExperience.mock.calls[0][1]).not.toHaveProperty(
    "verification_status",
  );
});
it("deletes own experience through backend", async () => {
  await expect(
    removeExperience({}, form({ id: experience.id })),
  ).rejects.toThrow("result=saved");
  expect(mocks.deleteExperience).toHaveBeenCalledWith({}, experience.id);
});
it("ambiguous insert refreshes and does not auto retry", async () => {
  mocks.writeExperience.mockRejectedValue(new Error("lost response"));
  await expect(
    saveExperience({}, form({ ...experience, end_date: "" })),
  ).rejects.toThrow("result=check");
  expect(mocks.writeExperience).toHaveBeenCalledTimes(1);
});
it("own page requires worker", async () => {
  await ProfilePage({ searchParams: Promise.resolve({}) });
  expect(mocks.requireProfile).toHaveBeenCalledWith("worker");
});
it.each(["owner", "manager", "staff"] as const)(
  "business %s reads only candidate context",
  async (role) => {
    const s = snapshot();
    s.businesses[0].member_role = role;
    s.applications = [application];
    mocks.getSnapshot.mockResolvedValue(s);
    await CandidatePage({
      params: Promise.resolve({ jobId, applicationId: application.id }),
    });
    expect(mocks.requireProfile).toHaveBeenCalledWith("business");
    expect(mocks.readTrustProfile).toHaveBeenCalledWith({}, application.id);
  },
);
it("foreign candidate denied before backend read", async () => {
  await expect(
    CandidatePage({
      params: Promise.resolve({ jobId, applicationId: otherId }),
    }),
  ).rejects.toThrow("NOT_FOUND");
  expect(mocks.readTrustProfile).not.toHaveBeenCalled();
});
it("backend permission denial remains authoritative", async () => {
  mocks.readTrustProfile.mockRejectedValue({ code: "42501" });
  await expect(
    CandidatePage({
      params: Promise.resolve({ jobId, applicationId: application.id }),
    }),
  ).rejects.toThrow("NOT_FOUND");
});
