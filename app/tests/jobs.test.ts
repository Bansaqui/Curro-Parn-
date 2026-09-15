import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import {
  eurosToCents,
  publishInputSchema,
  jobSchema,
} from "@/features/jobs/schema";
import {
  canPublishAt,
  ownJobs,
  publishingOptions,
} from "@/features/jobs/access";
import { publishJob } from "@/features/jobs/commands";
import { snapshotSchema } from "@/features/snapshot/schema";
import {
  input,
  job,
  jobId,
  businessId,
  venueId,
  otherId,
  snapshot,
} from "./jobs-fixtures";
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-14T10:00:00Z"));
});
afterEach(() => vi.useRealTimers());
describe("publication input", () => {
  it("accepts valid publication", () =>
    expect(publishInputSchema.safeParse(input).success).toBe(true));
  it.each([
    { title: "ab" },
    { title: " " },
    { title: "x".repeat(121) },
    { description: "x".repeat(2001) },
    { start: "" },
    { end: "" },
    { end: input.start },
    { end: "2026-09-19T14:00" },
    { start: "2026-09-13T10:00", end: "2026-09-13T14:00" },
    { start: "2026-09-14T12:00", end: "2026-09-14T14:00" },
    { end: "2026-09-21T04:01" },
    { start: "2026-02-30T10:00" },
    { start: "2026-10-25T02:30", end: "2026-10-25T08:00" },
    { start: "2027-03-28T02:30", end: "2027-03-28T08:00" },
    { slots: "0" },
    { slots: "21" },
    { slots: "1.5" },
    { slots: "" },
    { payEuros: "0" },
    { payEuros: "-1" },
    { payEuros: "100000.01" },
    { payEuros: "" },
    { businessId: "invalid" },
    { venueId: "invalid" },
    { specialty: "Other" },
    { urgent: "true" },
  ])("rejects invalid fields %j", (changes) =>
    expect(publishInputSchema.safeParse({ ...input, ...changes }).success).toBe(
      false,
    ),
  );
  it("allows exactly 18 hours and 20 places", () =>
    expect(
      publishInputSchema.safeParse({
        ...input,
        end: "2026-09-21T04:00",
        slots: "20",
      }).success,
    ).toBe(true));
  it("allows omitted description", () =>
    expect(
      publishInputSchema.parse({ ...input, description: undefined })
        .description,
    ).toBe(""));
  it.each([
    ["85,50", 8550],
    ["85.50", 8550],
    ["0.29", 29],
    ["1,1", 110],
    ["12", 1200],
    ["0,01", 1],
    ["100000", 10000000],
    [" 80,05 ", 8005],
  ])("converts %s exactly", (value, cents) =>
    expect(eurosToCents(String(value))).toBe(cents),
  );
  it.each([
    "1.000",
    "1,000",
    "1.000,50",
    "1,000.50",
    "1e2",
    "Infinity",
    "NaN",
    "+10",
    "1.234",
    ".50",
    "0",
    "100001",
    "99999999999999999",
    "1 000",
    "1.",
  ])("rejects ambiguous or invalid money %s", (v) =>
    expect(eurosToCents(v)).toBeNull(),
  );
});
describe("snapshot and access", () => {
  it("parses required job fields only", () => {
    const result = snapshotSchema.parse({
      ...snapshot(),
      jobs: [{ ...job, description: "discarded", occupied: 1 }],
      applications: [],
    });
    expect(result.jobs).toEqual([{ ...job, occupied: 1 }]);
    expect(result.applications).toEqual([]);
  });
  it("rejects missing jobs", () =>
    expect(
      snapshotSchema.safeParse({ ...snapshot(), jobs: undefined }).success,
    ).toBe(false));
  it.each([
    { id: "bad" },
    { business_id: "bad" },
    { venue_id: null },
    { starts_at: "2026-09-20T10:00" },
    { ends_at: job.starts_at },
    { slots: 21 },
    { pay_cents: 1.2 },
    { urgent: "true" },
    { state: "invented" },
  ])("rejects malformed job %j", (change) =>
    expect(jobSchema.safeParse({ ...job, ...change }).success).toBe(false),
  );
  it.each(["owner", "manager"] as const)(
    "allows active %s returned by snapshot",
    (role) => {
      const s = snapshot();
      s.businesses[0].member_role = role;
      expect(canPublishAt(s, businessId, venueId)).toBe(true);
    },
  );
  it("rejects staff", () => {
    const s = snapshot();
    s.businesses[0].member_role = "staff";
    expect(canPublishAt(s, businessId, venueId)).toBe(false);
  });
  it("rejects worker even with forged memberships", () => {
    const s = snapshot();
    s.profile.role = "worker";
    expect(canPublishAt(s, businessId, venueId)).toBe(false);
    expect(ownJobs(s)).toEqual([]);
  });
  it("rejects absent membership (including inactive, omitted by backend)", () => {
    const s = snapshot();
    s.businesses = [];
    expect(canPublishAt(s, businessId, venueId)).toBe(false);
  });
  it("rejects foreign business", () =>
    expect(canPublishAt(snapshot(), otherId, venueId)).toBe(false));
  it("rejects missing venue", () =>
    expect(canPublishAt(snapshot(), businessId, otherId)).toBe(false));
  it("rejects inactive venue", () => {
    const s = snapshot();
    s.venues[0].active = false;
    expect(canPublishAt(s, businessId, venueId)).toBe(false);
    expect(publishingOptions(s).venues).toEqual([]);
  });
  it("rejects venue of another managed business", () => {
    const s = snapshot();
    s.businesses.push({ ...s.businesses[0], id: otherId });
    s.venues[0].business_id = otherId;
    expect(canPublishAt(s, businessId, venueId)).toBe(false);
  });
  it("lists only own memberships, upcoming first then history, without mutating snapshot", () => {
    const s = snapshot();
    const later = {
      ...job,
      id: otherId,
      starts_at: "2026-09-21T08:00:00Z",
      ends_at: "2026-09-21T12:00:00Z",
    };
    const past = {
      ...job,
      id: venueId,
      starts_at: "2026-09-10T08:00:00Z",
      ends_at: "2026-09-10T12:00:00Z",
    };
    const cancelled = { ...later, id: businessId, state: "cancelled" as const };
    s.jobs = [past, later, cancelled, job, { ...job, business_id: otherId }];
    expect(ownJobs(s)).toEqual([job, later, cancelled, past]);
    expect(s.jobs[0]).toBe(past);
  });
});
describe("publish RPC", () => {
  function client(
    data: unknown = { ok: true, id: jobId },
    error: unknown = null,
  ) {
    const rpc = vi.fn().mockResolvedValue({ data, error });
    return {
      rpc,
      value: { rpc } as unknown as Pick<SupabaseClient<Database>, "rpc">,
    };
  }
  it("sends only expected payload with cents, UTC and urgent flag", async () => {
    const c = client();
    expect(await publishJob(c.value, { ...input, urgent: "yes" })).toBe(jobId);
    expect(c.rpc).toHaveBeenCalledExactlyOnceWith("cp_command", {
      p_action: "publish",
      p_data: {
        business_id: businessId,
        venue_id: venueId,
        title: input.title,
        specialty: input.specialty,
        description: "",
        starts_at: "2026-09-20T08:00:00.000Z",
        ends_at: "2026-09-20T12:00:00.000Z",
        slots: 2,
        pay_cents: 8550,
        urgent: true,
      },
    });
  });
  it("does not send an invalid input", async () => {
    const c = client();
    await expect(
      publishJob(c.value, { ...input, slots: "21" }),
    ).rejects.toThrow();
    expect(c.rpc).not.toHaveBeenCalled();
  });
  it("propagates backend permission rejection", async () => {
    const c = client(null, { code: "42501" });
    await expect(publishJob(c.value, input)).rejects.toEqual({ code: "42501" });
  });
  it("does not treat malformed response as success", async () => {
    const c = client({ ok: true, id: null });
    await expect(publishJob(c.value, input)).rejects.toMatchObject({
      code: "PUBLISH_UNCONFIRMED",
    });
  });
});
