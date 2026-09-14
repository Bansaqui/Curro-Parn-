import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import {
  workerJobs,
  canSendInterest,
  interestLabel,
} from "@/features/jobs/interest/selectors";
import { applyToJob } from "@/features/jobs/interest/commands";
import { snapshotSchema } from "@/features/snapshot/schema";
import { applicationSchema } from "@/features/jobs/interest/schema";
import { job, jobId, otherId } from "./jobs-fixtures";
import { application, workerSnapshot } from "./interest-fixtures";
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-14T10:00:00Z"));
});
afterEach(() => vi.useRealTimers());
describe("worker job selectors", () => {
  it("allows compatible future jobs", () =>
    expect(workerJobs(workerSnapshot())).toEqual([
      { job, application: undefined, availability: "uncovered" },
    ]));
  it("rejects business", () => {
    const s = workerSnapshot();
    s.profile.role = "business";
    expect(workerJobs(s)).toEqual([]);
  });
  it.each([
    { state: "cancelled" as const },
    { specialty: "Bartender" as const },
    { starts_at: "2026-09-14T10:00:00Z" },
    { starts_at: "2026-09-13T10:00:00Z", ends_at: "2026-09-13T14:00:00Z" },
  ])("hides ineligible job %j", (change) => {
    const s = workerSnapshot();
    s.jobs = [{ ...job, ...change }];
    expect(workerJobs(s)).toEqual([]);
  });
  it("sorts by start, not urgency, and preserves input", () => {
    const s = workerSnapshot();
    const later = {
      ...job,
      id: otherId,
      starts_at: "2026-09-21T10:00:00Z",
      ends_at: "2026-09-21T14:00:00Z",
      urgent: true,
    };
    s.jobs = [later, job];
    expect(workerJobs(s).map((x) => x.job)).toEqual([job, later]);
    expect(s.jobs[0]).toBe(later);
  });
  it("does not duplicate eligibility rules for availability or overlaps", () => {
    const s = workerSnapshot();
    s.profile.available = false;
    s.availability = [];
    expect(workerJobs(s)).toHaveLength(1);
  });
  it.each(["applied", "selected"] as const)(
    "retains %s once with interest sent",
    (state) => {
      const s = workerSnapshot();
      s.applications = [{ ...application, state }];
      const entries = workerJobs(s);
      expect(entries).toHaveLength(1);
      expect(interestLabel(entries[0].application?.state)).toContain(
        "Interés enviado",
      );
      expect(canSendInterest(state)).toBe(false);
    },
  );
  it("ignores another worker's application", () => {
    const s = workerSnapshot();
    s.applications = [{ ...application, worker_id: jobId }];
    expect(workerJobs(s)[0].application).toBeUndefined();
  });
  it.each(["rejected", "withdrawn"] as const)(
    "does not allow a new application after %s",
    (state) => {
      expect(canSendInterest(state)).toBe(false);
      expect(interestLabel(state)).not.toContain("Interés enviado");
    },
  );
  it("allows converting an invitation through apply", () =>
    expect(canSendInterest("invited")).toBe(true));
});
describe("snapshot application parsing", () => {
  it("parses business name and own application subset", () => {
    const s = workerSnapshot();
    s.applications = [application];
    expect(snapshotSchema.parse(s).applications).toEqual([application]);
    expect(snapshotSchema.parse(s).jobs[0].business_name).toBe("Costa");
  });
  it("strips unused application fields", () =>
    expect(
      applicationSchema.parse({
        ...application,
        worker_name: "not needed",
        business_id: otherId,
      }),
    ).toEqual(application));
  it.each([
    { id: "bad" },
    { job_id: "bad" },
    { worker_id: "bad" },
    { state: "unknown" },
  ])("rejects malformed application %j", (change) =>
    expect(
      applicationSchema.safeParse({ ...application, ...change }).success,
    ).toBe(false),
  );
  it("rejects missing applications instead of showing a false empty state", () =>
    expect(
      snapshotSchema.safeParse({ ...workerSnapshot(), applications: undefined })
        .success,
    ).toBe(false));
  it("rejects missing business display name", () =>
    expect(
      snapshotSchema.safeParse({
        ...workerSnapshot(),
        jobs: [{ ...job, business_name: undefined }],
      }).success,
    ).toBe(false));
});
describe("apply command", () => {
  function client(
    data: unknown = { ok: true, id: application.id },
    error: unknown = null,
  ) {
    const rpc = vi.fn().mockResolvedValue({ data, error });
    return {
      rpc,
      value: { rpc } as unknown as Pick<SupabaseClient<Database>, "rpc">,
    };
  }
  it("sends exclusively job_id to cp_command apply", async () => {
    const c = client();
    expect(await applyToJob(c.value, jobId)).toBe(application.id);
    expect(c.rpc).toHaveBeenCalledExactlyOnceWith("cp_command", {
      p_action: "apply",
      p_data: { job_id: jobId },
    });
  });
  it("accepts unchanged response without ok", async () => {
    const c = client({ id: application.id, unchanged: true });
    expect(await applyToJob(c.value, jobId)).toBe(application.id);
    expect(c.rpc).toHaveBeenCalledOnce();
  });
  it("rejects invalid job id before calling RPC", async () => {
    const c = client();
    await expect(applyToJob(c.value, "bad")).rejects.toThrow();
    expect(c.rpc).not.toHaveBeenCalled();
  });
  it.each([
    { ok: false },
    { ok: true, id: null },
    { unchanged: false, id: application.id },
    { id: application.id },
  ])("rejects ambiguous response without retry %j", async (data) => {
    const c = client(data);
    await expect(applyToJob(c.value, jobId)).rejects.toMatchObject({
      code: "INTEREST_UNCONFIRMED",
    });
    expect(c.rpc).toHaveBeenCalledOnce();
  });
  it("propagates backend rejection without retry", async () => {
    const c = client(null, { code: "P0001", message: "No quedan plazas." });
    await expect(applyToJob(c.value, jobId)).rejects.toMatchObject({
      code: "P0001",
    });
    expect(c.rpc).toHaveBeenCalledOnce();
  });
});
