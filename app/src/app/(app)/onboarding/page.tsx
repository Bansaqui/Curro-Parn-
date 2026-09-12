import { redirect } from "next/navigation";
import { getProfile } from "@/features/auth/session";
import { getPolicies } from "@/features/onboarding/policies";
import { OnboardingForm } from "@/features/onboarding/form";
import { Card } from "@/components/ui";
export default async function Page() {
  if (await getProfile()) redirect("/inicio");
  const policies = await getPolicies();
  return (
    <Card className="setup-card">
      <span className="eyebrow">VAMOS A CONOCERNOS</span>
      <h1>Tu sitio empieza aquí.</h1>
      <p className="lead">Cuéntanos quién eres. Lo demás, paso a paso.</p>
      <OnboardingForm
        termsVersion={policies.terms.version}
        privacyVersion={policies.privacy.version}
      />
    </Card>
  );
}
