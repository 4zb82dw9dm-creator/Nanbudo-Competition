import { useEffect, useRef, useState } from "react";
import "./style.css";
import CompetitionManager from "./CompetitionManager";
import Login from "./Login";
import PublicRegistration from "./PublicRegistration";
import { currentRoute, navigate } from "./routing";
import { loadCompetitions, removeCompetition, restoreSession, saveCompetition, signOut } from "./supabase";

export default function App() {
  const [route, setRoute] = useState(currentRoute);
  const [session, setSession] = useState(undefined);
  const [competitions, setCompetitions] = useState([]);
  const loaded = useRef(false);
  useEffect(() => { const listener = () => setRoute(currentRoute()); addEventListener("hashchange", listener); return () => removeEventListener("hashchange", listener); }, []);
  useEffect(() => { restoreSession().then(setSession); }, []);
  useEffect(() => { if (!session?.access_token) return; loadCompetitions(session.access_token).then((items) => { setCompetitions(items); loaded.current = true; }).catch((error) => alert(error.message)); }, [session]);
  useEffect(() => { if (!loaded.current || !session?.access_token) return; Promise.all(competitions.map((item) => saveCompetition(item, session.access_token))).catch((error) => alert(`Synchronisation impossible : ${error.message}`)); }, [competitions, session]);

  const publicMatch = route.match(/^\/inscription\/([^/]+)$/);
  if (publicMatch) return <PublicRegistration slug={decodeURIComponent(publicMatch[1])} />;
  if (session === undefined) return <main className="route-loading">Vérification de la session…</main>;
  if (!session) {
    if (route !== "/connexion") navigate("/connexion");
    return <Login onSuccess={(value) => { setSession(value); navigate("/"); }} />;
  }
  return <CommissionApp competitions={competitions} setCompetitions={setCompetitions} onDeleteCompetition={(id) => removeCompetition(id, session.access_token)} onLogout={async () => { await signOut(); loaded.current = false; setSession(null); setCompetitions([]); navigate("/connexion"); }} />;
}

function CommissionApp({ competitions, setCompetitions, onDeleteCompetition, onLogout }) {
  const [section, setSection] = useState("accueil"); const [selectedCompetitionId, setSelectedCompetitionId] = useState(null);
  function showCompetitions(id = null) { setSelectedCompetitionId(id); setSection("competitions"); }
  return <div className={`app ${section === "accueil" ? "home-screen" : ""}`}><header className="header"><img src={`${import.meta.env.BASE_URL}assets/logo-afdp.png`} alt="AFDP Nanbudo" className="header-logo" /><div className="header-text"><p className="surtitle">AFDP NANBUDO · COMMISSION</p><h1>Nanbudo Competition</h1><p className="subtitle">Administration sécurisée des compétitions.</p></div><button className="logout-button" onClick={onLogout}>Déconnexion</button></header><nav className="navigation"><button className={section === "accueil" ? "active" : ""} onClick={() => setSection("accueil")}>Accueil</button><button className={section === "competitions" ? "active" : ""} onClick={() => showCompetitions()}>Compétitions</button></nav><main className="content">{section === "accueil" ? <Home competitions={competitions} onSelect={showCompetitions} /> : <CompetitionManager competitions={competitions} setCompetitions={setCompetitions} initialCompetitionId={selectedCompetitionId} onDeleteCompetition={onDeleteCompetition} />}</main><footer><strong>AFDP Nanbudo France · Commission Compétition</strong></footer></div>;
}

function Home({ competitions, onSelect }) { return <section className="hero hero-wallpaper home-competitions"><div className={`home-competition-grid ${competitions.length === 1 ? "single" : ""}`}>{competitions.length === 0 ? <div className="home-empty-state"><h2>Aucune compétition</h2><p>Ouvrez l’onglet Compétitions pour en créer une.</p></div> : competitions.map((competition) => <button className="home-competition-card" key={competition.id} onClick={() => onSelect(competition.id)}><span className="home-card-heading"><strong>{competition.nom}</strong></span><span className="home-card-details"><span>📅 {competition.date || "Date à définir"}</span><span>📍 {competition.lieu || "Ville à définir"}</span></span><span className="home-card-action">Accéder à la compétition →</span></button>)}</div></section>; }
