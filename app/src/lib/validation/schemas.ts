import { z } from "zod";
export const specialties = [
  "Camarero/a",
  "Bartender",
  "Cocinero/a",
  "Ayudante de cocina",
] as const;
const email = z.email("Escribe un correo válido.").trim().max(254);
const password = z
  .string()
  .min(12, "Usa al menos 12 caracteres.")
  .max(128, "Usa como máximo 128 caracteres.");
const name = z
  .string()
  .trim()
  .min(2, "Escribe al menos 2 caracteres.")
  .max(100, "Usa como máximo 100 caracteres.");
export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Escribe tu contraseña.").max(128),
  next: z.string().optional(),
});
export const recoverySchema = z.object({ email });
export const passwordSchema = z
  .object({ password, confirmPassword: z.string() })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });
export const registerSchema = z
  .object({ email, password, confirmPassword: z.string() })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });
const acceptance = z.literal(true, { error: "Debes aceptar este documento." });
export const onboardingSchema = z.discriminatedUnion("role", [
  z.object({
    role: z.literal("worker"),
    displayName: name,
    specialty: z.enum(specialties, { error: "Elige una especialidad." }),
    acceptTerms: acceptance,
    acceptPrivacy: acceptance,
  }),
  z.object({
    role: z.literal("business"),
    displayName: name,
    specialty: z.union([z.literal(""), z.undefined()]).optional(),
    acceptTerms: acceptance,
    acceptPrivacy: acceptance,
  }),
]);
export const businessSchema = z.object({
  legalName: z.string().trim().min(2, "Escribe el nombre legal.").max(160),
  displayName: z
    .string()
    .trim()
    .min(2, "Escribe el nombre comercial.")
    .max(120),
  taxId: z
    .string()
    .trim()
    .max(32)
    .refine(
      (v) => v === "" || v.length >= 5,
      "Usa entre 5 y 32 caracteres, o déjalo vacío.",
    ),
});
export const venueSchema = z.object({
  businessId: z.uuid("Selecciona un negocio válido."),
  name: z.string().trim().min(2, "Escribe el nombre del local.").max(120),
  address: z.string().trim().min(3, "Escribe una dirección.").max(250),
  city: z.literal("Málaga", { error: "El piloto está disponible en Málaga." }),
});
export type OnboardingInput = z.infer<typeof onboardingSchema>;
export type BusinessInput = z.infer<typeof businessSchema>;
export type VenueInput = z.infer<typeof venueSchema>;
