import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import {
  availabilityInputSchema,
  madridInstant,
  chronologicalSlots,
} from "@/features/availability/schema";
import { snapshotSchema } from "@/features/snapshot/schema";
import {
  createAvailability,
  deleteAvailability,
} from "@/features/availability/commands";
const id = "11111111-1111-4111-8111-111111111111";
const worker = "22222222-2222-4222-8222-222222222222";
const slot = {
  id,
  worker_id: worker,
  starts_at: "2026-09-20T08:00:00+00:00",
  ends_at: "2026-09-20T12:00:00+00:00",
};
const snapshot = {
  profile: {
    id: worker,
    role: "worker",
    display_name: "QA",
    specialty: "Bartender",
    available: true,
  },
  jobs: [],
  businesses: [],
  venues: [],
  availability: [slot],
};
const valid = { start: "2026-09-20T10:00", end: "2026-09-20T14:00" };
function client(data: unknown = { ok: true, id }, error: unknown = null) {
  const rpc = vi.fn().mockResolvedValue({ data, error });
  return {
    rpc,
    value: { rpc } as unknown as Pick<SupabaseClient<Database>, "rpc">,
  };
}
describe("availability validation and snapshot", () => {
  it("accepts valid range", () =>
    expect(availabilityInputSchema.safeParse(valid).success).toBe(true));
  it.each([
    { start: "", end: valid.end },
    { start: valid.start, end: "" },
    { ...valid, end: valid.start },
    { ...valid, end: "2026-09-19T14:00" },
    { ...valid, end: "2026-11-20T14:00" },
    { start: "2026-02-30T10:00", end: valid.end },
  ])("rejects invalid range %j", (range) =>
    expect(availabilityInputSchema.safeParse(range).success).toBe(false),
  );
  it("resolves summer and winter independently of machine TZ", () => {
    expect(madridInstant(valid.start)).toBe("2026-09-20T08:00:00.000Z");
    expect(madridInstant("2026-12-20T10:00")).toBe("2026-12-20T09:00:00.000Z");
  });
  it("rejects nonexistent and ambiguous DST hours", () => {
    expect(madridInstant("2026-03-29T02:30")).toBeNull();
    expect(madridInstant("2026-10-25T02:30")).toBeNull();
  });
  it("parses only required availability data", () => {
    expect(snapshotSchema.parse(snapshot).availability).toEqual([slot]);
    expect(
      snapshotSchema.parse({ ...snapshot, availability: [] }).availability,
    ).toEqual([]);
  });
  it.each([
    { ...slot, id: "invalid" },
    { ...slot, worker_id: "invalid" },
    { ...slot, starts_at: "2026-09-20T10:00" },
    { ...slot, ends_at: slot.starts_at },
  ])("rejects malformed snapshot slot %j", (value) =>
    expect(
      snapshotSchema.safeParse({ ...snapshot, availability: [value] }).success,
    ).toBe(false),
  );
  it("does not hide a missing snapshot availability property", () =>
    expect(
      snapshotSchema.safeParse({ ...snapshot, availability: undefined })
        .success,
    ).toBe(false));
  it("sorts by instant without modifying input", () => {
    const earlier = { ...slot, starts_at: "2026-09-19T08:00:00Z" };
    const input = [slot, earlier];
    expect(chronologicalSlots(input)).toEqual([earlier, slot]);
    expect(input[0]).toBe(slot);
  });
});
describe("existing availability RPC", () => {
  it("creates through cp_command with UTC instants and no worker id", async () => {
    const mock = client();
    await createAvailability(mock.value, valid);
    expect(mock.rpc).toHaveBeenCalledWith("cp_command", {
      p_action: "availability",
      p_data: {
        starts_at: "2026-09-20T08:00:00.000Z",
        ends_at: "2026-09-20T12:00:00.000Z",
      },
    });
  });
  it("deletes using delete_id and accepts existing null-id response", async () => {
    const mock = client({ ok: true, id: null });
    await deleteAvailability(mock.value, id);
    expect(mock.rpc).toHaveBeenCalledWith("cp_command", {
      p_action: "availability",
      p_data: { delete_id: id },
    });
  });
  it("does not call RPC for an invalid range", async () => {
    const mock = client();
    await expect(
      createAvailability(mock.value, { ...valid, end: valid.start }),
    ).rejects.toThrow();
    expect(mock.rpc).not.toHaveBeenCalled();
  });
  it("propagates backend authorization errors", async () => {
    const mock = client(null, { code: "42501" });
    await expect(deleteAvailability(mock.value, id)).rejects.toEqual({
      code: "42501",
    });
  });
  it("does not report malformed RPC response as success", async () => {
    const mock = client({ ok: false });
    await expect(deleteAvailability(mock.value, id)).rejects.toMatchObject({
      code: "SNAPSHOT",
    });
  });
});
