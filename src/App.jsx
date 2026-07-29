import { useState } from "react";
import "./style.css";
import CompetitionManager from "./CompetitionManager";
import logoAfdp from "./assets/logo-afdp.png";

function App() {
  const [section, setSection] = useState("accueil");

  return (
    <div className="app">
      {/* =====================================
          BANDEAU SUPÉRIEUR
      ====================================== */}

      <header className="top-banner">
        <div className="top-banner-inner">
          <img
            src={logoAfdp}
            alt="AFDP Nanbudo"
            className="top-logo"
          />

          <div className="top-banner-text">
            <p className="surtitle">AFDP NANBUDO</p>

            <h1>Commission Compétition</h1>

            <p className="subtitle">
              Gestion et organisation des compétitions
            </p>
          </div>
        </div>
      </header>
      {/* ========================================
          APPLICATION
      ======================================== */}

      <div className="app-layout">
        {/* MENU LATÉRAL */}

        <aside className="sidebar">
          <nav className="sidebar-navigation">
            <button
              className={
                section === "accueil"
                  ? "sidebar-button active"
                  : "sidebar-button"
              }
              onClick={() =>
                setSection("accueil")
              }
            >
              <span className="nav-icon">
                ⌂
              </span>

              <span>Accueil</span>
            </button>

            <button
              className={
                section === "competitions"
                  ? "sidebar-button active"
                  : "sidebar-button"
              }
              onClick={() =>
                setSection("competitions")
              }
            >
              <span className="nav-icon">
                🏆
              </span>

              <span>Compétitions</span>
            </button>

            <button
              className={
                section === "organisateurs"
                  ? "sidebar-button active"
                  : "sidebar-button"
              }
              onClick={() =>
                setSection("organisateurs")
              }
            >
              <span className="nav-icon">
                ♙
              </span>

              <span>Organisateurs</span>
            </button>

            <button
              className={
                section === "documents"
                  ? "sidebar-button active"
                  : "sidebar-button"
              }
              onClick={() =>
                setSection("documents")
              }
            >
              <span className="nav-icon">
                ▤
              </span>

              <span>Documents</span>
            </button>
          </nav>

          <div className="sidebar-footer">
            <strong>
              AFDP Nanbudo France
            </strong>

            <span>
              Horizon 2030
            </span>
          </div>
        </aside>

        {/* ========================================
            CONTENU
        ======================================== */}

        <main className="content">
          {/* ACCUEIL */}

          {section === "accueil" && (
            <div className="home-dashboard">
              <div className="dashboard-title">
                <div>
                  <p className="surtitle">
                    HORIZON 2030
                  </p>

                  <h2>
                    Tableau de bord
                  </h2>

                  <p>
                    Gestion et organisation des compétitions
                    AFDP Nanbudo.
                  </p>
                </div>
              </div>

              {/* CARTES PRINCIPALES */}

              <section className="dashboard-stats">
                <button
                  type="button"
                  className="stat-card"
                  onClick={() =>
                    setSection(
                      "competitions"
                    )
                  }
                >
                  <div className="stat-icon">
                    🏆
                  </div>

                  <div>
                    <strong className="stat-number">
                      Compétitions
                    </strong>

                    <span>
                      Créer et gérer les compétitions
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  className="stat-card"
                  onClick={() =>
                    setSection(
                      "organisateurs"
                    )
                  }
                >
                  <div className="stat-icon">
                    ♙
                  </div>

                  <div>
                    <strong className="stat-number">
                      Organisation
                    </strong>

                    <span>
                      Préparer les événements
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  className="stat-card"
                  onClick={() =>
                    setSection(
                      "documents"
                    )
                  }
                >
                  <div className="stat-icon">
                    ▤
                  </div>

                  <div>
                    <strong className="stat-number">
                      Documents
                    </strong>

                    <span>
                      Guides et ressources
                    </span>
                  </div>
                </button>
              </section>

              {/* PRÉSENTATION */}

              <section className="home-panels">
                <article className="home-panel">
                  <div className="panel-header">
                    <div>
                      <p className="surtitle">
                        COMMISSION COMPÉTITION
                      </p>

                      <h3>
                        Nanbudo Competition
                      </h3>
                    </div>
                  </div>

                  <p>
                    L'espace de la Commission Compétition
                    pour préparer, organiser et suivre les
                    compétitions AFDP Nanbudo.
                  </p>

                  <button
                    className="primary"
                    type="button"
                    onClick={() =>
                      setSection(
                        "competitions"
                      )
                    }
                  >
                    Voir les compétitions
                  </button>
                </article>

                <article className="home-panel">
                  <div className="panel-header">
                    <div>
                      <p className="surtitle">
                        HORIZON 2030
                      </p>

                      <h3>
                        Structurer la compétition
                      </h3>
                    </div>
                  </div>

                  <p>
                    Un outil centralisé pour accompagner
                    l'organisation, l'arbitrage et le suivi
                    des compétitions.
                  </p>
                </article>
              </section>

              {/* ACCÈS RAPIDES */}

              <section className="quick-access">
                <div className="section-title">
                  <p className="surtitle">
                    ACCÈS RAPIDES
                  </p>

                  <h3>
                    Outils de la Commission
                  </h3>
                </div>

                <div className="quick-grid">
                  <button
                    type="button"
                    onClick={() =>
                      setSection(
                        "competitions"
                      )
                    }
                  >
                    <strong>
                      🏆 Compétitions
                    </strong>

                    <span>
                      Créer et gérer une compétition
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setSection(
                        "organisateurs"
                      )
                    }
                  >
                    <strong>
                      ♙ Organisateurs
                    </strong>

                    <span>
                      Préparation et suivi
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setSection(
                        "documents"
                      )
                    }
                  >
                    <strong>
                      ▤ Documents
                    </strong>

                    <span>
                      Guides et ressources
                    </span>
                  </button>
                </div>
              </section>
            </div>
          )}

          {/* COMPÉTITIONS */}

          {section ===
            "competitions" && (
            <CompetitionManager />
          )}

          {/* ORGANISATEURS */}

          {section ===
            "organisateurs" && (
            <section>
              <div className="section-title">
                <p className="surtitle">
                  CLUBS ORGANISATEURS
                </p>

                <h2>
                  Organisation d'une compétition
                </h2>
              </div>

              <div className="action-grid">
                <div className="action-card">
                  <h3>
                    Candidature
                  </h3>

                  <p>
                    Centraliser les candidatures des clubs
                    souhaitant accueillir une compétition.
                  </p>
                </div>

                <div className="action-card">
                  <h3>
                    Préparation
                  </h3>

                  <p>
                    Suivre les besoins humains, matériels
                    et administratifs.
                  </p>
                </div>

                <div className="action-card">
                  <h3>
                    Jour J
                  </h3>

                  <p>
                    Retrouver les contrôles essentiels pour
                    le déroulement de la compétition.
                  </p>
                </div>

                <div className="action-card">
                  <h3>
                    Bilan
                  </h3>

                  <p>
                    Regrouper les résultats, retours et
                    documents après l'événement.
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* DOCUMENTS */}

          {section ===
            "documents" && (
            <section>
              <div className="section-title">
                <p className="surtitle">
                  RESSOURCES
                </p>

                <h2>
                  Documents
                </h2>
              </div>

              <div className="documents">
                <button type="button">
                  Guide de l'organisateur
                </button>

                <button type="button">
                  Checklist compétition
                </button>

                <button type="button">
                  Communication
                </button>

                <button type="button">
                  Documents administratifs
                </button>
              </div>

              <p className="info">
                Les documents pourront être ajoutés
                progressivement à cette application.
              </p>
            </section>
          )}
        </main>
      </div>

      {/* ========================================
          PIED DE PAGE
      ======================================== */}

      <footer className="main-footer">
        <strong>
          AFDP Nanbudo France · Commission Compétition
        </strong>

        <span>
          Horizon 2030
        </span>
      </footer>
    </div>
  );
}

export default App;
