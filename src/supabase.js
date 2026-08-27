const url = String(import.meta.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const isSupabaseConfigured = Boolean(url && anonKey);

function headers(token, extra = {}) {
  return { apikey: anonKey, Authorization: `Bearer ${token || anonKey}`, "Content-Type": "application/json", ...extra };
}

async function request(path, options = {}, token) {
  if (!isSupabaseConfigured) throw new SupabaseUnavailableError("Configuration Supabase absente");
  const response = await fetch(`${url}${path}`, { ...options, headers: headers(token, options.headers) });
  const body = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.msg || body?.message || body?.error_description || "Erreur Supabase");
  return body;
}

export class SupabaseUnavailableError extends Error {
  constructor(message) {
    super(message);
    this.name = "SupabaseUnavailableError";
  }
}

export async function loadCompetitions() {
  const rows = await request("/rest/v1/competitions?select=data&order=created_at.asc");
  return rows.map((row) => row.data);
}

export async function saveCompetition(competition) {
  await request("/rest/v1/competitions?on_conflict=id", { method: "POST", headers: { Prefer: "resolution=merge-duplicates" }, body: JSON.stringify({ id: String(competition.id), slug: competition.slug, data: competition }) });
}

export async function removeCompetition(id) {
  await request(`/rest/v1/competitions?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function getPublicCompetition(slug) {
  const result = await request("/rest/v1/rpc/get_public_competition", { method: "POST", body: JSON.stringify({ requested_slug: slug }) });
  // Compatibility with the first RPC version, which returned the competition directly.
  if (result && !result.availability) return { availability: "open", competition: result };
  return result || { availability: "missing" };
}

export async function submitPublicRegistration(slug, competitors) {
  return request("/rest/v1/rpc/submit_public_registration", { method: "POST", body: JSON.stringify({ requested_slug: slug, submitted_competitors: competitors }) });
}
