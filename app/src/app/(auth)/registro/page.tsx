import { AuthShell } from "@/components/layout/auth-shell";
import { RegisterForm } from "@/features/auth/forms";
export default function Page() {
  return (
    <AuthShell
      eyebrow="TU PRIMER PASO"
      title="Hagamos sitio para ti."
      description="Crea tu cuenta. Después elegirás cómo quieres usar Curro & Parné."
    >
      <RegisterForm />
    </AuthShell>
  );
}
