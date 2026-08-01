const EVENT_ORDER = [
  "kata0",
  "kata1",
  "kata2",
  "randori",
  "juRandori1",
  "juRandori2",
];

const EVENT_LABELS = {
  kata0: "Kata 0",
  kata1: "Kata 1",
  kata2: "Kata 2",
  randori: "Randori",
  juRandori1: "Ju Randori 1",
  juRandori2: "Ju Randori 2",
};

const EVENT_DURATIONS = {
  kata0: 10,
  kata1: 10,
  kata2: 10,
  randori: 15,
  juRandori1: 15,
  juRandori2: 15,
};

const START_TIME_IN_MINUTES = 9 * 60 + 30;
const TATAMI_COUNT = 3;

function PlanningManager({ competition, onUpdateCompetition }) {
  const pools = competition.pools || [];
  const categories = competition.categories || [];
  const planning = competition.planning || [];

  function sameId(a, b) {
    return String(a) === String(b);
  }

  function getCategory(categoryId) {
    return categories.find((category) => sameId(category.id, categoryId));
  }

  function getPoolCategory(pool) {
    return getCategory(pool.categoryId);
  }

  function getPoolEvent(pool) {
    return getPoolCategory(pool)?.epreuve || pool.epreuve || "";
  }

  function getEventLabel(eventType) {
    return EVENT_LABELS[eventType] || eventType || "Épreuve";
  }

  function getCategoryName(pool) {
    return getPoolCategory(pool)?.nom || pool.nom || "Catégorie non renseignée";
  }

  function getCompetitorCount(pool) {
    return pool.competitorIds?.length || 0;
  }

  function formatTime(totalMinutes) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  }

  function sortPoolsForPlanning(poolA, poolB) {
    return getCategoryName(poolA).localeCompare(getCategoryName(poolB), "fr", {
      numeric: true,
      sensitivity: "base",
    });
  }

  function generatePlanning() {
    if (pools.length === 0) {
      alert("Le planning ne peut être généré que lorsqu'il existe des poules.");
      return;
    }

    let order = 1;
    let phaseStart = START_TIME_IN_MINUTES;
    const nextPlanning = [];

    EVENT_ORDER.forEach((eventType) => {
      const eventPools = pools
        .filter((pool) => getPoolEvent(pool) === eventType)
        .sort(sortPoolsForPlanning);

      if (eventPools.length === 0) {
        return;
      }

      const tatamiAvailableAt = Array.from({ length: TATAMI_COUNT }, () => phaseStart);
      const duration = EVENT_DURATIONS[eventType] || 15;

      eventPools.forEach((pool) => {
        const tatamiIndex = tatamiAvailableAt.indexOf(Math.min(...tatamiAvailableAt));
        const startInMinutes = tatamiAvailableAt[tatamiIndex];

        nextPlanning.push({
          id: `planning-${pool.id}`,
          poolId: pool.id,
          ordre: order,
          heure: formatTime(startInMinutes),
          tatami: tatamiIndex + 1,
          epreuve: eventType,
          epreuveLabel: getEventLabel(eventType),
          categorie: getCategoryName(pool),
          nombreCompetiteurs: getCompetitorCount(pool),
          dureeMinutes: duration,
        });

        order += 1;
        tatamiAvailableAt[tatamiIndex] += duration;
      });

      phaseStart = Math.max(...tatamiAvailableAt);
    });

    onUpdateCompetition({
      ...competition,
      planning: nextPlanning,
    });
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function exportPlanningPdf() {
    if (planning.length === 0) {
      alert("Génère le planning avant de l'exporter en PDF.");
      return;
    }

    const printableRows = planning
      .map(
        (item) => `<tr><td>${item.ordre}</td><td>${escapeHtml(item.heure)}</td><td>Tatami ${item.tatami}</td><td>${escapeHtml(item.epreuveLabel)}</td><td>${escapeHtml(item.categorie)}</td><td>${item.nombreCompetiteurs}</td></tr>`
      )
      .join("");

    const printWindow = window.open("", "_blank", "noopener,noreferrer");

    if (!printWindow) {
      alert("Impossible d'ouvrir la fenêtre d'export. Autorise les pop-ups pour créer le PDF.");
      return;
    }

    printWindow.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"/><title>Planning - ${escapeHtml(competition.nom || "Compétition")}</title><style>body{font-family:Arial,sans-serif;color:#14213d;margin:32px}h1{margin-bottom:4px}.meta{color:#657080;margin-top:0}table{border-collapse:collapse;width:100%;margin-top:24px}th,td{border:1px solid #d9dee7;padding:10px;text-align:left}th{background:#275296;color:white}@media print{button{display:none}}</style></head><body><h1>Planning de passage</h1><p class="meta">${escapeHtml(competition.nom || "Compétition")}${competition.date ? ` · ${escapeHtml(competition.date)}` : ""}</p><table><thead><tr><th>Ordre</th><th>Heure</th><th>Tatami</th><th>Épreuve</th><th>Catégorie</th><th>Nombre de compétiteurs</th></tr></thead><tbody>${printableRows}</tbody></table><script>window.addEventListener('load',()=>{window.print();});</script></body></html>`);
    printWindow.document.close();
  }

  return (
    <div className="planning-manager">
      <div className="manager-header">
        <div>
          <p className="surtitle">ORDONNANCEMENT</p>
          <h2>Planning</h2>
          <p>Génération automatique des passages sur {TATAMI_COUNT} tatamis à partir de 09:30.</p>
        </div>
        <div className="competitor-actions">
          <button className="primary" type="button" onClick={generatePlanning} disabled={pools.length === 0}>
            Générer automatiquement le planning
          </button>
          <button className="manage-button" type="button" onClick={exportPlanningPdf} disabled={planning.length === 0}>
            Exporter le planning en PDF
          </button>
        </div>
      </div>

      {pools.length === 0 ? (
        <div className="empty-state">
          <span className="empty-number">0</span>
          <h3>Aucune poule disponible</h3>
          <p>Crée d'abord les poules pour générer le planning de passage.</p>
        </div>
      ) : planning.length === 0 ? (
        <div className="beta-note">
          <strong>Planning prêt à générer</strong>
          <p>Les épreuves seront planifiées dans l'ordre : Kata 0, Kata 1, Kata 2, Randori, Ju Randori 1 puis Ju Randori 2.</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="planning-table">
            <thead>
              <tr><th>Ordre</th><th>Heure</th><th>Tatami</th><th>Épreuve</th><th>Catégorie</th><th>Nombre de compétiteurs</th></tr>
            </thead>
            <tbody>
              {planning.map((item) => (
                <tr key={item.id || item.poolId} draggable title="Déplacement par glisser-déposer prévu pour une prochaine version.">
                  <td>{item.ordre}</td><td>{item.heure}</td><td>Tatami {item.tatami}</td><td>{item.epreuveLabel}</td><td>{item.categorie}</td><td>{item.nombreCompetiteurs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default PlanningManager;
