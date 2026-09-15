"use client";
import { useActionState, useState } from "react";
import { Alert, Button } from "@/components/ui";
import { RefreshLink } from "@/components/ui/refresh-link";
import { saveDecision } from "./actions";
import type { FormState } from "@/lib/utils/errors";
export function CandidateActions({
  jobId,
  applicationId,
  selectable,
  rejectable,
}: {
  jobId: string;
  applicationId: string;
  selectable: boolean;
  rejectable: boolean;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    saveDecision,
    {},
  );
  const [decision, setDecision] = useState("select");
  // One form locks both decisions; after an error require a fresh server read.
  return (
    <form action={action} className="candidate-actions" aria-busy={pending}>
      <input type="hidden" name="jobId" value={jobId} />
      <input type="hidden" name="applicationId" value={applicationId} />
      {state.error ? (
        <div role="status">
          <Alert>{state.error}</Alert>
          <RefreshLink href={`/negocio/curros/${jobId}/candidaturas`} />
        </div>
      ) : (
        <>
          {selectable && (
            <Button
              name="decision"
              value="select"
              onClick={() => setDecision("select")}
              disabled={pending}
            >
              {pending && decision === "select"
                ? "Seleccionando…"
                : "Seleccionar"}
            </Button>
          )}
          {rejectable && (
            <Button
              className="button-dismiss"
              name="decision"
              value="reject"
              onClick={() => setDecision("reject")}
              disabled={pending}
            >
              {pending && decision === "reject" ? "Descartando…" : "Descartar"}
            </Button>
          )}
        </>
      )}
    </form>
  );
}
