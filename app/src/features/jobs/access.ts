import { managedBusinesses, type Snapshot } from "@/features/snapshot/schema";
export function publishingOptions(snapshot: Snapshot) {
  const businesses =
    snapshot.profile.role === "business" ? managedBusinesses(snapshot) : [];
  const venues = snapshot.venues.filter(
    (v) => v.active && businesses.some((b) => b.id === v.business_id),
  );
  return { businesses, venues };
}
export function canPublishAt(
  snapshot: Snapshot,
  businessId: string,
  venueId: string,
) {
  const { businesses, venues } = publishingOptions(snapshot);
  return (
    businesses.some((b) => b.id === businessId) &&
    venues.some((v) => v.id === venueId && v.business_id === businessId)
  );
}
export function ownJobs(snapshot: Snapshot, now = Date.now()) {
  if (snapshot.profile.role !== "business") return [];
  // Snapshot businesses contain only the caller's active memberships.
  return snapshot.jobs
    .filter((j) => snapshot.businesses.some((b) => b.id === j.business_id))
    .sort((a, b) => {
      const aTime = Date.parse(a.starts_at),
        bTime = Date.parse(b.starts_at);
      const aNext = a.state === "published" && Date.parse(a.ends_at) > now;
      const bNext = b.state === "published" && Date.parse(b.ends_at) > now;
      return (
        Number(bNext) - Number(aNext) ||
        (aNext ? aTime - bTime : bTime - aTime) ||
        a.id.localeCompare(b.id)
      );
    });
}
