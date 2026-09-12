import { describe, expect, it } from "vitest";
import {
  onboardingSchema,
  businessSchema,
  venueSchema,
  registerSchema,
  specialties,
} from "@/lib/validation/schemas";
const base = {
  displayName: "Ana López",
  acceptTerms: true,
  acceptPrivacy: true,
};
describe("onboarding domain validation", () => {
  it.each(specialties)("accepts supported specialty %s", (specialty) => {
    expect(
      onboardingSchema.safeParse({ ...base, role: "worker", specialty })
        .success,
    ).toBe(true);
  });
  it.each([undefined, "", "Recepcionista"])(
    "rejects missing or unsupported worker specialty %s",
    (specialty) => {
      expect(
        onboardingSchema.safeParse({ ...base, role: "worker", specialty })
          .success,
      ).toBe(false);
    },
  );
  it("business omits specialty", () => {
    expect(
      onboardingSchema.safeParse({ ...base, role: "business" }).success,
    ).toBe(true);
    expect(
      onboardingSchema.safeParse({
        ...base,
        role: "business",
        specialty: "Bartender",
      }).success,
    ).toBe(false);
  });
  it.each(["acceptTerms", "acceptPrivacy"])("requires explicit %s", (field) => {
    for (const value of [false, undefined, "true"])
      expect(
        onboardingSchema.safeParse({
          ...base,
          role: "business",
          [field]: value,
        }).success,
      ).toBe(false);
  });
  it("rejects roles outside the domain", () => {
    expect(onboardingSchema.safeParse({ ...base, role: "admin" }).success).toBe(
      false,
    );
  });
  it("rejects blank names", () => {
    expect(
      onboardingSchema.safeParse({
        ...base,
        role: "business",
        displayName: "  ",
      }).success,
    ).toBe(false);
  });
});
describe("registration and business inputs", () => {
  it("requires matching strong passwords and valid email", () => {
    const input = {
      email: "ana@example.com",
      password: "a-long-test-password",
      confirmPassword: "a-long-test-password",
    };
    expect(registerSchema.safeParse(input).success).toBe(true);
    for (const change of [
      { email: "no-email" },
      { password: "short" },
      { confirmPassword: "different" },
    ])
      expect(registerSchema.safeParse({ ...input, ...change }).success).toBe(
        false,
      );
  });
  it("tax identifier is optional, but bounded if entered", () => {
    const input = { legalName: "Costa SL", displayName: "Costa", taxId: "" };
    expect(businessSchema.safeParse(input).success).toBe(true);
    expect(businessSchema.safeParse({ ...input, taxId: "x" }).success).toBe(
      false,
    );
  });
  it("restricts venue to Málaga and validates business id", () => {
    const input = {
      businessId: "11111111-1111-4111-8111-111111111111",
      name: "Centro",
      address: "Calle Real 10",
      city: "Málaga",
    };
    expect(venueSchema.safeParse(input).success).toBe(true);
    expect(venueSchema.safeParse({ ...input, city: "Madrid" }).success).toBe(
      false,
    );
    expect(
      venueSchema.safeParse({ ...input, businessId: "attacker" }).success,
    ).toBe(false);
  });
});
