import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  requireProfile: vi.fn(),
  getSnapshot: vi.fn(),
  applyToJob: vi.fn(),
  revalidatePath: vi.fn(),
}));
vi.mock("@/features/auth/session", () => ({
  requireProfile: mocks.requireProfile,
}));
vi.mock("@/features/snapshot/server", () => ({
  getSnapshot: mocks.getSnapshot,
}));
vi.mock("@/features/jobs/interest/commands", () => ({
  applyToJob: mocks.applyToJob,
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));
import { sendInterest } from "@/features/jobs/interest/actions";
import Page from "@/app/(app)/curros/page";
import { jobId, otherId, form } from "./jobs-fixtures";
import { application, workerSnapshot } from "./interest-fixtures";
beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-14T10:00:00Z"));
  mocks.requireProfile.mockResolvedValue(workerSnapshot().profile);
  mocks.getSnapshot.mockResolvedValue(workerSnapshot());
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});
describe("interest server authorization and outcomes", () => {
  it("worker can apply and refresh both screens", async () => {
    await expect(sendInterest({}, form({ jobId }))).rejects.toThrow(
      "REDIRECT:/curros?interest=sent",
    );
    expect(mocks.requireProfile).toHaveBeenCalledWith("worker");
    expect(mocks.applyToJob).toHaveBeenCalledExactlyOnceWith({}, jobId);
    expect(mocks.revalidatePath.mock.calls).toEqual([["/curros"], ["/inicio"]]);
  });
  it("business is denied by guard before data or writes", async () => {
    mocks.requireProfile.mockRejectedValue(new Error("REDIRECT:/inicio"));
    await expect(sendInterest({}, form({ jobId }))).rejects.toThrow(
      "REDIRECT:/inicio",
    );
    expect(mocks.getSnapshot).not.toHaveBeenCalled();
    expect(mocks.applyToJob).not.toHaveBeenCalled();
  });
  it("page uses worker guard", async () => {
    mocks.requireProfile.mockRejectedValue(new Error("REDIRECT:/inicio"));
    await expect(Page({ searchParams: Promise.resolve({}) })).rejects.toThrow(
      "REDIRECT:/inicio",
    );
    expect(mocks.requireProfile).toHaveBeenCalledWith("worker");
    expect(mocks.getSnapshot).not.toHaveBeenCalled();
  });
  it.each(["bad", ""])("rejects invalid jobId %s", async (jobId) => {
    expect(await sendInterest({}, form({ jobId }))).toHaveProperty("error");
    expect(mocks.applyToJob).not.toHaveBeenCalled();
  });
  it("rejects forged job id missing from snapshot", async () => {
    expect(await sendInterest({}, form({ jobId: otherId }))).toHaveProperty(
      "error",
    );
    expect(mocks.applyToJob).not.toHaveBeenCalled();
  });
  it.each(["cancelled", "specialty", "past"])(
    "rechecks %s on server",
    async (mode) => {
      const s = workerSnapshot();
      if (mode === "cancelled")
        s.jobs[0] = { ...s.jobs[0], state: "cancelled" };
      if (mode === "specialty") s.profile.specialty = "Bartender";
      if (mode === "past")
        s.jobs[0] = { ...s.jobs[0], starts_at: "2026-09-13T10:00:00Z" };
      mocks.getSnapshot.mockResolvedValue(s);
      expect(await sendInterest({}, form({ jobId }))).toHaveProperty("error");
      expect(mocks.applyToJob).not.toHaveBeenCalled();
    },
  );
  it.each(["applied", "selected"] as const)(
    "does not mutate an existing %s application",
    async (state) => {
      const s = workerSnapshot();
      s.applications = [{ ...application, state }];
      mocks.getSnapshot.mockResolvedValue(s);
      await expect(sendInterest({}, form({ jobId }))).rejects.toThrow(
        "REDIRECT:/curros?interest=sent",
      );
      expect(mocks.applyToJob).not.toHaveBeenCalled();
    },
  );
  it.each(["rejected", "withdrawn"] as const)(
    "does not resubmit %s",
    async (state) => {
      const s = workerSnapshot();
      s.applications = [{ ...application, state }];
      mocks.getSnapshot.mockResolvedValue(s);
      expect(await sendInterest({}, form({ jobId }))).toHaveProperty("error");
      expect(mocks.applyToJob).not.toHaveBeenCalled();
    },
  );
  it("invited application goes through apply", async () => {
    const s = workerSnapshot();
    s.applications = [{ ...application, state: "invited" }];
    mocks.getSnapshot.mockResolvedValue(s);
    await expect(sendInterest({}, form({ jobId }))).rejects.toThrow(
      "REDIRECT:/curros?interest=sent",
    );
    expect(mocks.applyToJob).toHaveBeenCalledOnce();
  });
  it.each([
    ["El Curro ya no admite candidaturas.", "ya no admite"],
    ["El profesional no es compatible o no está disponible.", "condiciones"],
    ["Falta disponibilidad para todo el turno.", "todo el turno"],
    ["Existe un turno solapado.", "conflicto de horario"],
    ["No quedan plazas.", "plazas disponibles"],
    ["Ya existe una candidatura para este Curro.", "Ya existe"],
  ])("maps backend rule %s", async (message, expected) => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.applyToJob.mockRejectedValue({ code: "P0001", message });
    expect((await sendInterest({}, form({ jobId }))).error).toContain(expected);
    expect(mocks.applyToJob).toHaveBeenCalledOnce();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
  it.each([
    "42501",
    "23505",
    "23P01",
    "P0001",
    "INTEREST_UNCONFIRMED",
    "unknown",
  ])("safely handles %s without retry or leaked details", async (code) => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.applyToJob.mockRejectedValue({ code, message: "private raw detail" });
    const result = await sendInterest({}, form({ jobId }));
    expect(result.error).toBeTruthy();
    expect(result.error).not.toContain("private");
    expect(JSON.stringify(log.mock.calls)).not.toContain("private");
    expect(mocks.applyToJob).toHaveBeenCalledOnce();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
    if (code === "INTEREST_UNCONFIRMED")
      expect(result.error).toContain("antes de intentarlo");
  });
});
