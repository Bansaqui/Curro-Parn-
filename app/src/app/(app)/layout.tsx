import { requireIdentity } from "@/features/auth/session";
import { Brand } from "@/components/layout/brand";
import { LogoutForm } from "@/features/auth/forms";
export const dynamic = "force-dynamic";
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireIdentity();
  return (
    <div className="app-shell">
      <header>
        <Brand />
        <LogoutForm />
      </header>
      <main id="main" className="app-main">
        {children}
      </main>
      <footer>Curro & Parné · Piloto Málaga</footer>
    </div>
  );
}
