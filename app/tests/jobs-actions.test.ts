import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  requireProfile: vi.fn(),
  getSnapshot: vi.fn(),
  publishJob: vi.fn(),
  revalidatePath: vi.fn(),
}));
vi.mock("@/features/auth/session", () => ({
  requireProfile: mocks.requireProfile,
}));
vi.mock("@/features/snapshot/server", () => ({
  getSnapshot: mocks.getSnapshot,
}));
vi.mock("@/features/jobs/commands", () => ({ publishJob: mocks.publishJob }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));
import { saveJob } from "@/features/jobs/actions";
import Page from "@/app/(app)/negocio/curros/nuevo/page";
import { input, snapshot, form, otherId } from "./jobs-fixtures";
beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-14T10:00:00Z"));
  mocks.requireProfile.mockResolvedValue(snapshot().profile);
  mocks.getSnapshot.mockResolvedValue(snapshot());
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});
describe("publication server boundaries", () => {
  it.each(["owner", "manager"] as const)(
    "publishes for %s and revalidates",
    async (role) => {
      const s = snapshot();
      s.businesses[0].member_role = role;
      mocks.getSnapshot.mockResolvedValue(s);
      await expect(saveJob({}, form(input))).rejects.toThrow(
        "REDIRECT:/inicio?published=1",
      );
      expect(mocks.requireProfile).toHaveBeenCalledWith("business");
      expect(mocks.publishJob).toHaveBeenCalledExactlyOnceWith({}, input);
      expect(mocks.revalidatePath.mock.calls).toEqual([
        ["/inicio"],
        ["/negocio/curros/nuevo"],
      ]);
    },
  );
  it("rejects worker before reading data or mutating", async () => {
    mocks.requireProfile.mockRejectedValue(new Error("REDIRECT:/inicio"));
    await expect(saveJob({}, form(input))).rejects.toThrow("REDIRECT:/inicio");
    expect(mocks.getSnapshot).not.toHaveBeenCalled();
    expect(mocks.publishJob).not.toHaveBeenCalled();
  });
  it("guards page with business profile before loading data", async () => {
    mocks.requireProfile.mockRejectedValue(new Error("REDIRECT:/inicio"));
    await expect(Page()).rejects.toThrow("REDIRECT:/inicio");
    expect(mocks.requireProfile).toHaveBeenCalledWith("business");
    expect(mocks.getSnapshot).not.toHaveBeenCalled();
  });
  it.each(["staff", "absent", "inactiveVenue", "foreignVenue"])(
    "rejects %s at mutation time",
    async (mode) => {
      const s = snapshot();
      if (mode === "staff") s.businesses[0].member_role = "staff";
      if (mode === "absent") s.businesses = [];
      if (mode === "inactiveVenue") s.venues[0].active = false;
      if (mode === "foreignVenue") s.venues[0].business_id = otherId;
      mocks.getSnapshot.mockResolvedValue(s);
      expect(await saveJob({}, form(input))).toHaveProperty("error");
      expect(mocks.publishJob).not.toHaveBeenCalled();
    },
  );
  it("returns field errors for past start without invoking RPC", async () => {
    const result = await saveJob(
      {},
      form({ ...input, start: "2026-09-10T10:00" }),
    );
    expect(result.fields?.start).toContain("El inicio debe ser futuro.");
    expect(mocks.publishJob).not.toHaveBeenCalled();
  });
  it.each(["42501", "23514", "P0001", "PUBLISH_UNCONFIRMED", "unknown"])(
    "handles backend error %s safely without success or raw logs",
    async (code) => {
      const log = vi.spyOn(console, "error").mockImplementation(() => {});
      mocks.publishJob.mockRejectedValue({
        code,
        message: "private raw details",
      });
      const result = await saveJob({}, form(input));
      expect(result.error).toBeTruthy();
      expect(result.error).not.toContain("private");
      expect(mocks.revalidatePath).not.toHaveBeenCalled();
      expect(JSON.stringify(log.mock.calls)).not.toContain(
        "private raw details",
      );
      if (code === "PUBLISH_UNCONFIRMED")
        expect(result.error).toContain("antes de volver");
    },
  );
});
