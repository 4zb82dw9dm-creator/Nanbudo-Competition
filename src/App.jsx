import { useEffect, useRef, useState } from "react";
import "./style.css";
import CompetitionManager from "./CompetitionManager";
import PublicRegistration from "./PublicRegistration";
import { competitionPublicSlug, currentRoute, publicRegistrationSlug } from "./routing";
import { persistCompetitions } from "./registrationProcessing";
import { isSupabaseConfigured, loadCompetitions, removeCompetition, saveCompetition } from "./supabase";

const LOCAL_COMPETITIONS_KEY = "nanbudo_competitions";
const SUPABASE_MIGRATION_KEY = "nanbudo_supabase_migration_v1";
const LIVE_REFRESH_MS = 2000;

function prepareCompetitions(items) {
  return items.map((competition) => ({
    ...competition,
    slug: competitionPublicSlug(competition),
  }));
}

function readLocalCompetitions() {
  try {
    return prepareCompetitions(JSON.parse(localStorage.getItem(LOCAL_COMPETITIONS_KEY) || "[]"));
  } catch {
    return [];
  }
}

function snapshot(items) {
  return JSON.stringify(items);
}

function isFinishedMatch(match) {
  return match?.statut === "Terminé";
}

function mergeMatches(localMatches = [], remoteMatches = []) {
  const localById = new Map(localMatches.map((match) => [String(match.id), match]));
  const remoteById = new Map(remoteMatches.map((match) => [String(match.id), match]));
  const ids = [...new Set([...localById.keys(), ...remoteById.keys()])];

  return ids.map((id) => {
    const localMatch = localById.get(id);
    const remoteMatch = remoteById.get(id);
    if (!localMatch) return remoteMatch;
    if (!remoteMatch) return localMatch;

    // A completed result must never disappear because another tatami saved
    // an older whole-competition snapshot at nearly the same time.
    if (isFinishedMatch(localMatch) && !isFinishedMatch(remoteMatch)) return localMatch;
    if (isFinishedMatch(remoteMatch) && !isFinishedMatch(localMatch)) return remoteMatch;

    // If both versions are completed, Supabase is authoritative. This avoids
    // a stale tablet undoing a deliberate later correction of the same match.
    return remoteMatch;
  });
}

function mergePools(localPools = [], remotePools = []) {
  const localById = new Map(localPools.map((pool) => [String(pool.id), pool]));
  const remoteById = new Map(remotePools.map((pool) => [String(pool.id), pool]));
  const ids = [...new Set([...localById.keys(), ...remoteById.keys()])];

  return ids.map((id) => {
    const localPool = localById.get(id);
    const remotePool = remoteById.get(id);
    if (!localPool) return remotePool;
    if (!remotePool) return localPool;

    const localHasResultMissingRemotely = (localPool.matches || []).some((localMatch) => {
      if (!isFinishedMatch(localMatch)) return false;
      const remoteMatch = (remotePool.matches || []).find((match) => String(match.id) === String(localMatch.id));
      return !isFinishedMatch(remoteMatch);
    });

    const basePool = localHasResultMissingRemotely ? localPool : remotePool;
    return {
      ...basePool,
      matches: mergeMatches(localPool.matches || [], remotePool.matches || []),
    };
  });
}

function mergeCompetition(localCompetition, remoteCompetition) {
  if (!localCompetition) return remoteCompetition;
  if (!remoteCompetition) return localCompetition;
  return {
    ...remoteCompetition,
    pools: mergePools(localCompetition.pools || [], remoteCompetition.pools || []),
  };
}

function mergeCompetitionLists(localItems, remoteItems) {
  const localById = new Map(localItems.map((competition) => [String(competition.id), competition]));
  const remoteById = new Map(remoteItems.map((competition) => [String(competition.id), competition]));
  const ids = [...new Set([...remoteById.keys(), ...localById.keys()])];
  return ids.map((id) => mergeCompetition(localById.get(id), remoteById.get(id)));
}

export default function App() {
  const [publicSlug, setPublicSlug] = useState(() => publicRegistrationSlug(currentRoute()));
  useEffect(() => {
    const listener = () => {
      const nextRoute = currentRoute();
      const nextPublicSlug = publicRegistrationSlug(nextRoute);
      if (nextPublicSlug) setPublicSlug(nextPublicSlug);
    };
    addEventListener("hashchange", listener);
    return () => removeEventListener("hashchange", listener);
  }, []);

  if (publicSlug) return <PublicRegistration slug={publicSlug} />;
  return <CommissionApp />;
}

