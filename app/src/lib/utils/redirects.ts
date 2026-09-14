const destinations = new Set([
  "/curros",
  "/negocio/curros/nuevo",
  "/disponibilidad",
  "/inicio",
  "/onboarding",
  "/negocio/nuevo",
  "/negocio/local/nuevo",
  "/actualizar-password",
]);
export function safeNext(value: unknown, fallback = "/inicio") {
  return typeof value === "string" && destinations.has(value)
    ? value
    : fallback;
}
export function isProtectedPath(path: string) {
  return [
    "/curros",
    "/disponibilidad",
    "/inicio",
    "/onboarding",
    "/negocio",
    "/actualizar-password",
  ].some((prefix) => path === prefix || path.startsWith(prefix + "/"));
}
