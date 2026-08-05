import { useState } from "react";
import "./style.css";
import CompetitionManager from "./CompetitionManager";

function App() {
  const [section, setSection] = useState("accueil");

  return (
    <div className="app">
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
        {section === "accueil" && (
          <>
            <section className="hero hero-wallpaper"></section>

            <section className="dashboard">
              <div className="card"><span className="number">1</span><h3>Inscriptions</h3><p>Nom, prénom, sexe, naissance, grade, club, ligue, pays et disciplines uniquement.</p></div>
              <div className="card"><span className="number">2</span><h3>Organisation</h3><p>Catégories, poules, tirage, tatamis et ordre de passage.</p></div>
              <div className="card"><span className="number">3</span><h3>Arbitrage</h3><p>Un clic sur un match ouvre directement la feuille officielle adaptée.</p></div>
            </section>
          </>
        )}
        {section === "competitions" && <CompetitionManager />}
      </main>

      <footer><strong>AFDP Nanbudo France · Commission Compétition</strong><span>Compétitions uniquement</span></footer>
    </div>
  );
}

export default App;
