import { disciplineLabel } from "./competitionLogic";
import { competitionRulesEngine } from "./rules/competitionRulesEngine";
import { competitionResults } from "./resultsLogic";

function positionLabel(index) {
  return index === 0 ? "1er" : `${index + 1}e`;
}

function ResultsManager({ competition }) {
  const competitors = competition.competitors || [];
  const finishedResults = competitionResults(competition);
  const getCompetitor = (id) => competitors.find((competitor) => String(competitor.id) === String(id));

  function printResults() { window.print(); }
  function escapePdfText(value) { return String(value || "").replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)"); }
  function exportResultsPdf() {
    const lines = [`Résultats - ${competition.nom || "Compétition"}`, `${competition.lieu || "Lieu à définir"} - ${competition.date || "Date à définir"}`, ""];
    if (!finishedResults.length) lines.push("Aucun résultat définitif.");
    finishedResults.forEach(({ category, pool, ranking }) => {
      lines.push(`${disciplineLabel(category.discipline)} - ${category.nom}${pool ? ` - ${pool.nom}` : ""}`);
      ranking.forEach((entry, index) => {
        const competitor = getCompetitor(entry.competitorId);
        lines.push(`${positionLabel(index)} : ${competitor?.nom || "—"} ${competitor?.prenom || ""} - ${competitor?.club || "Club non renseigné"}`);
      });
      lines.push("");
    });
    const content = ["BT", "/F1 16 Tf", "50 790 Td", "18 TL", ...lines.flatMap((line) => [`(${escapePdfText(line)}) Tj`, "T*"]), "ET"].join("\n");
    const objects = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>", "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>", `<< /Length ${content.length} >>\nstream\n${content}\nendstream`];
    let pdf = "%PDF-1.4\n"; const offsets = [0];
    objects.forEach((object, index) => { offsets.push(pdf.length); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
    const xrefOffset = pdf.length; pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    offsets.slice(1).forEach((offset) => { pdf += `${String(offset).padStart(10, "0")} 00000 n \n`; });
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    const url = URL.createObjectURL(new Blob([pdf], { type: "application/pdf" }));
    const link = document.createElement("a"); link.href = url; link.download = `resultats-${competition.nom || "competition"}.pdf`.replace(/[^a-z0-9._-]+/gi, "-"); document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
  }

  return <div className="results-manager">
    <div className="manager-header"><div><p className="surtitle">RÉSULTATS OFFICIELS</p><h2>Résultats</h2><p>Classements définitifs calculés depuis les feuilles d'arbitrage.</p></div><div className="category-total"><strong>{finishedResults.length}</strong><span>catégories / poules terminées</span></div><button className="primary" type="button" onClick={printResults}>Imprimer les résultats</button><button className="primary" type="button" onClick={exportResultsPdf}>Exporter les résultats en PDF</button></div>
    {!finishedResults.length ? <div className="empty-state"><h3>Aucun résultat définitif</h3><p>Les résultats apparaîtront ici dès qu'une catégorie sera terminée.</p></div> : <div className="competition-list">{finishedResults.map(({ id, category, pool, ranking }) => <article className="competition" key={id}><div><p className="surtitle">{disciplineLabel(category.discipline)}</p><h3>{category.nom}{pool ? ` · ${pool.nom}` : ""}</h3><p>{category.ageGroup || "Âge non renseigné"} · {category.sexe || "Sexe non renseigné"} · {category.gradeGroup || "Grade non renseigné"}</p><div className="pool-ranking"><h3>Classement final</h3><div className="ranking-table">{ranking.map((entry, index) => { const competitor = getCompetitor(entry.competitorId); const score = entry.finalScore ?? (competitionRulesEngine.isKataDiscipline(category.discipline) ? entry.scoreFor : null); return <div className="ranking-row" key={entry.competitorId}><strong>{positionLabel(index)}</strong><span>{competitor ? `${competitor.nom} ${competitor.prenom}` : "—"} · {competitor?.club || "Club non renseigné"}{score != null ? ` · Note ${Number(score).toFixed(2)}` : ""}</span></div>; })}</div></div></div></article>)}</div>}
  </div>;
}

export default ResultsManager;
