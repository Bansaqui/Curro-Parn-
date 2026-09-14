"use client";
import { useActionState } from "react";
import { Alert, LoadingIndicator } from "@/components/ui";
import { initialState } from "@/lib/utils/errors";
import { saveAvailable } from "./status-actions";
export function AvailableSwitch({
  available,
  message,
}: {
  available: boolean;
  message: string;
}) {
  const [state, action, pending] = useActionState(saveAvailable, initialState);
  if (state.error)
    return (
      <Alert>
        {state.error} <a href="/disponibilidad">Comprobar estado</a>
      </Alert>
    );
  return (
    <form
      action={action}
      aria-busy={pending}
      onSubmit={(event) => {
        if (pending) event.preventDefault();
      }}
    >
      <button
        className="availability-switch"
        role="switch"
        aria-label="Disponible para Curros"
        aria-checked={available}
        type="submit"
        name="available"
        value={available ? "off" : "on"}
        disabled={pending}
      >
        <span className="switch-track" aria-hidden="true">
          <span />
        </span>
        <span>
          {pending ? (
            <>
              <LoadingIndicator /> Guardando…
            </>
          ) : available ? (
            "ON"
          ) : (
            "OFF"
          )}
        </span>
      </button>
      {!pending && <p className="muted">{message}</p>}
    </form>
  );
}
