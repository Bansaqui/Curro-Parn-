import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import {
  candidateContext,
  canSelect,
  canReject,
  selectionEvidence,
} from "@/features/jobs/selection/selectors";
import {
  assignmentSchema,
  isActiveAssignment,
} from "@/features/jobs/selection/schema";
import { decideApplication } from "@/features/jobs/selection/commands";
import { selectionError } from "@/features/jobs/selection/errors";
import { snapshotSchema } from "@/features/snapshot/schema";
import { interestLabel, workerJobs } from "@/features/jobs/interest/selectors";
import { InterestForm } from "@/features/jobs/interest/form";
import { CandidateList } from "@/features/jobs/selection/list";
import { JobList } from "@/features/jobs/list";
import { snapshot, job, jobId, otherId, businessId } from "./jobs-fixtures";
import { application, workerSnapshot } from "./interest-fixtures";
const now = Date.parse("2026-09-14T10:00:00Z");
describe("candidate access and presentation", () => {
  it.each(["owner", "manager", "staff"] as const)(
    "%s access follows membership",
    (role) => {
      const s = snapshot();
      s.businesses[0].member_role = role;
      expect(candidateContext(s, jobId)?.canManage).toBe(role !== "staff");
    },
  );
  it("denies worker and foreign business", () => {
    expect(candidateContext(workerSnapshot(), jobId)).toBeNull();
    const s = snapshot();
    s.businesses = [];
    expect(candidateContext(s, jobId)).toBeNull();
  });
  it("filters job/business and orders oldest first with stable id tie break", () => {
    const s = snapshot();
    const a = { ...application, id: otherId },
      b = { ...application, id: businessId };
    const older = { ...application, created_at: "2026-09-13T00:00:00Z" };
    s.applications = [
      a,
      b,
      older,
      { ...application, job_id: otherId },
      { ...application, business_id: otherId },
    ];
    expect(candidateContext(s, jobId)?.applications).toEqual([older, b, a]);
    expect(s.applications[0]).toEqual(a);
  });
  it.each(["selected", "rejected", "withdrawn", "invited"] as const)(
    "cannot select %s",
    (state) => expect(canSelect(state, job, now)).toBe(false),
  );
  it("allows applied and prevents selecting full, started or cancelled job", () => {
    expect(canSelect("applied", job, now)).toBe(true);
    expect(canSelect("applied", { ...job, occupied: 2 }, now)).toBe(false);
    expect(canSelect("applied", job, Date.parse(job.starts_at))).toBe(false);
    expect(canSelect("applied", { ...job, state: "cancelled" }, now)).toBe(
      false,
    );
  });
  it.each(["applied", "invited", "selected", "withdrawn", "rejected"] as const)(
    "reject eligibility %s",
    (state) =>
      expect(canReject(state)).toBe(["applied", "invited"].includes(state)),
  );
  it("full jobs stay visible with candidature count and link", () => {
    const html = renderToStaticMarkup(
      createElement(JobList, {
        jobs: [{ ...job, occupied: 2 }],
        applications: [application],
      }),
    );
    expect(html).toContain("2 / 2 cubiertas");
    expect(html).toContain("1 candidaturas");
    expect(html).toContain("Ver candidaturas");
  });
  it("staff has no mutation forms", () => {
    const s = snapshot();
    s.businesses[0].member_role = "staff";
    s.applications = [application];
    const html = renderToStaticMarkup(
      createElement(CandidateList, { snapshot: s, jobId, now }),
    );
    expect(html).toContain("solo lectura");
    expect(html).not.toContain("<form");
    expect(html).toContain(application.worker_name);
  });
  it.each(["cancelled", "no_show", "replaced"] as const)(
    "%s is released, never a covered slot",
    (state) => {
      const s = snapshot();
      const assignment = {
        id: otherId,
        application_id: application.id,
        job_id: jobId,
        worker_id: application.worker_id,
        state,
      };
      s.assignments = [assignment];
      expect(isActiveAssignment(assignment)).toBe(false);
      expect(selectionEvidence(s, application)).toContain("liberada");
    },
  );
  it("missing assignment does not falsely confirm an active commitment", () =>
    expect(selectionEvidence(snapshot(), application)).toContain("no aparece"));
});
describe("strict snapshot additions", () => {
  it.each(["business_id", "worker_name", "created_at"])(
    "requires application %s",
    (key) => {
      expect(
        snapshotSchema.safeParse({
          ...snapshot(),
          applications: [{ ...application, [key]: undefined }],
        }).success,
      ).toBe(false);
    },
  );
  it("requires occupied and assignments", () => {
    expect(
      snapshotSchema.safeParse({ ...snapshot(), assignments: undefined })
        .success,
    ).toBe(false);
    expect(
      snapshotSchema.safeParse({
        ...snapshot(),
        jobs: [{ ...job, occupied: undefined }],
      }).success,
    ).toBe(false);
    expect(assignmentSchema.safeParse({ state: "unknown" }).success).toBe(
      false,
    );
  });
});
describe("worker outcomes", () => {
  it.each([
    ["applied", "Interés enviado"],
    ["selected", "Seleccionado"],
    ["rejected", "No seleccionado"],
    ["withdrawn", "Candidatura retirada"],
  ] as const)("%s has accurate text and no reapply", (state, label) => {
    expect(interestLabel(state)).toBe(label);
    const html = renderToStaticMarkup(
      createElement(InterestForm, { jobId, state }),
    );
    expect(html).toContain(label);
    expect(html).not.toContain("<form");
  });
  it("keeps rejected history even for past/cancelled jobs", () => {
    const s = workerSnapshot();
    s.jobs = [{ ...job, state: "cancelled" }];
    s.applications = [{ ...application, state: "rejected" }];
    expect(workerJobs(s, Date.parse(job.ends_at) + 1)).toHaveLength(1);
  });
});
describe("decision RPC", () => {
  function client(data: unknown, error: unknown = null) {
    const rpc = vi.fn().mockResolvedValue({ data, error });
    return {
      rpc,
      value: { rpc } as unknown as Pick<SupabaseClient<Database>, "rpc">,
    };
  }
  it.each(["select", "reject"] as const)(
    "%s sends only application_id once",
    async (decision) => {
      const c = client({ ok: true, id: application.id });
      await decideApplication(c.value, {
        jobId,
        applicationId: application.id,
        decision,
      });
      expect(c.rpc).toHaveBeenCalledExactlyOnceWith("cp_command", {
        p_action: decision,
        p_data: { application_id: application.id },
      });
    },
  );
  it("accepts idempotent selected response", async () => {
    const c = client({ unchanged: true, id: application.id });
    await expect(
      decideApplication(c.value, {
        jobId,
        applicationId: application.id,
        decision: "select",
      }),
    ).resolves.toMatchObject({ unchanged: true });
  });
  it.each([
    null,
    { ok: false },
    { ok: true, id: "bad" },
    { unchanged: true, id: otherId },
  ])("ambiguous response %j never retries", async (data) => {
    const c = client(data);
    await expect(
      decideApplication(c.value, {
        jobId,
        applicationId: application.id,
        decision: "select",
      }),
    ).rejects.toThrow();
    expect(c.rpc).toHaveBeenCalledOnce();
  });
  it("validates UUID before RPC", async () => {
    const c = client({});
    await expect(
      decideApplication(c.value, {
        jobId,
        applicationId: "bad",
        decision: "select",
      }),
    ).rejects.toThrow();
    expect(c.rpc).not.toHaveBeenCalled();
  });
  it.each([
    [
      { code: "P0001", message: "La disponibilidad ha cambiado." },
      "El profesional ya no está disponible para este horario.",
    ],
    [
      { code: "P0001", message: "No quedan plazas." },
      "Todas las plazas ya están cubiertas.",
    ],
    [
      { code: "23P01" },
      "El profesional ya tiene otro Curro confirmado en ese horario.",
    ],
  ])("maps known failure %j", (error, message) =>
    expect(selectionError(error)).toBe(message),
  );
  it("never exposes arbitrary SQL or logs", () =>
    expect(
      selectionError({ code: "P0001", message: "private SQL text" }),
    ).not.toContain("private SQL text"));
});
