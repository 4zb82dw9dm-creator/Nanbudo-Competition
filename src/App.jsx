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

        const remoteSnapshot = snapshot(remoteItems);
        remoteSnapshotRef.current = remoteSnapshot;
        localStorage.setItem(SUPABASE_MIGRATION_KEY, "done");
        setCompetitions((current) => snapshot(current) === remoteSnapshot ? current : remoteItems);
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
