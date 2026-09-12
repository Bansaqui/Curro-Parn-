import { beforeEach, describe, expect, it, vi } from "vitest";
const { auth } = vi.hoisted(() => ({
  auth: {
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    updateUser: vi.fn(),
    signOut: vi.fn(),
  },
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({ auth }),
}));
vi.mock("@/lib/supabase/env", () => ({
  publicConfig: () => ({ url: "https://example.supabase.co", key: "test" }),
}));
vi.mock("@/features/auth/session", () => ({
  requireIdentity: vi.fn().mockResolvedValue({ id: "test" }),
}));
vi.mock("@/features/auth/origin", () => ({
  appOrigin: () => "http://localhost:3000",
}));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));
import {
  register,
  login,
  recoverPassword,
  updatePassword,
  logout,
} from "@/features/auth/actions";
function form(values: Record<string, string>) {
  const data = new FormData();
  Object.entries(values).forEach(([k, v]) => data.set(k, v));
  return data;
}
const account = {
  email: "ana@example.com",
  password: "a-long-test-password",
  confirmPassword: "a-long-test-password",
};
beforeEach(() => {
  vi.clearAllMocks();
});
describe("auth action contracts", () => {
  it("signup never passes client role or metadata to Auth", async () => {
    auth.signUp.mockResolvedValue({ data: { session: null }, error: null });
    expect(
      await register({}, form({ ...account, role: "admin" })),
    ).toHaveProperty("success");
    expect(auth.signUp).toHaveBeenCalledWith({
      email: account.email,
      password: account.password,
      options: { emailRedirectTo: "http://localhost:3000/auth/callback" },
    });
  });
  it("successful login rejects an external next URL", async () => {
    auth.signInWithPassword.mockResolvedValue({ error: null });
    await expect(
      login({}, form({ ...account, next: "https://attacker.example" })),
    ).rejects.toThrow("REDIRECT:/inicio");
  });
  it("recovery uses the protected password callback", async () => {
    auth.resetPasswordForEmail.mockResolvedValue({ error: null });
    expect(
      await recoverPassword({}, form({ email: account.email })),
    ).toHaveProperty("success");
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith(account.email, {
      redirectTo:
        "http://localhost:3000/auth/callback?next=/actualizar-password",
    });
  });
  it("password change revokes refresh sessions before returning to login", async () => {
    auth.updateUser.mockResolvedValue({ error: null });
    auth.signOut.mockResolvedValue({ error: null });
    await expect(updatePassword({}, form(account))).rejects.toThrow(
      "REDIRECT:/login?message=password-updated",
    );
    expect(auth.signOut).toHaveBeenCalledWith({ scope: "global" });
  });
  it("logout clears the local session", async () => {
    auth.signOut.mockResolvedValue({ error: null });
    await expect(logout()).rejects.toThrow("REDIRECT:/login");
    expect(auth.signOut).toHaveBeenCalledWith({ scope: "local" });
  });
});
