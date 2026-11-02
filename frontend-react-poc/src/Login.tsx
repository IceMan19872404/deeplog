import { useState, type FormEvent } from "react";
import { login } from "./api";
import type { User } from "./types";

export function Login({ onLogin }: { onLogin: (user: User) => void }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const data = new FormData(event.currentTarget);
    try { onLogin(await login(String(data.get("email")), String(data.get("password")))); }
    catch { setError("No se pudo iniciar sesión. Revisa tus credenciales."); }
    finally { setBusy(false); }
  }
  return <main className="login-shell">
    <section className="login-story"><p className="eyebrow">PRUEBA DE CONCEPTO · SEMANA 23</p><h1>Tu bitácora,<br/>con una nueva base.</h1><p>La misma API segura, explorada ahora con React y TypeScript.</p></section>
    <form className="login-card" onSubmit={submit} aria-busy={busy}>
      <p className="eyebrow">ACCESO PRIVADO</p><h2>Entrar en DeepLog</h2>
      <label>Correo electrónico<input name="email" type="email" autoComplete="email" required /></label>
      <label>Contraseña<input name="password" type="password" autoComplete="current-password" required /></label>
      {error && <p className="error" role="alert">{error}</p>}
      <button disabled={busy}>{busy ? "Entrando..." : "Abrir mi bitácora"}</button>
    </form>
  </main>;
}
