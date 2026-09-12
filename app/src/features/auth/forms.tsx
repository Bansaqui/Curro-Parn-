"use client";
import Link from "next/link";
import { ActionForm, Field } from "@/components/ui/action-form";
import {
  login,
  register,
  recoverPassword,
  updatePassword,
  logout,
} from "./actions";
export function LoginForm({ next }: { next: string }) {
  return (
    <>
      <ActionForm
        action={login}
        kind="login"
        submit="Entrar"
        pending="Entrando…"
      >
        <input type="hidden" name="next" value={next} />
        <Field
          name="email"
          label="Correo electrónico"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
        />
        <Field
          name="password"
          label="Contraseña"
          type="password"
          autoComplete="current-password"
          required
          maxLength={128}
        />
        <Link className="form-link" href="/recuperar-password">
          He olvidado mi contraseña
        </Link>
      </ActionForm>
      <p className="form-footer">
        ¿Tu primera vez? <Link href="/registro">Crea tu cuenta</Link>
      </p>
    </>
  );
}
export function RegisterForm() {
  return (
    <>
      <ActionForm
        action={register}
        kind="register"
        submit="Crear cuenta"
        pending="Creando cuenta…"
      >
        <Field
          name="email"
          label="Correo electrónico"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
        />
        <PasswordFields />
      </ActionForm>
      <p className="form-footer">
        ¿Ya tienes cuenta? <Link href="/login">Entrar</Link>
      </p>
    </>
  );
}
function PasswordFields() {
  return (
    <>
      <Field
        name="password"
        label="Nueva contraseña"
        type="password"
        autoComplete="new-password"
        minLength={12}
        maxLength={128}
        required
        hint="Al menos 12 caracteres. Mejor una frase larga y única."
      />
      <Field
        name="confirmPassword"
        label="Repite la contraseña"
        type="password"
        autoComplete="new-password"
        required
        maxLength={128}
      />
    </>
  );
}
export function RecoveryForm() {
  return (
    <ActionForm
      action={recoverPassword}
      kind="recovery"
      submit="Enviar enlace"
      pending="Enviando…"
    >
      <Field
        name="email"
        label="Correo electrónico"
        type="email"
        autoComplete="email"
        maxLength={254}
        required
      />
    </ActionForm>
  );
}
export function PasswordForm() {
  return (
    <ActionForm
      action={updatePassword}
      kind="password"
      submit="Guardar contraseña"
      pending="Actualizando…"
    >
      <PasswordFields />
    </ActionForm>
  );
}
export function LogoutForm() {
  return (
    <div className="logout">
      <ActionForm action={logout} submit="Salir" pending="Saliendo…" />
    </div>
  );
}
