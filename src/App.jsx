import { useEffect, useState } from "react";
import "./style.css";
import CompetitionManager from "./CompetitionManager";
import { persistCompetitions } from "./registrationProcessing";

function shouldOpenCompetitionSection() {
  const searchParams = new URLSearchParams(window.location.search);
  return window.location.hash.startsWith("#inscription-") || searchParams.has("competition") || window.location.pathname.replace(/\/$/, "").endsWith("/inscription");
}

function App() {
  const [section, setSection] = useState(() => shouldOpenCompetitionSection() ? "competitions" : "accueil");
  const [competitions, setCompetitions] = useState(() => JSON.parse(localStorage.getItem("nanbudo_competitions") || "[]"));
  const [selectedCompetitionId, setSelectedCompetitionId] = useState(null);

  useEffect(() => { persistCompetitions(competitions); }, [competitions]);
  useEffect(() => {
    const listener = (event) => { if (Array.isArray(event.detail)) setCompetitions(event.detail); };
    window.addEventListener("nanbudo:competitions-updated", listener);
    return () => window.removeEventListener("nanbudo:competitions-updated", listener);
  }, []);

  function showCompetitions(competitionId = null) {
    setSelectedCompetitionId(competitionId);
    setSection("competitions");
  }

  return (
    <div className={`app ${section === "accueil" ? "home-screen" : ""}`}>
      <header className="header">
        <img src={`${import.meta.env.BASE_URL}assets/logo-afdp.png`} alt="AFDP Nanbudo" className="header-logo" />
        <div className="header-text">
          <p className="surtitle">AFDP NANBUDO</p>
          <h1>Nanbudo Competition</h1>
          <p className="subtitle">Cycle complet des compétitions : inscriptions, catégories, poules, arbitrage et résultats.</p>
        </div>
      </header>

      <nav className="navigation">
        <button className={section === "accueil" ? "active" : ""} onClick={() => setSection("accueil")}>Accueil</button>
        <button className={section === "competitions" ? "active" : ""} onClick={() => showCompetitions()}>Compétitions</button>
      </nav>

      <main className="content">
        {section === "accueil" && <HomeCompetitions competitions={competitions} onSelect={showCompetitions} onCreate={() => showCompetitions()} />}
        {section === "competitions" && <CompetitionManager competitions={competitions} setCompetitions={setCompetitions} initialCompetitionId={selectedCompetitionId} />}
      </main>

      <footer><strong>AFDP Nanbudo France · Commission Compétition</strong><span>Compétitions uniquement</span></footer>
    </div>
  );
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

function HomeCompetitions({ competitions, onSelect, onCreate }) {
  return (
    <section className="hero hero-wallpaper home-competitions" aria-label="Compétitions de Nanbudo disponibles">
      <div className={`home-competition-grid ${competitions.length === 1 ? "single" : ""}`}>
        {competitions.length === 0 ? (
          <div className="home-empty-state">
            <span className="home-empty-icon" aria-hidden="true">🏆</span>
            <h2>Aucune compétition disponible</h2>
            <p>Créez une compétition pour commencer à recevoir des inscriptions.</p>
            <button className="home-create-button" onClick={onCreate}>Créer une compétition</button>
          </div>
        ) : competitions.map((competition) => (
          <button className="home-competition-card" key={competition.id} onClick={() => onSelect(competition.id)} aria-label={`Ouvrir la compétition ${competition.nom}`}>
            <span className="home-card-heading"><span aria-hidden="true">🏆</span><strong>{competition.nom}</strong></span>
            <span className="home-card-details">
              <span><span aria-hidden="true">📅</span>{formatCompetitionDate(competition.date)}</span>
              <span><span aria-hidden="true">📍</span>{competition.lieu || "Ville à définir"}</span>
              <span><span aria-hidden="true">👥</span>{competition.competitors?.length || 0} compétiteur{competition.competitors?.length === 1 ? "" : "s"}</span>
            </span>
            <span className={`home-card-status ${statusClass(competition.statut)}`}><i aria-hidden="true" />{competition.statut || "Inscriptions ouvertes"}</span>
            <span className="home-card-action">Accéder à la compétition <span aria-hidden="true">→</span></span>
          </button>
        ))}
      </div>
    </section>
  );
}

export default App;
