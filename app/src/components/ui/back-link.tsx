import Link from "next/link";
export function BackLink() {
  return (
    <Link href="/inicio" className="button secondary back-link">
      <span aria-hidden="true">←</span>Volver a Inicio
    </Link>
  );
}
