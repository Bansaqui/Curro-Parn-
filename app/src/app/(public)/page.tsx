import Link from "next/link";
import { Brand } from "@/components/layout/brand";
export default function Landing() {
  return (
    <div className="landing">
      <header className="landing-header">
        <Brand />
        <span className="location">
          <span />
          Málaga · Hostelería
        </span>
      </header>
      <main id="main">
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow">PERSONAS QUE HACEN QUE TODO PASE</span>
            <h1>
              Tu turno.
              <br />
              Tu curro.
              <br />
              <em>Tu parné.</em>
            </h1>
            <p>
              El lugar donde tu disponibilidad
              <br className="desktop-break" /> y la próxima oportunidad se
              encuentran.
            </p>
            <div className="hero-actions">
              <Link href="/registro" className="button">
                Crear cuenta <span aria-hidden="true">↗</span>
              </Link>
              <Link href="/login" className="button secondary">
                Entrar
              </Link>
            </div>
            <span className="hero-note">Empezamos en Málaga. Contigo.</span>
          </div>
          <div className="opportunity">
            <span className="eyebrow">DOS LADOS. UN MISMO EQUIPO.</span>
            <article>
              <span className="side-number">01 / PROFESIONALES</span>
              <h2>
                Hoy tienes
                <br />
                ganas de <em>curro.</em>
              </h2>
              <p>Encuentra curro cuando quieres trabajar.</p>
              <span className="pill">Tu oficio, a tu ritmo</span>
            </article>
            <article>
              <span className="side-number">02 / NEGOCIOS</span>
              <h2>
                Tu equipo,
                <br />
                <em>cuando hace falta.</em>
              </h2>
              <p>Encuentra personal fiable cuando lo necesitas.</p>
              <span className="pill">Cada turno cuenta</span>
            </article>
          </div>
        </section>
      </main>
      <footer className="landing-footer">
        <span>CURRO & PARNÉ · MVP EN DESARROLLO</span>
        <span>Málaga → Costa del Sol → Andalucía → España</span>
      </footer>
    </div>
  );
}
