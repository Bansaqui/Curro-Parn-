import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  requireProfile: vi.fn(),
  getSnapshot: vi.fn(),
  decideApplication: vi.fn(),
  revalidatePath: vi.fn(),
}));
vi.mock("@/features/auth/session", () => ({
  requireProfile: mocks.requireProfile,
}));
vi.mock("@/features/snapshot/server", () => ({
  getSnapshot: mocks.getSnapshot,
}));
vi.mock("@/features/jobs/selection/commands", () => ({
  decideApplication: mocks.decideApplication,
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));
import { saveDecision } from "@/features/jobs/selection/actions";
import Page from "@/app/(app)/negocio/curros/[jobId]/candidaturas/page";
import { snapshot, form, jobId, otherId } from "./jobs-fixtures";
import { application } from "./interest-fixtures";
let s = snapshot();
const values = { jobId, applicationId: application.id, decision: "select" };
beforeEach(() => {
  vi.resetAllMocks();
  s = snapshot();
  s.jobs[0] = {
    ...s.jobs[0],
    starts_at: "2099-06-20T08:00:00Z",
    ends_at: "2099-06-20T16:00:00Z",
  };
  s.applications = [application];
  mocks.getSnapshot.mockResolvedValue(s);
});
it.each(["owner", "manager"] as const)(
  "%s selects through guarded action",
  async (role) => {
    s.businesses[0].member_role = role;
    await expect(saveDecision({}, form(values))).rejects.toThrow(
      `REDIRECT:/negocio/curros/${jobId}/candidaturas?result=selected`,
    );
    expect(mocks.requireProfile).toHaveBeenCalledWith("business");
    expect(mocks.decideApplication).toHaveBeenCalledExactlyOnceWith({}, values);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/curros");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/inicio");
  },
);
it("rejects and refreshes worker/business paths", async () => {
  await expect(
    saveDecision({}, form({ ...values, decision: "reject" })),
  ).rejects.toThrow("result=rejected");
  expect(mocks.decideApplication).toHaveBeenCalledExactlyOnceWith(
    {},
    { ...values, decision: "reject" },
  );
});
it.each(["select", "reject"])(
  "staff and foreign business cannot %s",
  async (decision) => {
    s.businesses[0].member_role = "staff";
    expect(
      await saveDecision({}, form({ ...values, decision })),
    ).toHaveProperty("error");
    s.businesses = [];
    expect(
      await saveDecision({}, form({ ...values, decision })),
    ).toHaveProperty("error");
    expect(mocks.decideApplication).not.toHaveBeenCalled();
  },
);
it("worker guard rejects before reading data", async () => {
  mocks.requireProfile.mockRejectedValue(new Error("DENIED"));
  await expect(saveDecision({}, form(values))).rejects.toThrow("DENIED");
  expect(mocks.getSnapshot).not.toHaveBeenCalled();
});
it.each([
  { applicationId: "invalid" },
  { applicationId: otherId },
  { jobId: otherId },
  { decision: "transition" },
])("rejects forged input %j", async (change) => {
  expect(await saveDecision({}, form({ ...values, ...change }))).toHaveProperty(
    "error",
  );
  expect(mocks.decideApplication).not.toHaveBeenCalled();
});
it.each(["selected", "withdrawn", "invited", "rejected"] as const)(
  "does not send select for stale %s",
  async (state) => {
    s.applications[0] = { ...application, state };
    expect(await saveDecision({}, form(values))).toHaveProperty("error");
    expect(mocks.decideApplication).not.toHaveBeenCalled();
  },
);
it("full job stops selection but allows rejection", async () => {
  s.jobs[0].occupied = s.jobs[0].slots;
  expect(await saveDecision({}, form(values))).toHaveProperty("error");
  expect(mocks.decideApplication).not.toHaveBeenCalled();
  await expect(
    saveDecision({}, form({ ...values, decision: "reject" })),
  ).rejects.toThrow("result=rejected");
});
it.each([
  new Error("lost response"),
  { code: "P0001", message: "No quedan plazas." },
])(
  "failed/ambiguous response %j refreshes and never retries",
  async (error) => {
    mocks.decideApplication.mockRejectedValue(error);
    expect(await saveDecision({}, form(values))).toHaveProperty("error");
    expect(mocks.decideApplication).toHaveBeenCalledOnce();
    expect(mocks.revalidatePath).toHaveBeenCalledWith(
      `/negocio/curros/${jobId}/candidaturas`,
    );
  },
);
it("page rejects foreign job ids and invalid UUIDs in server", async () => {
  for (const id of [otherId, "invalid"])
    await expect(
      Page({
        params: Promise.resolve({ jobId: id }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow("NOT_FOUND");
});
it.each(["owner", "manager", "staff"] as const)(
  "page permits %s reading",
  async (role) => {
    s.businesses[0].member_role = role;
    await expect(
      Page({
        params: Promise.resolve({ jobId }),
        searchParams: Promise.resolve({}),
      }),
    ).resolves.toBeTruthy();
  },
);
