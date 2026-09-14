"use client";
import Link from "next/link";
import { ActionForm } from "@/components/ui/action-form";
import { Button } from "@/components/ui";
import { sendInterest } from "./actions";
import { canSendInterest, interestLabel } from "./selectors";
import type { Application } from "./schema";
export function InterestForm({
  jobId,
  state,
  availability,
}: {
  jobId: string;
  state?: Application["state"];
  availability?: "off" | "uncovered" | "covered";
}) {
  if (!canSendInterest(state))
    return (
      <Button type="button" disabled>
        {interestLabel(state)}
      </Button>
    );
  if (availability === "off" || availability === "uncovered")
    return (
      <div className="interest-guidance">
        <p>
          {availability === "off"
            ? "Ahora estás fuera del matching. Tus horarios seguirán guardados."
            : "Tu disponibilidad no cubre todo este turno."}
        </p>
        <Link href="/disponibilidad" className="button">
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
