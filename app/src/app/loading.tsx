import { LoadingIndicator } from "@/components/ui";
export default function Loading() {
  return (
    <div className="loading-page" role="status">
      <LoadingIndicator />
      Preparando tu espacio…
    </div>
  );
}
