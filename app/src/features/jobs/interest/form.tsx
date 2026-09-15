"use client";
import Link from "next/link";
import { ActionForm } from "@/components/ui/action-form";
import { StatusBadge } from "@/components/ui/status-badge";
import { sendInterest } from "./actions";
import { canSendInterest, interestLabel } from "./selectors";
import type { Application } from "./schema";
export function InterestForm({
  jobId,
  state,
  availability,
  closed,
}: {
  jobId: string;
  state?: Application["state"];
  availability?: "off" | "uncovered" | "covered";
  closed?: boolean;
}) {
  if (!canSendInterest(state))
    return (
      <div>
        <StatusBadge
          tone={
            state === "selected"
              ? "positive"
              : state === "applied"
                ? "copper"
                : "neutral"
          }
        >
          {interestLabel(state)}
        </StatusBadge>
        {state === "rejected" && <p>No seleccionado para este Curro.</p>}
      </div>
    );
  if (closed) return <p>Este Curro ya no admite candidaturas.</p>;
  if (availability === "off" || availability === "uncovered")
    return (
      <div className="interest-guidance">
        <p>
          {availability === "off"
            ? "Ahora estás fuera del matching. Tus horarios seguirán guardados."
            : "Tu disponibilidad no cubre todo este turno."}
        </p>
        <Link href="/disponibilidad" className="button secondary">
          Ajustar disponibilidad
        </Link>
      </div>
    );
  return (
    <>
      {state === "invited" && <p className="muted">Invitación recibida</p>}
      <ActionForm
        action={sendInterest}
        submit="Me interesa"
        pending="Enviando interés…"
      >
        <input type="hidden" name="jobId" value={jobId} />
      </ActionForm>
    </>
  );
}
