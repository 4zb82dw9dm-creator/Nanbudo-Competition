import { useState } from "react";
import { signIn } from "./supabase";
export default function Login({ onSuccess }) {
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [error, setError] = useState("");
  async function submit(event) { event.preventDefault(); setError(""); try { onSuccess(await signIn(email, password)); } catch (reason) { setError(reason.message); } }
  return <main className="login-page"><form className="login-card" onSubmit={submit}><img src={`${import.meta.env.BASE_URL}assets/logo-afdp.png`} alt="AFDP Nanbudo" /><p className="surtitle">ESPACE COMMISSION</p><h1>Connexion</h1>{error && <p className="login-error" role="alert">{error}</p>}<label>Email<input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required /></label><label>Mot de passe<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label><button className="primary">Se connecter</button></form></main>;
}
