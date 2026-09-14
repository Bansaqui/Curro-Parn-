"use client";
import { ActionForm } from "@/components/ui/action-form";
import { Button } from "@/components/ui";
import { sendInterest } from "./actions";
import { canSendInterest, interestLabel } from "./selectors";
import type { Application } from "./schema";
export function InterestForm({
  jobId,
  state,
}: {
  jobId: string;
  state?: Application["state"];
}) {
  if (!canSendInterest(state))
    return (
      <Button type="button" disabled>
        {interestLabel(state)}
      </Button>
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
