import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "Curro & Parné · Tu próximo paso",
    template: "%s · Curro & Parné",
  },
  description:
    "Encuentra curro cuando quieres trabajar. Encuentra personal fiable cuando lo necesitas. Piloto de hostelería en Málaga.",
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>
        <a href="#main" className="skip-link">
          Saltar al contenido
        </a>
        {children}
      </body>
    </html>
  );
}
