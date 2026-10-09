import { useMemo, useState } from "react";
import { setPoolTatami } from "./competitionLogic";
import { balancedTatamiAssignments, buildPlanning, isKata, minutesToTime, PLANNING_TATAMIS } from "./planningLogic";
import { downloadPdfWithDejaVu } from "./pdfExport";
import { sortArbitrationMatches } from "./arbitrationSorting";

function PlanningManager({ competition, onUpdateCompetition }) {
  const [planningNotice, setPlanningNotice] = useState("");
  const planning = useMemo(() => buildPlanning(competition), [competition]);
  const competitors = new Map((competition.competitors || []).map((item) => [String(item.id), item]));
  const passageRows = useMemo(() => {
    const rows = [];
    const planningByCategory = new Map(planning.entries.map((entry) => [String(entry.categoryId), entry]));
    (competition.pools || []).forEach((pool, poolIndex) => {
      const entry = planningByCategory.get(String(pool.categoryId || pool.id));
      if (!entry) return;
      (pool.matches || []).forEach((match) => rows.push({
        entry,
        pool,
        match,
        planningStart: entry.start,
        planningOrder: entry.order,
        poolOrder: poolIndex,
      }));
    });
    return rows.sort(sortArbitrationMatches);
  }, [planning, competition.pools]);
  const change = (entry, patch) => { const planningAdjustments = { ...(competition.planningAdjustments || {}), [entry.categoryId]: { ...(competition.planningAdjustments?.[entry.categoryId] || {}), ...patch } }; const pools = patch.tatami ? competition.pools.map((pool) => String(pool.categoryId || pool.id) === entry.categoryId ? setPoolTatami(pool, Number(patch.tatami)) : pool) : competition.pools; onUpdateCompetition({ ...competition, pools, planningAdjustments }); };
  const recalculate = (reset = false) => {
    const assignments = balancedTatamiAssignments(competition.categories || [], PLANNING_TATAMIS.length);
    const pools = (competition.pools || []).map((pool) => setPoolTatami(pool, assignments.get(String(pool.categoryId || pool.id)) || pool.tatami || 1));
    const planningAdjustments = reset ? {} : (competition.planningAdjustments || {});
    onUpdateCompetition({ ...competition, pools, planningAdjustments });
    setPlanningNotice(reset ? "Planning réinitialisé et tatamis rééquilibrés." : "Planning recalculé. Les horaires sont mis à jour automatiquement.");
  };
  const exportPlanningPdf = async () => {
    const safeName = String(competition.nom || "Competition")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]+/g, "_")
      .replace(/^_+|_+$/g, "");

    const lines = [
      `DÉROULEMENT DÉTAILLÉ · ${competition.nom || "Compétition"}`,
      `${competition.lieu || "Lieu à définir"} · ${competition.date || "Date à définir"}`,
      "",
    ];

    const appendDetailedRunningOrder = () => {
      lines.push("FEUILLES DE DÉROULEMENT · PASSAGES ET CONFRONTATIONS", "");
      PLANNING_TATAMIS.forEach((tatami) => {
        lines.push(`================ TATAMI ${tatami} ================`, "");
        const rows = passageRows.filter(({ entry }) => entry.tatami === tatami);
        let previousPoolId = null;
        rows.forEach(({ entry, pool, match }) => {
          if (String(pool.id) !== previousPoolId) {
            lines.push(`${minutesToTime(entry.start)} · ${entry.name} · ${entry.disciplineLabel}`);
            lines.push(`${pool.nom || "Poule"}`);
            previousPoolId = String(pool.id);
          }
          const aka = competitors.get(String(match.competitorId || match.akaId));
          const shiro = competitors.get(String(match.shiroId));
          if (isKata(entry.discipline)) {
            lines.push(`#${match.ordre || "-"} · ${aka?.nom || "Inconnu"} ${aka?.prenom || ""}`);
          } else {
            lines.push(`#${match.ordre || "-"} · AKA: ${aka?.nom || "Inconnu"} ${aka?.prenom || ""}  vs  SHIRO: ${shiro?.nom || "Inconnu"} ${shiro?.prenom || ""}`);
          }
          const nextRow = rows[rows.indexOf(rows.find((row) => row.match.id === match.id)) + 1];
          if (!nextRow || String(nextRow.pool.id) !== String(pool.id)) lines.push("");
        });
        lines.push("");
      });
    };

    appendDetailedRunningOrder();

    await downloadPdfWithDejaVu({
      lines,
      filename: `Deroulement_${safeName || "Competition"}.pdf`,
      landscape: true,
    });
  };
  if (!(competition.pools || []).length) return <div className="empty-state"><h3>Planning indisponible</h3><p>Générez et validez d’abord les poules : le planning apparaîtra automatiquement, sans ressaisie.</p></div>;
  const kataEntries = planning.entries.filter((entry) => isKata(entry.discipline));
  const combatEntries = planning.entries.filter((entry) => !isKata(entry.discipline));
  return <section className="planning-manager"><div className="manager-header planning-heading"><div><p className="surtitle">PROGRAMME AUTOMATIQUE</p><h2>Planning</h2><p>Les Kata sont terminés en premier sur l’ensemble des tatamis. Les Randori / Ju-Randori démarrent dès la fin du dernier Kata, même si celle-ci intervient avant midi.</p></div><div className="planning-actions"><button className="primary" onClick={() => recalculate(false)}>Recalculer automatiquement le planning</button><button onClick={() => recalculate(true)}>Réinitialiser le planning</button><button onClick={exportPlanningPdf}>Exporter / imprimer le déroulement détaillé</button><button onClick={() => window.print()}>Imprimer le planning</button></div></div>
    <Session title="PHASE 1 · KATA" entries={kataEntries} competitors={competitors} onChange={change} />
    <div className="planning-break"><strong>FIN DES KATA</strong><span>{minutesToTime(planning.kataEnd)} · Début immédiat des Randori / Ju-Randori</span></div>
    <Session title="PHASE 2 · RANDORI / JU-RANDORI" entries={combatEntries} competitors={competitors} onChange={change} />
    <div className="planning-ceremony">{minutesToTime(planning.ceremonyStart)} · REMISE DES MÉDAILLES / CÉRÉMONIE</div></section>;
}
function Session({ title, entries, competitors, onChange }) { return <><div className="planning-session-label">{title}</div><div className="planning-grid">{PLANNING_TATAMIS.map((tatami) => <div className="tatami-column" key={tatami}><h3>TATAMI {tatami}</h3>{entries.filter((e) => e.tatami === tatami).map((entry) => <article className="planning-card" key={entry.categoryId}><div className="planning-card-top"><strong>{minutesToTime(entry.start)} – {minutesToTime(entry.end)}</strong><span>{entry.duration} min</span></div><h4>{entry.name}</h4><p>{entry.disciplineLabel}</p>{entry.finals?.length > 0 && <div className="planning-finals"><strong>TABLEAU FINAL · Après les deux poules</strong>{entry.finals.map((finalMatch) => <p key={finalMatch.label}><strong>{finalMatch.label}</strong> · {finalMatch.participants} · Créneau réservé</p>)}</div>}<div className="planning-controls"><label>Tatami<select value={entry.tatami} onChange={(e) => onChange(entry, { tatami: +e.target.value })}>{PLANNING_TATAMIS.map((n) => <option key={n}>{n}</option>)}</select></label><label>Début<input type="time" value={`${String(Math.floor(entry.start / 60)).padStart(2,"0")}:${String(entry.start % 60).padStart(2,"0")}`} onChange={(e) => { const [h,m] = e.target.value.split(":").map(Number); onChange(entry, { start: h * 60 + m }); }} /></label><label>Ordre<input type="number" value={entry.order} onChange={(e) => onChange(entry, { order: +e.target.value })} /></label></div><table><thead><tr><th>Club</th><th>Nom</th><th>Prénom</th></tr></thead><tbody>{entry.competitors.map((id) => { const c = competitors.get(String(id)); return <tr key={id}><td>{c?.club || "—"}</td><td>{c?.nom || "Inconnu"}</td><td>{c?.prenom || "—"}</td></tr>; })}</tbody></table></article>)}</div>)}</div></>; }
export default PlanningManager;
