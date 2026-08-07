const url = String(import.meta.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const sessionKey = "nanbudo_commission_session";

export const isSupabaseConfigured = Boolean(url && anonKey);

function headers(token, extra = {}) {
  return { apikey: anonKey, Authorization: `Bearer ${token || anonKey}`, "Content-Type": "application/json", ...extra };
}

async function request(path, options = {}, token) {
  if (!isSupabaseConfigured) throw new Error("Supabase n’est pas configuré. Renseignez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY.");
  const response = await fetch(`${url}${path}`, { ...options, headers: headers(token, options.headers) });
  const body = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.msg || body?.message || body?.error_description || "Erreur Supabase");
  return body;
}

export function getStoredSession() {
  try { return JSON.parse(localStorage.getItem(sessionKey) || "null"); } catch { return null; }
}

function storeSession(session) {
  if (session) localStorage.setItem(sessionKey, JSON.stringify(session)); else localStorage.removeItem(sessionKey);
  return session;
}

export async function restoreSession() {
  const session = getStoredSession();
  if (!session?.refresh_token) return null;
  if (session.expires_at * 1000 > Date.now() + 60_000) return session;
  try {
    const refreshed = await request("/auth/v1/token?grant_type=refresh_token", { method: "POST", body: JSON.stringify({ refresh_token: session.refresh_token }) });
    return storeSession({ ...refreshed, expires_at: Math.floor(Date.now() / 1000) + refreshed.expires_in });
  } catch { return storeSession(null); }
}

export async function signIn(email, password) {
  const result = await request("/auth/v1/token?grant_type=password", { method: "POST", body: JSON.stringify({ email, password }) });
  return storeSession({ ...result, expires_at: Math.floor(Date.now() / 1000) + result.expires_in });
}

export async function signOut() {
  const session = getStoredSession();
  if (session?.access_token) await request("/auth/v1/logout", { method: "POST" }, session.access_token).catch(() => {});
  storeSession(null);
}

export async function loadCompetitions(token) {
  const rows = await request("/rest/v1/competitions?select=data&order=created_at.asc", {}, token);
  return rows.map((row) => row.data);
}

export async function saveCompetition(competition, token) {
  await request("/rest/v1/competitions?on_conflict=id", { method: "POST", headers: { Prefer: "resolution=merge-duplicates" }, body: JSON.stringify({ id: String(competition.id), slug: competition.slug, data: competition }) }, token);
}

export async function removeCompetition(id, token) {
  await request(`/rest/v1/competitions?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" }, token);
}

export async function getPublicCompetition(slug) {
  return request("/rest/v1/rpc/get_public_competition", { method: "POST", body: JSON.stringify({ requested_slug: slug }) });
}

export async function submitPublicRegistration(slug, competitors) {
  return request("/rest/v1/rpc/submit_public_registration", { method: "POST", body: JSON.stringify({ requested_slug: slug, submitted_competitors: competitors }) });
}
