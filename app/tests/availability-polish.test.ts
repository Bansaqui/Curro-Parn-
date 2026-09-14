import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { setAvailable } from "@/features/availability/profile-command";
import {
  availabilityMessage,
  availableWithoutSlots,
  unavailableMessage,
  nextAvailability,
  coversTurn,
} from "@/features/availability/status";
import {
  workerJobs,
  canSendInterest,
  interestLabel,
} from "@/features/jobs/interest/selectors";
import { workerSnapshot, application } from "./interest-fixtures";
import { job, otherId } from "./jobs-fixtures";
const profile = {
  id: otherId,
  role: "worker",
  display_name: "Profesional QA",
  bio: "Biografía que debe conservarse",
};
const slot = {
  id: job.id,
  worker_id: otherId,
  starts_at: job.starts_at,
  ends_at: job.ends_at,
};
function client(
  data: unknown = { ok: true, id: otherId },
  error: unknown = null,
) {
  const rpc = vi.fn().mockResolvedValue({ data, error });
  return {
    rpc,
    value: { rpc } as unknown as Pick<SupabaseClient<Database>, "rpc">,
  };
}
describe("availability status RPC", () => {
  it.each([true, false])(
    "sets available=%s and preserves name and bio",
    async (available) => {
      const c = client();
      const before = structuredClone(profile);
      await setAvailable(c.value, profile, available);
      expect(c.rpc).toHaveBeenCalledExactlyOnceWith("cp_command", {
        p_action: "profile",
        p_data: { name: profile.display_name, bio: profile.bio, available },
      });
      expect(profile).toEqual(before);
    },
  );
  it("OFF never sends deletion or replacement of availability ranges", async () => {
    const c = client();
    const slots = [slot];
    await setAvailable(c.value, profile, false);
    expect(slots).toEqual([slot]);
    expect(c.rpc.mock.calls).toEqual([
      [
        "cp_command",
        {
          p_action: "profile",
          p_data: {
            name: profile.display_name,
            bio: profile.bio,
            available: false,
          },
        },
      ],
    ]);
  });
  it("rejects business before RPC", async () => {
    const c = client();
    await expect(
      setAvailable(c.value, { ...profile, role: "business" }, true),
    ).rejects.toThrow();
    expect(c.rpc).not.toHaveBeenCalled();
  });
  it("does not treat another user's response as success", async () => {
    const c = client({ ok: true, id: job.id });
    await expect(setAvailable(c.value, profile, false)).rejects.toMatchObject({
      code: "AVAILABILITY_UNCONFIRMED",
    });
  });
  it("does not retry ambiguous response", async () => {
    const c = client(null);
    await expect(setAvailable(c.value, profile, true)).rejects.toThrow();
    expect(c.rpc).toHaveBeenCalledOnce();
  });
  it("propagates backend failure", async () => {
    const c = client(null, { code: "42501" });
    await expect(setAvailable(c.value, profile, true)).rejects.toEqual({
      code: "42501",
    });
  });
});
describe("availability presentation", () => {
  const now = Date.parse("2026-09-19T00:00:00Z");
  it("ON without ranges shows the exact warning", () =>
    expect(availabilityMessage(true, [], now)).toBe(availableWithoutSlots));
  it("OFF with ranges states they are kept", () =>
    expect(availabilityMessage(false, [slot], now)).toBe(unavailableMessage));
  it("ON with expired ranges does not promise matching", () =>
    expect(
      availabilityMessage(true, [slot], Date.parse("2026-09-22T00:00:00Z")),
    ).toContain("Tus franjas han terminado"));
  it("finds next own range without changing sort order in source", () => {
    const later = {
      ...slot,
      starts_at: "2026-09-21T08:00:00Z",
      ends_at: "2026-09-21T12:00:00Z",
    };
    const slots = [later, { ...slot, worker_id: job.id }, slot];
    expect(nextAvailability(slots, otherId, now)).toBe(slot);
    expect(slots[0]).toBe(later);
  });
  it("includes an ongoing range", () =>
    expect(
      nextAvailability([slot], otherId, Date.parse("2026-09-20T09:00:00Z")),
    ).toBe(slot));
  it("excludes ended ranges", () =>
    expect(
      nextAvailability([slot], otherId, Date.parse(slot.ends_at)),
    ).toBeUndefined());
  it("OFF still has a next range", () => {
    const s = workerSnapshot();
    s.profile.available = false;
    s.availability = [slot];
    expect(nextAvailability(s.availability, s.profile.id, now)).toEqual(slot);
  });
});
describe("turn coverage hints", () => {
  it("accepts exact coverage", () =>
    expect(coversTurn([slot], otherId, job.starts_at, job.ends_at)).toBe(true));
  it("rejects short coverage", () =>
    expect(
      coversTurn(
        [{ ...slot, ends_at: "2026-09-20T11:59:00Z" }],
        otherId,
        job.starts_at,
        job.ends_at,
      ),
    ).toBe(false));
  it("ignores foreign ranges", () =>
    expect(
      coversTurn(
        [{ ...slot, worker_id: job.id }],
        otherId,
        job.starts_at,
        job.ends_at,
      ),
    ).toBe(false));
  it("does not merge adjacent ranges when backend requires one full range", () =>
    expect(
      coversTurn(
        [
          { ...slot, ends_at: "2026-09-20T10:00:00Z" },
          { ...slot, starts_at: "2026-09-20T10:00:00Z" },
        ],
        otherId,
        job.starts_at,
        job.ends_at,
      ),
    ).toBe(false));
  it("marks uncovered job for adjust availability CTA", () =>
    expect(
      workerJobs(workerSnapshot(), Date.parse("2026-09-19T00:00:00Z"))[0]
        .availability,
    ).toBe("uncovered"));
  it("marks OFF even with coverage", () => {
    const s = workerSnapshot();
    s.profile.available = false;
    s.availability = [slot];
    expect(
      workerJobs(s, Date.parse("2026-09-19T00:00:00Z"))[0].availability,
    ).toBe("off");
  });
  it("marks covered when ON, without claiming capacity or overlap eligibility", () => {
    const s = workerSnapshot();
    s.availability = [slot];
    expect(
      workerJobs(s, Date.parse("2026-09-19T00:00:00Z"))[0].availability,
    ).toBe("covered");
  });
  it("retains interest sent regardless of insufficient coverage", () => {
    const s = workerSnapshot();
    s.applications = [application];
    const row = workerJobs(s, Date.parse("2026-09-19T00:00:00Z"))[0];
    expect(row.availability).toBe("uncovered");
    expect(interestLabel(row.application?.state)).toBe("Interés enviado");
    expect(canSendInterest(row.application?.state)).toBe(false);
  });
});
