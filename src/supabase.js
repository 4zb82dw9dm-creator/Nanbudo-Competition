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
  if (!response.ok) {
    const error = new Error(body?.msg || body?.message || body?.error_description || "Erreur Supabase");
    error.status = response.status;
    error.code = body?.code;
    throw error;
  }
  return body;
}

export class SupabaseUnavailableError extends Error {
  constructor(message) {
    super(message);
    this.name = "SupabaseUnavailableError";
  }
}

function applyMatchResults(competition, rows = []) {
  if (!competition?.id || !Array.isArray(competition.pools) || rows.length === 0) return competition;
  const byMatch = new Map(
    rows
      .filter((row) => String(row.competition_id) === String(competition.id))
      .map((row) => [`${String(row.pool_id)}::${String(row.match_id)}`, row.result])
  );
  if (byMatch.size === 0) return competition;

  return {
    ...competition,
    pools: competition.pools.map((pool) => ({
      ...pool,
      matches: (pool.matches || []).map((match) => {
        const saved = byMatch.get(`${String(pool.id)}::${String(match.id)}`);
        return saved ? { ...match, ...saved } : match;
      }),
    })),
  };
}

async function loadAllMatchResults() {
  try {
    return await request("/rest/v1/match_results?select=competition_id,pool_id,match_id,result,updated_at&order=updated_at.asc");
  } catch (error) {
    if (error.status === 404 || error.code === "42P01" || error.code === "PGRST205") return [];
    throw error;
  }
}

export async function loadCompetitions() {
  const rows = await request("/rest/v1/competitions?select=slug,data&order=created_at.asc");
  const competitions = rows.map((row) => ({ ...row.data, slug: row.data?.slug || row.slug }));
  const matchResults = await loadAllMatchResults();
  return competitions.map((competition) => applyMatchResults(competition, matchResults));
}

export async function saveCompetition(competition) {
  await request("/rest/v1/competitions?on_conflict=id", { method: "POST", headers: { Prefer: "resolution=merge-duplicates" }, body: JSON.stringify({ id: String(competition.id), slug: competition.slug, data: competition }) });
}

export async function saveMatchResult(competitionId, poolId, match) {
  if (!isSupabaseConfigured) return false;
  try {
    await request("/rest/v1/match_results?on_conflict=competition_id,pool_id,match_id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify({
        competition_id: String(competitionId),
        pool_id: String(poolId),
        match_id: String(match.id),
        result: match,
        updated_at: new Date().toISOString(),
      }),
    });
    return true;
  } catch (error) {
    if (error.status === 404 || error.code === "42P01" || error.code === "PGRST205") {
      console.warn("Table match_results absente : synchronisation indépendante non activée.");
      return false;
    }
    throw error;
  }
}

export async function removeCompetition(id) {
  await request(`/rest/v1/competitions?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
  try {
    await request(`/rest/v1/match_results?competition_id=eq.${encodeURIComponent(String(id))}`, { method: "DELETE" });
  } catch (error) {
    if (!(error.status === 404 || error.code === "42P01" || error.code === "PGRST205")) throw error;
  }
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
