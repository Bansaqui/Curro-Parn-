import { createRoot } from "react-dom/client";
import { useState } from "react";
import { TrustProfileView } from "../../src/features/profile/view";
import { ProfileForm, ExperienceForm } from "../../src/features/profile/forms";
import { trustProfile, experience } from "../profile-fixtures";
import "../../src/app/globals.css";
function Fixture() {
  const [mode, setMode] = useState("worker");
  const profile = {
    ...trustProfile,
    experience: mode === "empty" ? [] : [experience],
  };
  return (
    <main
      className="home profile-trust"
      style={{ maxWidth: 720, margin: "auto", padding: 16 }}
    >
      <h1>Mi perfil profesional</h1>
      <label htmlFor="mode">Escenario QA local</label>
      <select
        className="input"
        id="mode"
        value={mode}
        onChange={(e) => setMode(e.target.value)}
      >
        <option value="worker">Profesional</option>
        <option value="business">Negocio</option>
        <option value="empty">Vacío</option>
      </select>
      <TrustProfileView profile={profile} editable={mode !== "business"} />
      {mode !== "business" && (
        <>
          <section className="card">
            <h2>Especialidades y habilidades</h2>
            <ProfileForm profile={profile} />
          </section>
          <section className="card">
            <h2>Añadir experiencia</h2>
            <ExperienceForm />
          </section>
        </>
      )}
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<Fixture />);
