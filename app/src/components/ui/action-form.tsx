"use client";
import {
  createContext,
  useActionState,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useFormStatus } from "react-dom";
import { Alert, Button, Input, Label, LoadingIndicator } from ".";
import { initialState, type FormState } from "@/lib/utils/errors";
import {
  loginSchema,
  registerSchema,
  recoverySchema,
  passwordSchema,
  onboardingSchema,
  businessSchema,
  venueSchema,
} from "@/lib/validation/schemas";
const schemas = {
  login: loginSchema,
  register: registerSchema,
  recovery: recoverySchema,
  password: passwordSchema,
  onboarding: onboardingSchema,
  business: businessSchema,
  venue: venueSchema,
};
const Errors = createContext<FormState>({});
export type FormAction = (
  state: FormState,
  form: FormData,
) => Promise<FormState>;
export function ActionForm({
  action,
  kind,
  children,
  submit,
  pending = "Guardando…",
}: {
  action: FormAction;
  kind?: keyof typeof schemas;
  children?: ReactNode;
  submit: string;
  pending?: string;
}) {
  const [state, formAction, busy] = useActionState(action, initialState);
  const [clientState, setClientState] = useState<FormState>({});
  const feedback = useRef<HTMLDivElement>(null);
  const visibleState = clientState.error ? clientState : state;
  // React resets uncontrolled inputs after a resolved action, including an error
  // FormState. Preserve edits so the DOM role cannot diverge from React state.
  return (
    <Errors.Provider value={visibleState}>
      <form
        action={formAction}
        className="form"
        aria-busy={busy}
        onReset={(event) => event.preventDefault()}
        onSubmit={(event) => {
          if (busy) {
            event.preventDefault();
            return;
          }
          setClientState({});
          if (kind) {
            const form = new FormData(event.currentTarget);
            const data = {
              ...Object.fromEntries(form),
              ...(kind === "onboarding"
                ? {
                    acceptTerms: form.get("acceptTerms") === "on",
                    acceptPrivacy: form.get("acceptPrivacy") === "on",
                  }
                : {}),
            };
            const result = schemas[kind].safeParse(data);
            if (!result.success) {
              event.preventDefault();
              setClientState({
                error: "Revisa los campos indicados.",
                fields: result.error.flatten().fieldErrors,
              });
              requestAnimationFrame(() => feedback.current?.focus());
            }
          }
        }}
      >
        {children}
        <div ref={feedback} tabIndex={-1} className="feedback">
          {visibleState.error && <Alert>{visibleState.error}</Alert>}
          {visibleState.success && (
            <Alert success>{visibleState.success}</Alert>
          )}
        </div>
        <Submit label={submit} pending={pending} />
      </form>
    </Errors.Provider>
  );
}
function Submit({ label, pending }: { label: string; pending: string }) {
  const status = useFormStatus();
  return (
    <Button type="submit" disabled={status.pending}>
      {status.pending && <LoadingIndicator />}
      {status.pending ? pending : label}
    </Button>
  );
}
export function Field({
  name,
  label,
  hint,
  ...props
}: React.ComponentProps<typeof Input> & {
  name: string;
  label: string;
  hint?: string;
}) {
  const { fields } = useContext(Errors);
  const errors = fields?.[name];
  return (
    <div className="field">
      <Label htmlFor={name}>{label}</Label>
      <Input
        {...props}
        name={name}
        id={name}
        aria-invalid={!!errors?.length}
        aria-describedby={
          errors?.length ? `${name}-error` : hint ? `${name}-hint` : undefined
        }
      />
      {hint && <small id={`${name}-hint`}>{hint}</small>}
      {errors?.length && (
        <p className="field-error" id={`${name}-error`}>
          {errors[0]}
        </p>
      )}
    </div>
  );
}
export function FieldError({ name }: { name: string }) {
  const { fields } = useContext(Errors);
  return fields?.[name]?.length ? (
    <p className="field-error" id={`${name}-error`}>
      {fields[name][0]}
    </p>
  ) : null;
}
