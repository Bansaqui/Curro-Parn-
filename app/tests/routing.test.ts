import { describe, expect, it } from "vitest";
import { safeNext, isProtectedPath } from "@/lib/utils/redirects";
import {
  homeDestination,
  managedBusinesses,
  type Snapshot,
} from "@/features/snapshot/schema";
const snapshot: Snapshot = {
  profile: {
    id: "11111111-1111-4111-8111-111111111111",
    role: "business",
    display_name: "Ana",
    specialty: null,
    available: false,
  },
  businesses: [],
  venues: [],
};
const business = {
  id: "22222222-2222-4222-8222-222222222222",
  display_name: "Costa",
  legal_name: "Costa SL",
  member_role: "owner" as const,
};
describe("safe routing", () => {
  it.each([
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "/inicio?next=https://evil.example",
    undefined,
    "/auth/callback",
  ])("rejects untrusted destination %s", (value) => {
    expect(safeNext(value)).toBe("/inicio");
  });
  it("preserves approved recovery destination", () => {
    expect(safeNext("/actualizar-password")).toBe("/actualizar-password");
  });
  it("protects descendants without matching unrelated routes", () => {
    expect(isProtectedPath("/negocio/nuevo/x")).toBe(true);
    expect(isProtectedPath("/onboarding-evil")).toBe(false);
    expect(isProtectedPath("/registro")).toBe(false);
  });
  it("routes businesses through setup", () => {
    expect(homeDestination(snapshot)).toBe("/negocio/nuevo");
    expect(homeDestination({ ...snapshot, businesses: [business] })).toBe(
      "/negocio/local/nuevo",
    );
  });
  it("does not trap staff in a forbidden venue creation loop", () => {
    const staff = {
      ...snapshot,
      businesses: [{ ...business, member_role: "staff" as const }],
    };
    expect(homeDestination(staff)).toBe("/inicio");
    expect(managedBusinesses(staff)).toEqual([]);
  });
  it("workers always reach home", () => {
    expect(
      homeDestination({
        ...snapshot,
        profile: {
          ...snapshot.profile,
          role: "worker",
          specialty: "Bartender",
        },
      }),
    ).toBe("/inicio");
  });
  it("active venue completes setup, inactive does not", () => {
    const ready = {
      ...snapshot,
      businesses: [business],
      venues: [
        {
          id: "33333333-3333-4333-8333-333333333333",
          business_id: business.id,
          name: "Centro",
          address: "Calle Real 10",
          city: "Málaga",
          active: true,
        },
      ],
    };
    expect(homeDestination(ready)).toBe("/inicio");
    expect(
      homeDestination({
        ...ready,
        venues: [{ ...ready.venues[0], active: false }],
      }),
    ).toBe("/negocio/local/nuevo");
  });
});
