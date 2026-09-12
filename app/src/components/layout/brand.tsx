import Link from "next/link";
export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="Curro y Parné, inicio">
      CURRO <span>&</span> PARNÉ<span className="brand-dot">.</span>
    </Link>
  );
}
