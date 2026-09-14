import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  requireProfile: vi.fn(),
  getSnapshot: vi.fn(),
  createAvailability: vi.fn(),
  deleteAvailability: vi.fn(),
  revalidatePath: vi.fn(),
}));
vi.mock("@/features/auth/session", () => ({
  requireProfile: mocks.requireProfile,
}));
vi.mock("@/features/snapshot/server", () => ({
  getSnapshot: mocks.getSnapshot,
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));
vi.mock("@/features/availability/commands", () => ({
  createAvailability: mocks.createAvailability,
  deleteAvailability: mocks.deleteAvailability,
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));
import {
  saveAvailability,
  removeAvailability,
} from "@/features/availability/actions";
const id = "11111111-1111-4111-8111-111111111111";
const worker = "22222222-2222-4222-8222-222222222222";
function form(values: Record<string, string>) {
  const form = new FormData();
  Object.entries(values).forEach(([key, value]) => form.set(key, value));
  return form;
}
const input = { start: "2026-09-20T10:00", end: "2026-09-20T14:00" };
beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireProfile.mockResolvedValue({ id: worker, role: "worker" });
  mocks.getSnapshot.mockResolvedValue({
    availability: [{ id, worker_id: worker }],
  });
});
describe("availability Server Actions", () => {
  it("allows worker creation and refreshes both screens", async () => {
    await expect(saveAvailability({}, form(input))).rejects.toThrow(
      "REDIRECT:/disponibilidad?result=created",
    );
    expect(mocks.requireProfile).toHaveBeenCalledWith("worker");
    expect(mocks.createAvailability).toHaveBeenCalledOnce();
    expect(mocks.revalidatePath.mock.calls).toEqual([
      ["/inicio"],
      ["/disponibilidad"],
      ["/curros"],
    ]);
  });
  it.each([saveAvailability, removeAvailability])(
    "enforces worker guard before every mutation",
    async (action) => {
      mocks.requireProfile.mockRejectedValue(new Error("REDIRECT:/inicio"));
      await expect(action({}, form({ ...input, id }))).rejects.toThrow(
        "REDIRECT:/inicio",
      );
      expect(mocks.requireProfile).toHaveBeenCalledWith("worker");
      expect(mocks.createAvailability).not.toHaveBeenCalled();
      expect(mocks.deleteAvailability).not.toHaveBeenCalled();
    },
  );
  it("invalid range never mutates", async () => {
    expect(
      await saveAvailability({}, form({ ...input, end: input.start })),
    ).toHaveProperty("fields.end");
    expect(mocks.createAvailability).not.toHaveBeenCalled();
  });
  it("enforces existing 100-slot limit", async () => {
    mocks.getSnapshot.mockResolvedValue({
      availability: Array.from({ length: 100 }, () => ({ worker_id: worker })),
    });
    expect(await saveAvailability({}, form(input))).toHaveProperty("error");
    expect(mocks.createAvailability).not.toHaveBeenCalled();
  });
  it("deletes owned slot and refreshes home", async () => {
    await expect(removeAvailability({}, form({ id }))).rejects.toThrow(
      "REDIRECT:/disponibilidad?result=deleted",
    );
    expect(mocks.deleteAvailability).toHaveBeenCalledWith({}, id);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/inicio");
  });
  it.each([
    { availability: [] },
    { availability: [{ id, worker_id: "someone-else" }] },
  ])("rejects missing or foreign slot", async ({ availability }) => {
    mocks.getSnapshot.mockResolvedValue({ availability });
    expect(await removeAvailability({}, form({ id }))).toHaveProperty("error");
    expect(mocks.deleteAvailability).not.toHaveBeenCalled();
  });
  it("rejects malformed delete id", async () => {
    expect(
      await removeAvailability({}, form({ id: "invalid" })),
    ).toHaveProperty("error");
    expect(mocks.deleteAvailability).not.toHaveBeenCalled();
  });
  it("shows safe Spanish errors without revalidating a failed mutation", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.createAvailability.mockRejectedValue({
      code: "23514",
      message: "raw database details",
    });
    expect(await saveAvailability({}, form(input))).toMatchObject({
      error: "Revisa los datos y las aceptaciones obligatorias.",
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
    expect(JSON.stringify(log.mock.calls)).not.toContain(
      "raw database details",
    );
    log.mockRestore();
  });
});
