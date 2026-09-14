import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  requireProfile: vi.fn(),
  getSnapshot: vi.fn(),
  setAvailable: vi.fn(),
  createAvailability: vi.fn(),
  revalidatePath: vi.fn(),
}));
vi.mock("@/features/auth/session", () => ({
  requireProfile: mocks.requireProfile,
}));
vi.mock("@/features/snapshot/server", () => ({
  getSnapshot: mocks.getSnapshot,
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));
vi.mock("@/features/availability/profile-command", () => ({
  setAvailable: mocks.setAvailable,
}));
vi.mock("@/features/availability/commands", () => ({
  createAvailability: mocks.createAvailability,
  deleteAvailability: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));
import { saveAvailable } from "@/features/availability/status-actions";
import { saveAvailability } from "@/features/availability/actions";
import { form, otherId } from "./jobs-fixtures";
const profile = {
  id: otherId,
  role: "worker",
  display_name: "Servidor QA",
  bio: "No sobrescribir",
  available: false,
};
beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireProfile.mockResolvedValue(profile);
  mocks.getSnapshot.mockResolvedValue({ availability: [] });
});
afterEach(() => vi.restoreAllMocks());
describe("worker availability status actions", () => {
  it.each(["on", "off"])(
    "saves %s using only server-read profile",
    async (available) => {
      await expect(
        saveAvailable(
          {},
          form({
            available,
            name: "Forged",
            bio: "Forged",
            worker_id: "Forged",
          }),
        ),
      ).rejects.toThrow("REDIRECT:/disponibilidad?result=status");
      expect(mocks.requireProfile).toHaveBeenCalledWith("worker");
      expect(mocks.setAvailable).toHaveBeenCalledExactlyOnceWith(
        {},
        profile,
        available === "on",
      );
      expect(mocks.createAvailability).not.toHaveBeenCalled();
      expect(mocks.getSnapshot).not.toHaveBeenCalled();
      expect(mocks.revalidatePath.mock.calls).toEqual([
        ["/inicio"],
        ["/disponibilidad"],
        ["/curros"],
      ]);
    },
  );
  it("denies business at guard", async () => {
    mocks.requireProfile.mockRejectedValue(new Error("REDIRECT:/inicio"));
    await expect(saveAvailable({}, form({ available: "on" }))).rejects.toThrow(
      "REDIRECT:/inicio",
    );
    expect(mocks.setAvailable).not.toHaveBeenCalled();
  });
  it.each(["", "true", "anything"])(
    "rejects malformed status %s",
    async (available) => {
      expect(await saveAvailable({}, form({ available }))).toHaveProperty(
        "error",
      );
      expect(mocks.setAvailable).not.toHaveBeenCalled();
    },
  );
  it("reports unconfirmed change without retry or raw logs", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.setAvailable.mockRejectedValue({
      code: "unknown",
      message: "private details",
    });
    const result = await saveAvailable({}, form({ available: "off" }));
    expect(result.error).toContain("No hemos podido confirmar");
    expect(mocks.setAvailable).toHaveBeenCalledOnce();
    expect(JSON.stringify(log.mock.calls)).not.toContain("private details");
  });
  it("restores OFF after adding a slot, without removing the slot", async () => {
    await expect(
      saveAvailability(
        {},
        form({ start: "2026-09-20T10:00", end: "2026-09-20T14:00" }),
      ),
    ).rejects.toThrow("REDIRECT:/disponibilidad?result=created");
    expect(mocks.createAvailability).toHaveBeenCalledOnce();
    expect(mocks.setAvailable).toHaveBeenCalledExactlyOnceWith(
      {},
      profile,
      false,
    );
    expect(mocks.createAvailability.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.setAvailable.mock.invocationCallOrder[0],
    );
  });
  it("does not restore OFF when profile was ON", async () => {
    mocks.requireProfile.mockResolvedValue({ ...profile, available: true });
    await expect(
      saveAvailability(
        {},
        form({ start: "2026-09-20T10:00", end: "2026-09-20T14:00" }),
      ),
    ).rejects.toThrow("REDIRECT:/disponibilidad?result=created");
    expect(mocks.setAvailable).not.toHaveBeenCalled();
  });
  it("partial success asks for refreshed state and never duplicates slot", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.setAvailable.mockRejectedValue(new Error("network"));
    await expect(
      saveAvailability(
        {},
        form({ start: "2026-09-20T10:00", end: "2026-09-20T14:00" }),
      ),
    ).rejects.toThrow("REDIRECT:/disponibilidad?result=check-status");
    expect(mocks.createAvailability).toHaveBeenCalledOnce();
    expect(mocks.setAvailable).toHaveBeenCalledOnce();
  });
  it("uncertain range creation refreshes actual status without replaying writes", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.createAvailability.mockRejectedValue(new Error("lost response"));
    await expect(
      saveAvailability(
        {},
        form({ start: "2026-09-20T10:00", end: "2026-09-20T14:00" }),
      ),
    ).rejects.toThrow("REDIRECT:/disponibilidad?result=check-create");
    expect(mocks.createAvailability).toHaveBeenCalledOnce();
    expect(mocks.setAvailable).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/disponibilidad");
  });
});
