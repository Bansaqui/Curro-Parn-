import { redirect } from "next/navigation";
import { requireProfile } from "@/features/auth/session";
import { getSnapshot } from "@/features/snapshot/server";
import { BusinessForm } from "@/features/businesses/form";
import { Card } from "@/components/ui";
export default async function Page() {
  await requireProfile("business");
  const snapshot = await getSnapshot();
  if (snapshot.businesses.length) redirect("/inicio");
  return (
    <Card className="setup-card">
      <span className="eyebrow">TU NEGOCIO · PASO 1 DE 2</span>
      <h1>Ponle nombre.</h1>
      <p className="lead">
        Primero el negocio. Después añadiremos tu primer local.
      </p>
      <BusinessForm />
    </Card>
  );
}
