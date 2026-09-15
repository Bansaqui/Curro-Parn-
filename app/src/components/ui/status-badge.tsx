import type { ReactNode } from "react";
export function StatusBadge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "positive" | "copper";
}) {
  return (
    <span className={`status-badge status-badge--${tone}`}>{children}</span>
  );
}