function CommissionApp() {
  const [section, setSection] = useState("accueil");
  const [competitions, setCompetitions] = useState(readLocalCompetitions);
  const [selectedCompetitionId, setSelectedCompetitionId] = useState(null);
  const [supabaseLoaded, setSupabaseLoaded] = useState(!isSupabaseConfigured);
  const remoteSnapshotRef = useRef("");
  const refreshRunningRef = useRef(false);

  useEffect(() => {
    persistCompetitions(competitions);
    if (!isSupabaseConfigured || !supabaseLoaded) return;

    const currentSnapshot = snapshot(competitions);
    if (currentSnapshot === remoteSnapshotRef.current) return;

    Promise.all(competitions.map(saveCompetition))
      .then(() => { remoteSnapshotRef.current = currentSnapshot; })
      .catch((error) => console.error("Synchronisation impossible", error));
  }, [competitions, supabaseLoaded]);

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined;

    const refresh = async () => {
      if (refreshRunningRef.current || document.visibilityState === "hidden") return;
      refreshRunningRef.current = true;
      try {
        const remoteItems = prepareCompetitions(await loadCompetitions());
        const migrationDone = localStorage.getItem(SUPABASE_MIGRATION_KEY) === "done";

        if (!migrationDone && remoteItems.length === 0) {
          const localItems = readLocalCompetitions();
          if (localItems.length > 0) {
            await Promise.all(localItems.map(saveCompetition));
            const localSnapshot = snapshot(localItems);
            remoteSnapshotRef.current = localSnapshot;
            localStorage.setItem(SUPABASE_MIGRATION_KEY, "done");
            setCompetitions(localItems);
            return;
          }
        }

        localStorage.setItem(SUPABASE_MIGRATION_KEY, "done");
        setCompetitions((current) => {
          const mergedItems = prepareCompetitions(mergeCompetitionLists(current, remoteItems));
          const remoteSnapshot = snapshot(remoteItems);
          const mergedSnapshot = snapshot(mergedItems);

          // Remember exactly what Supabase contained. If the merge rescued a
          // result from this tablet, the normal save effect will write the
          // converged version back so every other tablet receives it.
          remoteSnapshotRef.current = remoteSnapshot;
          return snapshot(current) === mergedSnapshot ? current : mergedItems;
        });
      } catch (error) {
        console.error("Chargement Supabase impossible", error);
      } finally {
        setSupabaseLoaded(true);
        refreshRunningRef.current = false;
      }
    };

    refresh();
    const interval = setInterval(refresh, LIVE_REFRESH_MS);
    const focusListener = () => refresh();
    const visibilityListener = () => { if (document.visibilityState === "visible") refresh(); };
    addEventListener("focus", focusListener);
    document.addEventListener("visibilitychange", visibilityListener);
    return () => {
      clearInterval(interval);
      removeEventListener("focus", focusListener);
      document.removeEventListener("visibilitychange", visibilityListener);
    };
  }, []);

  useEffect(() => {
    const listener = (event) => { if (Array.isArray(event.detail)) setCompetitions(prepareCompetitions(event.detail)); };
    addEventListener("nanbudo:competitions-updated", listener);
    return () => removeEventListener("nanbudo:competitions-updated", listener);
  }, []);

  function showCompetitions(competitionId = null) { setSelectedCompetitionId(competitionId); setSection("competitions"); }
  async function deleteCompetition(id) { if (isSupabaseConfigured) await removeCompetition(id); }

  return <div className={`app ${section === "accueil" ? "home-screen" : ""}`}>
    <header className="header"><img src={`${import.meta.env.BASE_URL}assets/logo-afdp.png`} alt="AFDP Nanbudo" className="header-logo" /><div className="header-text"><p className="surtitle">AFDP NANBUDO</p><h1>Nanbudo Competition</h1><p className="subtitle">Cycle complet des compétitions : inscriptions, catégories, poules, arbitrage et résultats.</p></div></header>
    <nav className="navigation"><button className={section === "accueil" ? "active" : ""} onClick={() => setSection("accueil")}>Accueil</button><button className={section === "competitions" ? "active" : ""} onClick={() => showCompetitions()}>Compétitions</button></nav>
    <main className="content">{section === "accueil" ? <Home competitions={competitions} onSelect={showCompetitions} onCreate={() => showCompetitions()} /> : <CompetitionManager competitions={competitions} setCompetitions={setCompetitions} initialCompetitionId={selectedCompetitionId} onDeleteCompetition={deleteCompetition} />}</main>
    <footer><strong>AFDP Nanbudo France · Commission Compétition</strong><span>Compétitions uniquement</span></footer>
  </div>;
}

function formatCompetitionDate(date) {
  if (!date) return "Date à définir";
  const parsedDate = new Date(`${date}T12:00:00`);
  return Number.isNaN(parsedDate.getTime()) ? date : new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(parsedDate);
}

function statusClass(status = "") {
  if (status.toLowerCase().includes("termin")) return "finished";
  if (status.toLowerCase().includes("cours")) return "ongoing";
  return "open";
}

function Home({ competitions, onSelect, onCreate }) { return <section className="hero hero-wallpaper home-competitions"><div className={`home-competition-grid ${competitions.length === 1 ? "single" : ""}`}>{competitions.length === 0 ? <div className="home-empty-state"><span className="home-empty-icon">🏆</span><h2>Aucune compétition disponible</h2><p>Créez une compétition pour commencer à recevoir des inscriptions.</p><button className="home-create-button" onClick={onCreate}>Créer une compétition</button></div> : competitions.map((competition) => <button className="home-competition-card" key={competition.id} onClick={() => onSelect(competition.id)}><span className="home-card-heading"><span>🏆</span><strong>{competition.nom}</strong></span><span className="home-card-details"><span>📅 {formatCompetitionDate(competition.date)}</span><span>📍 {competition.lieu || "Ville à définir"}</span><span>👥 {competition.competitors?.length || 0} compétiteur{competition.competitors?.length === 1 ? "" : "s"}</span></span><span className={`home-card-status ${statusClass(competition.statut)}`}><i />{competition.statut || "Inscriptions ouvertes"}</span><span className="home-card-action">Accéder à la compétition →</span></button>)}</div></section>; }
