import { createSimplePdf, downloadBlob, escapeHtml, printHtmlDocument } from "./exportUtils";
import { disciplineLabel } from "./competitionLogic";

function ResultsManager({ competition }) {
  const pools = competition.pools || [];
  const competitors = competition.competitors || [];
  const categories = competition.categories || [];

  function getCompetitor(id) { return competitors.find((competitor) => competitor.id === id); }
  function getCategory(id) { return categories.find((category) => category.id === id); }

  const finishedPools = pools.filter((pool) => pool.podium);

  function competitorName(id) {
    const competitor = getCompetitor(id);
    if (!competitor) return "—";
    return `${competitor.nom} ${competitor.prenom}`;
  }

  function rankingRows(pool) {
    const ranking = pool.rankingLocked || [];
    if (ranking.length) return ranking.map((row, index) => ({ rank: index + 1, competitorId: row.competitorId || row.id, points: row.points, score: row.score || row.totalScore }));
    return [pool.podium.firstId, pool.podium.secondId, pool.podium.thirdId, pool.podium.fourthId].filter(Boolean).map((competitorId, index) => ({ rank: index + 1, competitorId }));
  }

  function printResults() { window.print(); }

  function resultsDocumentHtml({ autoPrint = false } = {}) {
    const logo = `${window.location.origin}${import.meta.env.BASE_URL}assets/logo-afdp.png`;
    return `<!doctype html><html><head><meta charset="utf-8"><title>Résultats - ${escapeHtml(competition.nom)}</title><style>body{font-family:Arial,sans-serif;color:#182033;margin:0;background:#fff}.result-page{box-sizing:border-box;min-height:100vh;padding:34px;page-break-after:always}.header{display:flex;align-items:center;gap:18px;border-bottom:5px solid #d71920;padding-bottom:16px}img{height:76px}.surtitle{color:#d71920;font-weight:800;letter-spacing:.14em;text-transform:uppercase;margin:0 0 6px}h1,h2{margin:0}.meta{margin:12px 0 22px;color:#5a6475}.podium{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:18px 0}.podium-card{border:2px solid #f0c94b;border-radius:16px;padding:14px;background:#fff8dc;text-align:center}.podium-card:first-child{transform:scale(1.03);background:#fff3b0}.podium-card strong{display:block;font-size:28px}.podium-card span{display:block;font-weight:800;margin-top:8px}.podium-card small{display:block;color:#5a6475}table{width:100%;border-collapse:collapse;margin-top:18px}th,td{border:1px solid #d9dee8;padding:10px;text-align:left}th{background:#182033;color:#fff}.rank{font-weight:800;color:#d71920}.footer{margin-top:24px;color:#5a6475;font-size:12px}@media print{.result-page{page-break-after:always}}</style></head><body>${finishedPools.map((pool) => { const category = getCategory(pool.categoryId); const rows = rankingRows(pool); const discipline = disciplineLabel(pool.discipline || category?.discipline); return `<section class="result-page"><header class="header"><img src="${logo}" alt="AFDP"><div><p class="surtitle">Résultats officiels</p><h1>${escapeHtml(competition.nom)}</h1><p class="meta">${escapeHtml(competition.date || "Date à définir")} · ${escapeHtml(competition.lieu || "Lieu à définir")}</p></div></header><main><p class="surtitle">${escapeHtml(discipline)}</p><h2>${escapeHtml(category?.nom || pool.nom)}</h2><p class="meta">Catégorie : ${escapeHtml(category?.nom || pool.nom)} · Discipline : ${escapeHtml(discipline)}</p><div class="podium">${[pool.podium.firstId, pool.podium.secondId, pool.podium.thirdId].map((id, index) => { const c = getCompetitor(id); return `<div class="podium-card"><strong>${["🥇", "🥈", "🥉"][index]}</strong><span>${escapeHtml(competitorName(id))}</span><small>${escapeHtml(c?.club || "Club non renseigné")}</small></div>`; }).join("")}</div><table><thead><tr><th>Classement</th><th>Compétiteur</th><th>Club</th><th>Score / points</th></tr></thead><tbody>${rows.map((row) => { const c = getCompetitor(row.competitorId); return `<tr><td class="rank">${row.rank}</td><td>${escapeHtml(competitorName(row.competitorId))}</td><td>${escapeHtml(c?.club || "—")}</td><td>${escapeHtml(row.score ?? row.points ?? "—")}</td></tr>`; }).join("")}</tbody></table></main><p class="footer">AFDP Nanbudo France · Commission Compétition</p></section>`; }).join("")}<script>${autoPrint ? "window.addEventListener('load',()=>window.print())" : ""}</script></body></html>`;
  }

  function exportResultsPdf() {
    const pages = finishedPools.map((pool) => {
      const category = getCategory(pool.categoryId);
      const discipline = disciplineLabel(pool.discipline || category?.discipline);
      return {
        title: `${competition.nom} - ${category?.nom || pool.nom}`,
        lines: [
          `Date : ${competition.date || "Date à définir"}`,
          `Categorie : ${category?.nom || pool.nom}`,
          `Discipline : ${discipline}`,
          "Podium",
          `1. ${competitorName(pool.podium.firstId)} - ${getCompetitor(pool.podium.firstId)?.club || "Club non renseigné"}`,
          `2. ${competitorName(pool.podium.secondId)} - ${getCompetitor(pool.podium.secondId)?.club || "Club non renseigné"}`,
          `3. ${competitorName(pool.podium.thirdId)} - ${getCompetitor(pool.podium.thirdId)?.club || "Club non renseigné"}`,
          "Classement complet",
          ...rankingRows(pool).map((row) => `${row.rank}. ${competitorName(row.competitorId)} - ${getCompetitor(row.competitorId)?.club || "Club non renseigné"} - ${row.score ?? row.points ?? ""}`),
        ],
      };
    });
    downloadBlob(createSimplePdf(pages), `resultats-${competition.nom || "competition"}.pdf`, "application/pdf");
    printHtmlDocument(resultsDocumentHtml({ autoPrint: true }));
  }

  return (
    <div className="results-manager">
      <div className="manager-header"><div><p className="surtitle">RÉSULTATS OFFICIELS</p><h2>Résultats</h2><p>Classements définitifs des catégories terminées.</p></div><div className="category-total"><strong>{finishedPools.length}</strong><span>catégories terminées</span></div><div className="export-actions"><button className="primary" type="button" onClick={printResults}>Imprimer les résultats</button><button className="manage-button" type="button" onClick={exportResultsPdf}>Exporter les résultats en PDF</button></div></div>
      {finishedPools.length === 0 ? <div className="empty-state"><h3>Aucun résultat définitif</h3><p>Les résultats apparaîtront ici lorsqu'une catégorie sera terminée.</p></div> : <div className="competition-list">{finishedPools.map((pool) => { const category = getCategory(pool.categoryId); return <article className="competition" key={pool.id}><div><p className="surtitle">{disciplineLabel(pool.discipline || category?.discipline)}</p><h3>{category?.nom || pool.nom}</h3><p>{pool.closingMode === "finals" ? "Classement de compétition" : "Classement automatique"}</p><div className="pool-ranking"><h3>Podium</h3><div className="ranking-table"><div className="ranking-row"><strong>🥇 1er</strong><span>{competitorName(pool.podium.firstId)}</span></div><div className="ranking-row"><strong>🥈 2e</strong><span>{competitorName(pool.podium.secondId)}</span></div><div className="ranking-row"><strong>🥉 3e</strong><span>{competitorName(pool.podium.thirdId)}</span></div>{pool.podium.fourthId && <div className="ranking-row"><strong>4e</strong><span>{competitorName(pool.podium.fourthId)}</span></div>}</div></div></div></article>; })}</div>}
    </div>
  );
}

export default ResultsManager;
