import { expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { InterestForm } from "@/features/jobs/interest/form";
import { WorkerAvailabilitySummary } from "@/features/availability/summary";
import { BackLink } from "@/components/ui/back-link";
import { RefreshLink } from "@/components/ui/refresh-link";
import { workerSnapshot } from "./interest-fixtures";
import { jobId, snapshot } from "./jobs-fixtures";
vi.mock("@/features/auth/session", () => ({
  requireProfile: async () => ({ id: "worker" }),
}));
vi.mock("@/features/snapshot/server", () => ({
  getSnapshot: async () => snapshot(),
}));
import Curros from "@/app/(app)/curros/page";
import Availability from "@/app/(app)/disponibilidad/page";
it.each([
  ["applied", "Interés enviado"],
  ["selected", "Seleccionado"],
  ["rejected", "No seleccionado"],
  ["withdrawn", "Candidatura retirada"],
] as const)("%s is text status, never a disabled button", (state, label) => {
  const html = renderToStaticMarkup(
    createElement(InterestForm, { jobId, state }),
  );
  expect(html).toContain(label);
  expect(html).not.toContain("<button");
  expect(html).not.toContain('role="button"');
  expect(html).not.toContain("disabled");
});
it("keeps both home actions inside the availability card before Activity", () => {
  const html = renderToStaticMarkup(
    createElement(WorkerAvailabilitySummary, {
      snapshot: workerSnapshot(),
      now: Date.parse("2026-09-15T10:00:00Z"),
    }),
  );
  const firstCard = html.slice(0, html.indexOf("</section>"));
  expect(firstCard).toContain('href="/curros"');
  expect(firstCard).toContain("Gestionar disponibilidad");
  expect(firstCard.indexOf("Ver Curros")).toBeLessThan(
    firstCard.indexOf("Gestionar disponibilidad"),
  );
});
it("uses semantic links for return and fresh read", () => {
  const back = renderToStaticMarkup(createElement(BackLink));
  expect(back).toContain('href="/inicio"');
  expect(back).toContain("Volver a Inicio");
  const refresh = renderToStaticMarkup(
    createElement(RefreshLink, { href: "/test" }),
  );
  expect(refresh).toContain("Actualizar</a>");
  expect(refresh).not.toContain("Actualizar candidaturas");
});
it("Curros has a standalone availability CTA and consistent return", async () => {
  const html = renderToStaticMarkup(
    await Curros({ searchParams: Promise.resolve({}) }),
  );
  expect(html).toContain("Curros disponibles");
  expect(html).toContain("Gestionar disponibilidad</a>");
  expect(html).toContain("Volver a Inicio");
  expect(html).not.toContain("Revisar disponibilidad");
});
it("availability has a contextual Curros link and consistent return", async () => {
  const html = renderToStaticMarkup(
    await Availability({ searchParams: Promise.resolve({}) }),
  );
  expect(html).toContain("Ver Curros disponibles</a>");
  expect(html).toContain("Volver a Inicio");
});
