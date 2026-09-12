export type FormState = {
  error?: string;
  success?: string;
  fields?: Record<string, string[]>;
};
export const initialState: FormState = {};
export class AppError extends Error {
  constructor(
    public code: string,
    message?: string,
  ) {
    super(message ?? code);
  }
}
export function userMessage(error: unknown): string {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String(error.code)
      : "unknown";
  const messages: Record<string, string> = {
    invalid_credentials: "El correo o la contraseña no son correctos.",
    email_not_confirmed: "Confirma tu correo antes de entrar.",
    user_already_exists:
      "No se pudo crear la cuenta. Prueba a entrar o recuperar tu contraseña.",
    weak_password: "Elige una contraseña más segura.",
    over_request_rate_limit:
      "Demasiados intentos. Espera unos minutos y vuelve a probar.",
    over_email_send_rate_limit:
      "Espera unos minutos antes de pedir otro correo.",
    otp_expired:
      "El enlace ha caducado o ya se ha utilizado. Solicita uno nuevo.",
    same_password: "La nueva contraseña debe ser diferente de la anterior.",
    "23505": "Ya existe un registro con esos datos.",
    "23514": "Revisa los datos y las aceptaciones obligatorias.",
    "42501": "No tienes permiso para realizar esta acción.",
    CONFIG:
      "El acceso estará disponible cuando termine la configuración de la aplicación.",
    POLICY_CHANGED:
      "Los documentos han cambiado. Recarga y revisa las versiones vigentes.",
    SNAPSHOT: "No hemos podido cargar tu actividad. Inténtalo de nuevo.",
    BUSINESS_REQUIRED: "Primero crea o selecciona tu negocio.",
  };
  return (
    messages[code] ??
    "No hemos podido completar la operación. Inténtalo de nuevo."
  );
}
export function reportError(context: string, error: unknown) {
  // Deliberately log only an allowlisted code and context: no raw payloads, JWTs,
  // user-supplied values, passwords, request URLs, or stack traces.
  const raw =
    typeof error === "object" && error !== null && "code" in error
      ? String(error.code)
      : "unknown";
  const code = /^[a-zA-Z0-9_]{1,60}$/.test(raw) ? raw : "unknown";
  console.error("[Curro & Parné]", { context, code });
}
export function formError(context: string, error: unknown): FormState {
  reportError(context, error);
  return { error: userMessage(error) };
}
