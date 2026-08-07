import { useState } from "react";
import "./style.css";
import CompetitionManager from "./CompetitionManager";

function shouldOpenCompetitionSection() {
  const searchParams = new URLSearchParams(window.location.search);
  return window.location.hash.startsWith("#inscription-") || searchParams.has("competition") || window.location.pathname.replace(/\/$/, "").endsWith("/inscription");
}

function App() {
  const [section, setSection] = useState(() => shouldOpenCompetitionSection() ? "competitions" : "accueil");

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
        <button className={section === "competitions" ? "active" : ""} onClick={() => setSection("competitions")}>Compétitions</button>
      </nav>

      <main className="content">
        {section === "accueil" && <section className="hero hero-wallpaper" aria-label="Combattante de Nanbudo en action"></section>}
        {section === "competitions" && <CompetitionManager />}
      </main>

      <footer><strong>AFDP Nanbudo France · Commission Compétition</strong><span>Compétitions uniquement</span></footer>
    </div>
  );
}

export default App;
