import { redirect } from "next/navigation";
import { requireProfile } from "@/features/auth/session";
import { getSnapshot } from "@/features/snapshot/server";
import { managedBusinesses } from "@/features/snapshot/schema";
import { VenueForm } from "@/features/venues/form";
import { Card } from "@/components/ui";
export default async function Page() {
  await requireProfile("business");
  const snapshot = await getSnapshot();
  if (!snapshot.businesses.length) redirect("/negocio/nuevo");
  const businesses = managedBusinesses(snapshot).filter(
    (b) => !snapshot.venues.some((v) => v.business_id === b.id && v.active),
  );
  if (!businesses.length) redirect("/inicio");
  return (
    <Card className="setup-card">
      <span className="eyebrow">TU NEGOCIO · PASO 2 DE 2</span>
      <h1>Un lugar para empezar.</h1>
      <p className="lead">Añade tu primer local en Málaga.</p>
      <VenueForm businesses={businesses} />
    </Card>
  );
}
