import { beforeEach, describe, expect, it, vi } from "vitest";
const { requireProfile, getSnapshot, createBusiness, createVenue } = vi.hoisted(
  () => ({
    requireProfile: vi.fn(),
    getSnapshot: vi.fn(),
    createBusiness: vi.fn(),
    createVenue: vi.fn(),
  }),
);
vi.mock("@/features/auth/session", () => ({ requireProfile }));
vi.mock("@/features/snapshot/server", () => ({ getSnapshot }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({}),
}));
vi.mock("@/lib/supabase/commands", () => ({ createBusiness, createVenue }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));
import { saveBusiness } from "@/features/businesses/actions";
import { saveVenue } from "@/features/venues/actions";
const id = "11111111-1111-4111-8111-111111111111";
function venueForm() {
  const form = new FormData();
  Object.entries({
    businessId: id,
    name: "Centro",
    address: "Calle Real 10",
    city: "Málaga",
  }).forEach(([k, v]) => form.set(k, v));
  return form;
}
beforeEach(() => {
  vi.clearAllMocks();
  requireProfile.mockResolvedValue({ role: "business" });
});
describe("server action authorization", () => {
  it("checks domain role before commands", async () => {
    requireProfile.mockRejectedValueOnce(new Error("REDIRECT:/inicio"));
    await expect(saveBusiness({}, new FormData())).rejects.toThrow(
      "REDIRECT:/inicio",
    );
    expect(requireProfile).toHaveBeenCalledWith("business");
    expect(createBusiness).not.toHaveBeenCalled();
  });
  it("denies staff venue creation even with a valid supplied business id", async () => {
    getSnapshot.mockResolvedValue({
      businesses: [{ id, member_role: "staff" }],
      venues: [],
    });
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await saveVenue({}, venueForm())).toMatchObject({
      error: "No tienes permiso para realizar esta acción.",
    });
    expect(createVenue).not.toHaveBeenCalled();
    spy.mockRestore();
  });
  it("rejects a forged business id outside active membership", async () => {
    getSnapshot.mockResolvedValue({
      businesses: [
        { id: "22222222-2222-4222-8222-222222222222", member_role: "owner" },
      ],
      venues: [],
    });
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await saveVenue({}, venueForm())).toHaveProperty("error");
    expect(createVenue).not.toHaveBeenCalled();
    spy.mockRestore();
  });
  it("creates venue for an authorized owner and redirects", async () => {
    getSnapshot.mockResolvedValue({
      businesses: [{ id, member_role: "owner" }],
      venues: [],
    });
    await expect(saveVenue({}, venueForm())).rejects.toThrow(
      "REDIRECT:/inicio",
    );
    expect(createVenue).toHaveBeenCalledOnce();
  });
});
