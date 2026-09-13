import { beforeEach, describe, expect, it, vi } from "vitest";
const { getUser, maybeSingle, eq } = vi.hoisted(() => ({
  getUser: vi.fn(),
  maybeSingle: vi.fn(),
  eq: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser },
    from: () => ({ select: () => ({ eq }) }),
  }),
}));
vi.mock("@/lib/supabase/env", () => ({
  publicConfig: () => ({ url: "https://example.supabase.co", key: "test" }),
}));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));
import { requireIdentity, requireProfile } from "@/features/auth/session";
beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({
    data: {
      user: {
        id: "user-id",
        email_confirmed_at: "2026-09-01",
        is_anonymous: false,
        user_metadata: { role: "business" },
      },
    },
    error: null,
  });
  eq.mockReturnValue({ maybeSingle });
});
describe("server identity and role guards", () => {
  it("allows worker on worker-only guard", async () => {
    maybeSingle.mockResolvedValue({ data: { role: "worker" }, error: null });
    await expect(requireProfile("worker")).resolves.toMatchObject({
      role: "worker",
    });
  });
  it("rejects missing session", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    await expect(requireIdentity()).rejects.toThrow("REDIRECT:/login");
  });
  it("requires confirmed email", async () => {
    getUser.mockResolvedValue({
      data: { user: { id: "user-id", email_confirmed_at: null } },
      error: null,
    });
    await expect(requireIdentity()).rejects.toThrow(
      "REDIRECT:/confirmar-correo",
    );
  });
  it("redirects authenticated user without profile to onboarding", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    await expect(requireProfile()).rejects.toThrow("REDIRECT:/onboarding");
    expect(eq).toHaveBeenCalledWith("id", "user-id");
  });
  it("does not authorize worker from user_metadata business claim", async () => {
    maybeSingle.mockResolvedValue({ data: { role: "worker" }, error: null });
    await expect(requireProfile("business")).rejects.toThrow(
      "REDIRECT:/inicio",
    );
  });
  it("rejects business on a worker-only guard", async () => {
    maybeSingle.mockResolvedValue({ data: { role: "business" }, error: null });
    await expect(requireProfile("worker")).rejects.toThrow("REDIRECT:/inicio");
  });
  it("allows matching database role", async () => {
    maybeSingle.mockResolvedValue({ data: { role: "business" }, error: null });
    await expect(requireProfile("business")).resolves.toMatchObject({
      role: "business",
    });
  });
});
