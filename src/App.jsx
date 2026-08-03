import { useMemo, useState } from "react";
import "./style.css";
import "./home.css";
import CompetitionManager from "./CompetitionManager";
import RegistrationManager from "./RegistrationManager";
import CompetitorManager from "./CompetitorManager";
import MaintenanceManager from "./MaintenanceManager";
import logoAfdp from "./assets/logo-afdp.png";
import { COMPETITIONS_STORAGE_KEY } from "./backupUtils";
import { buildDocumentCardMeta, escapeDocumentHtml, getCompetitionDocuments, getDocumentDefinition, getOfficialPlanningDocument } from "./documentLibrary";

function App() {
  const [section, setSection] = useState("accueil");
  const [commissionMode, setCommissionMode] = useState(false);
  const [contentVersion, setContentVersion] = useState(0);

  const publicSections = ["accueil", "inscriptions", "organisateurs", "documents"];
  const isPublic = publicSections.includes(section) && !commissionMode;

  function openPublic(id) {
    setCommissionMode(false);
    setSection(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openCommission() {
    setCommissionMode(true);
    setSection("competitions");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function leaveCommission() {
    setCommissionMode(false);
    setSection("accueil");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleMaintenanceResetComplete() {
    setContentVersion((version) => version + 1);
    leaveCommission();
  }

  const commissionNav = [
    ["competitions", "🏆", "Compétitions"],
    ["inscriptions", "✍", "Inscriptions"],
    ["competiteurs", "🥋", "Compétiteurs"],
    ["organisateurs", "♙", "Organisateurs"],
    ["documents", "▤", "Documents"],
    ["maintenance", "⚙", "Paramètres"],
  ];

  return (
    <div className={`app ${isPublic ? "public-app" : "commission-app"}`}>
      {isPublic ? (
        <>
          <header className="public-header">
            <button className="brand-button" type="button" onClick={() => openPublic("accueil")}>
              <img src={logoAfdp} alt="AFDP Nanbudo France" />
              <span><strong>AFDP NANBUDO FRANCE</strong><small>Commission Compétition</small></span>
            </button>
            <nav className="public-nav" aria-label="Navigation principale">
              <button onClick={() => openPublic("inscriptions")}>Inscriptions</button>
              <button onClick={() => openPublic("organisateurs")}>Organisateurs</button>
              <button onClick={() => openPublic("documents")}>Documents</button>
              <button className="commission-access" onClick={openCommission}>🔒 Espace Commission</button>
            </nav>
          </header>

          {section === "accueil" && (
            <main className="public-home">
              <section className="nanbudo-hero">
                <div className="hero-overlay" />
                <div className="hero-content">
                  <p className="hero-kicker">AFDP NANBUDO FRANCE · COMMISSION COMPÉTITION</p>
                  <h1>Vivre la compétition<br />Nanbudo</h1>
                  <p className="hero-lead">Inscriptions, informations organisateurs et documents : retrouvez ici les services utiles pour participer aux compétitions.</p>
                  <div className="hero-actions">
                    <button className="hero-primary" onClick={() => openPublic("inscriptions")}>S'inscrire à une compétition</button>
                    <button className="hero-secondary" onClick={() => openPublic("organisateurs")}>Espace organisateur</button>
                  </div>
                </div>
                <div className="hero-values" aria-label="Valeurs du Nanbudo">
                  <span>FORCE</span><i>•</i><span>COURAGE</span><i>•</i><span>CONVICTION</span>
                </div>
              </section>

              <section className="public-services">
                <div className="public-section-heading">
                  <p className="surtitle">COMPÉTITIONS</p>
                  <h2>Tout pour participer et organiser</h2>
                  <p>Un accès simple aux services de la Commission Compétition.</p>
                </div>
                <div className="service-grid">
                  <button className="service-card" onClick={() => openPublic("inscriptions")}>
                    <span className="service-icon">✍</span><span><strong>Inscriptions aux compétitions</strong><small>Inscrire les compétiteurs et préparer les données nécessaires à la compétition.</small></span><b>→</b>
                  </button>
                  <button className="service-card" onClick={() => openPublic("organisateurs")}>
                    <span className="service-icon">🏟</span><span><strong>Espace organisateur</strong><small>Préparation, besoins matériels, informations pratiques et suivi de l'événement.</small></span><b>→</b>
                  </button>
                  <button className="service-card" onClick={() => openPublic("documents")}>
                    <span className="service-icon">▤</span><span><strong>Documents</strong><small>Guides, checklists et ressources utiles pour les clubs et les compétiteurs.</small></span><b>→</b>
                  </button>
                </div>
              </section>

              <section className="values-band">
                <p>LES VALEURS DU NANBUDO</p>
                <div><strong>FORCE</strong><span>COURAGE</span><strong>CONVICTION</strong></div>
              </section>

              <section className="commission-teaser">
                <div><p className="surtitle">COMMISSION COMPÉTITION</p><h2>Espace de gestion réservé</h2><p>Accès aux outils de préparation, gestion, arbitrage et résultats des compétitions.</p></div>
                <button onClick={openCommission}>🔒 Accéder à l'Espace Commission</button>
              </section>
            </main>
          )}

          {section !== "accueil" && (
            <main className="public-content">
              <button className="public-back" type="button" onClick={() => openPublic("accueil")}>← Retour à l'accueil</button>
              {section === "inscriptions" && <RegistrationManager />}
              {section === "organisateurs" && <OrganizerSection />}
              {section === "documents" && <DocumentsSection />}
            </main>
          )}
        </>
      ) : (
        <>
          <header className="top-banner">
            <div className="top-banner-inner">
              <img src={logoAfdp} alt="AFDP Nanbudo" className="top-logo" />
              <div className="top-banner-text"><p className="surtitle">AFDP NANBUDO</p><h1>Commission Compétition</h1><p className="subtitle">Gestion et organisation des compétitions</p></div>
              <button className="exit-commission" type="button" onClick={leaveCommission}>← Accueil public</button>
            </div>
          </header>
          <nav className="navigation commission-navigation">
            {commissionNav.map(([id, icon, label]) => <button key={id} className={section === id ? "active" : ""} onClick={() => setSection(id)}>{icon} {label}</button>)}
          </nav>
          <main className="content" key={contentVersion}>
            {section === "competitions" && <CompetitionManager />}
            {section === "inscriptions" && <RegistrationManager />}
            {section === "competiteurs" && <CompetitorManager />}
            {section === "organisateurs" && <OrganizerSection />}
            {section === "documents" && <DocumentsSection />}
            {section === "maintenance" && <MaintenanceManager onResetComplete={handleMaintenanceResetComplete} />}
          </main>
        </>
      )}

      <footer className="main-footer"><strong>AFDP Nanbudo France · Commission Compétition</strong><span>FORCE · COURAGE · CONVICTION</span></footer>
    </div>
  );
}

function OrganizerSection() {
  return <section><div className="section-title"><p className="surtitle">CLUBS ORGANISATEURS</p><h2>Organisation d'une compétition</h2></div><div className="action-grid"><div className="action-card"><h3>Candidature</h3><p>Centraliser les candidatures des clubs souhaitant accueillir une compétition.</p></div><div className="action-card"><h3>Préparation</h3><p>Suivre les besoins humains, matériels et administratifs.</p></div><div className="action-card"><h3>Jour J</h3><p>Retrouver les contrôles essentiels pour le déroulement de la compétition.</p></div><div className="action-card"><h3>Bilan</h3><p>Regrouper les résultats, retours et documents après l'événement.</p></div></div></section>;
}

function readCompetitionsForDocuments() {
  try {
    const competitions = JSON.parse(localStorage.getItem(COMPETITIONS_STORAGE_KEY) || "[]");
    return Array.isArray(competitions) ? competitions : [];
  } catch {
    return [];
  }
}

function DocumentsSection() {
  const competitions = useMemo(readCompetitionsForDocuments, []);
  const [selectedCompetitionId, setSelectedCompetitionId] = useState(() => localStorage.getItem("nanbudo-selected-competition-id") || competitions[0]?.id || "");
  const selectedCompetition = competitions.find((competition) => String(competition.id) === String(selectedCompetitionId)) || competitions[0] || null;
  const documents = getCompetitionDocuments(selectedCompetition || {});
  const officialPlanning = getOfficialPlanningDocument(selectedCompetition || {});
  const [selectedDocumentId, setSelectedDocumentId] = useState(officialPlanning?.id || documents[0]?.id || null);
  const selectedDocument = documents.find((document) => document.id === selectedDocumentId) || officialPlanning || documents[0] || null;
  const missingPlanningMessage = getDocumentDefinition("official-planning").emptyMessage;

  function openDocument(document) {
    setSelectedDocumentId(document.id);
    const popup = window.open("", "_blank");
    if (!popup) return;
    popup.document.write(document.htmlContent || `<!doctype html><html><head><title>${escapeDocumentHtml(document.title)}</title><style>body{font-family:Arial,sans-serif;margin:32px;color:#172033;white-space:pre-wrap;line-height:1.5}</style></head><body><pre>${escapeDocumentHtml(document.content)}</pre></body></html>`);
    popup.document.close();
  }

  return (
    <section>
      <div className="section-title"><p className="surtitle">RESSOURCES</p><h2>Documents</h2><p>Bibliothèque des documents générés par compétition.</p></div>
      {competitions.length > 1 && (
        <label className="action-card">Compétition
          <select value={selectedCompetition?.id || ""} onChange={(event) => { setSelectedCompetitionId(event.target.value); setSelectedDocumentId(null); }}>
            {competitions.map((competition) => <option key={competition.id} value={competition.id}>{competition.nom || "Compétition sans nom"}</option>)}
          </select>
        </label>
      )}
      {!selectedCompetition || !officialPlanning ? (
        <article className="competition-card"><h3>Planning officiel</h3><p>{missingPlanningMessage}</p></article>
      ) : (
        <div className="documents">
          {documents.map((document) => {
            const meta = buildDocumentCardMeta(document);
            return <button type="button" key={document.id} onClick={() => openDocument(document)}><strong>{meta.title}</strong><small>{meta.description}</small></button>;
          })}
        </div>
      )}
      {selectedDocument && <pre className="competition-card" style={{ whiteSpace: "pre-wrap", textAlign: "left" }}>{selectedDocument.content}</pre>}
    </section>
  );
}

export default App;
