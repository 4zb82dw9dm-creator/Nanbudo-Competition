import { useState } from "react";
import "./style.css";
import CompetitionManager from "./CompetitionManager";
function App() {
  const [section, setSection] = useState("accueil");

  const competitions = [
    {
      nom: "Coupe régionale d'hiver Nord",
      lieu: "Igny",
      statut: "À préparer",
    },
    {
      nom: "Coupe régionale d'hiver Sud",
      lieu: "Marseille",
      statut: "À préparer",
    },
    {
      nom: "Coupe de France",
      lieu: "Crest",
      statut: "À préparer",
    },
    {
      nom: "Coupe régionale de printemps Nord",
      lieu: "Bagneux",
      statut: "À préparer",
    },
    {
      nom: "Coupe régionale de printemps Sud",
      lieu: "Marseille",
      statut: "À préparer",
    },
  ];

  return (
    <div className="app">
      <header className="header">
  <div className="header-text">
    <p className="surtitle">AFDP NANBUDO</p>

    <h1>Commission Compétition</h1>

    <p className="subtitle">
      Gestion et organisation des compétitions
    </p>
  </div>

  <img
    src={`${import.meta.env.BASE_URL}logo-afdp.png`}
    alt="AFDP Nanbudo"
    className="afdp-logo"
  />
</header>
      <nav className="navigation">
        <button
          className={section === "accueil" ? "active" : ""}
          onClick={() => setSection("accueil")}
        >
          Accueil
        </button>

        <button
          className={section === "competitions" ? "active" : ""}
          onClick={() => setSection("competitions")}
        >
          Compétitions
        </button>

        <button
          className={section === "organisateurs" ? "active" : ""}
          onClick={() => setSection("organisateurs")}
        >
          Organisateurs
        </button>

        <button
          className={section === "documents" ? "active" : ""}
          onClick={() => setSection("documents")}
        >
          Documents
        </button>
      </nav>

      <main className="content">
        {section === "accueil" && (
          <>
            <section className="hero">
              <p className="badge">HORIZON 2030</p>

              <h2>Nanbudo Competition</h2>

              <p>
                L'espace de la Commission Compétition pour préparer,
                organiser et suivre les compétitions AFDP Nanbudo.
              </p>

              <button
                className="primary"
                onClick={() => setSection("competitions")}
              >
                Voir les compétitions
              </button>
            </section>

            <section className="dashboard">
              <div className="card">
                <span className="number">5</span>
                <h3>Compétitions</h3>
                <p>Calendrier national et régional</p>
              </div>

              <div className="card">
                <span className="number">01</span>
                <h3>Commission</h3>
                <p>Pilotage et coordination</p>
              </div>

              <div className="card">
                <span className="number">2030</span>
                <h3>Horizon</h3>
                <p>Structurer et développer la compétition</p>
              </div>
            </section>
          </>
        )}

        {section === "competitions" && (
  <CompetitionManager />
)}          
          
        {section === "organisateurs" && (
          <section>
            <div className="section-title">
              <p className="surtitle">CLUBS ORGANISATEURS</p>
              <h2>Organisation d'une compétition</h2>
            </div>

            <div className="action-grid">
              <div className="action-card">
                <h3>Candidature</h3>
                <p>
                  Centraliser les candidatures des clubs souhaitant
                  accueillir une compétition.
                </p>
              </div>

              <div className="action-card">
                <h3>Préparation</h3>
                <p>
                  Suivre les besoins humains, matériels et administratifs.
                </p>
              </div>

              <div className="action-card">
                <h3>Jour J</h3>
                <p>
                  Retrouver les contrôles essentiels pour le déroulement
                  de la compétition.
                </p>
              </div>

              <div className="action-card">
                <h3>Bilan</h3>
                <p>
                  Regrouper les résultats, retours et documents après
                  l'événement.
                </p>
              </div>
            </div>
          </section>
        )}

        {section === "documents" && (
          <section>
            <div className="section-title">
              <p className="surtitle">RESSOURCES</p>
              <h2>Documents</h2>
            </div>

            <div className="documents">
              <button>Guide de l'organisateur</button>
              <button>Checklist compétition</button>
              <button>Communication</button>
              <button>Documents administratifs</button>
            </div>

            <p className="info">
              Les documents pourront être ajoutés progressivement à cette
              application.
            </p>
          </section>
        )}
      </main>

      <footer>
        <strong>AFDP Nanbudo France · Commission Compétition</strong>
        <span>Horizon 2030</span>
      </footer>
    </div>
  );
}

export default App;
