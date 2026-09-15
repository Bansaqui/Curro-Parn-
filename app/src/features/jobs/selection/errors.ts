export function selectionError(error: unknown): string {
  if (typeof error !== "object" || error === null || !("code" in error))
    return "No hemos podido confirmar el resultado. Actualiza las candidaturas antes de intentarlo otra vez.";
  if (error.code === "42501")
    return "No tienes permiso para gestionar esta candidatura.";
  if (error.code === "23P01")
    return "El profesional ya tiene otro Curro confirmado en ese horario.";
  if (error.code === "23505")
    return "La plaza o la candidatura ha cambiado. Actualiza las candidaturas.";
  const known: Record<string, string> = {
    "La disponibilidad ha cambiado.":
      "El profesional ya no está disponible para este horario.",
    "No quedan plazas.": "Todas las plazas ya están cubiertas.",
    "Se necesita una candidatura aceptada por el profesional.":
      "La candidatura o el Curro ya no permiten seleccionar. Actualiza las candidaturas.",
    "La candidatura no se puede rechazar.":
      "Esta candidatura ya no se puede descartar. Actualiza las candidaturas.",
    "Candidatura no disponible.": "La candidatura ya no está disponible.",
  };
  if (
    error.code === "P0001" &&
    "message" in error &&
    typeof error.message === "string" &&
    Object.hasOwn(known, error.message)
  )
    return known[error.message];
  return "No hemos podido confirmar el resultado. Actualiza las candidaturas antes de intentarlo otra vez.";
}
