import assert from "node:assert/strict";
const origin = process.env.SMOKE_ORIGIN || "http://localhost:3000";
let count = 0;
for (const path of [
  "/",
  "/login",
  "/registro",
  "/recuperar-password",
  "/legal/terminos",
  "/legal/privacidad",
  "/auth/error",
]) {
  const response = await fetch(new URL(path, origin), { redirect: "manual" });
  assert.equal(response.status, 200, `${path} must load`);
  assert.match(await response.text(), /Curro|CURRO/);
  count++;
}
for (const path of [
  "/inicio",
  "/disponibilidad",
  "/curros",
  "/onboarding",
  "/negocio/nuevo",
  "/negocio/curros/nuevo",
  "/negocio/curros/44444444-4444-4444-8444-444444444444/candidaturas",
  "/negocio/local/nuevo",
  "/actualizar-password",
]) {
  const response = await fetch(new URL(path, origin), { redirect: "manual" });
  assert.ok([303, 307].includes(response.status), `${path} must redirect`);
  assert.equal(
    new URL(response.headers.get("location"), origin).pathname,
    "/login",
  );
  assert.match(response.headers.get("cache-control"), /no-store/);
  count++;
}
for (const path of [
  "/auth/callback?next=https://example.invalid",
  "/auth/confirm?type=admin&token_hash=invalid",
]) {
  const response = await fetch(new URL(path, origin), { redirect: "manual" });
  assert.equal(
    new URL(response.headers.get("location"), origin).pathname,
    "/auth/error",
  );
  count++;
}
console.log(`${count} route checks passed (no session; no remote writes).`);
