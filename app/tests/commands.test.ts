import { describe, expect, it, vi } from "vitest";
import { createBusiness, createVenue, onboard } from "@/lib/supabase/commands";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
const id = "11111111-1111-4111-8111-111111111111";
function mockClient(error: unknown = null, data: unknown = { id }) {
  const rpc = vi.fn().mockResolvedValue({ data, error });
  return {
    rpc,
    client: { rpc } as unknown as Pick<SupabaseClient<Database>, "rpc">,
  };
}
describe("existing RPC contracts (no direct table inserts)", () => {
  it("onboards worker and both acceptances atomically", async () => {
    const { rpc, client } = mockClient();
    await onboard(client, {
      role: "worker",
      displayName: "Ana",
      specialty: "Bartender",
      acceptTerms: true,
      acceptPrivacy: true,
    });
    expect(rpc).toHaveBeenCalledWith("cp_onboard", {
      p_role: "worker",
      p_display_name: "Ana",
      p_specialty: "Bartender",
      p_accept_terms: true,
      p_accept_privacy: true,
    });
  });
  it("does not send specialty for business", async () => {
    const { rpc, client } = mockClient();
    await onboard(client, {
      role: "business",
      displayName: "Ana",
      acceptTerms: true,
      acceptPrivacy: true,
    });
    expect(rpc.mock.calls[0][1]).not.toHaveProperty("p_specialty");
  });
  it("uses create_business with original argument names", async () => {
    const { rpc, client } = mockClient();
    expect(
      await createBusiness(client, {
        legalName: "Costa SL",
        displayName: "Costa",
        taxId: "",
      }),
    ).toBe(id);
    expect(rpc).toHaveBeenCalledWith("cp_command", {
      p_action: "create_business",
      p_data: { legal_name: "Costa SL", display_name: "Costa", tax_id: "" },
    });
  });
  it("uses create_venue and leaves coordinates absent", async () => {
    const { rpc, client } = mockClient();
    await createVenue(client, {
      businessId: id,
      name: "Centro",
      address: "Calle Real 10",
      city: "Málaga",
    });
    expect(rpc).toHaveBeenCalledWith("cp_command", {
      p_action: "create_venue",
      p_data: {
        business_id: id,
        name: "Centro",
        address: "Calle Real 10",
        city: "Málaga",
      },
    });
  });
  it("propagates backend denial and rejects malformed success", async () => {
    const denied = mockClient({ code: "42501" });
    await expect(
      createBusiness(denied.client, {
        legalName: "Costa SL",
        displayName: "Costa",
        taxId: "",
      }),
    ).rejects.toEqual({ code: "42501" });
    const invalid = mockClient(null, { ok: true });
    await expect(
      createBusiness(invalid.client, {
        legalName: "Costa SL",
        displayName: "Costa",
        taxId: "",
      }),
    ).rejects.toMatchObject({ code: "SNAPSHOT" });
  });
});
