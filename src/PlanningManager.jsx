import { useMemo } from "react";
import { setPoolTatami } from "./competitionLogic";
import { balancedTatamiAssignments, buildPlanning, isKata, minutesToTime, PLANNING_TATAMIS } from "./planningLogic";

function PlanningManager({ competition, onUpdateCompetition }) {
  const planning = useMemo(() => buildPlanning(competition), [competition]);
  const competitors = new Map((competition.competitors || []).map((item) => [String(item.id), item]));
  const change = (entry, patch) => { const planningAdjustments = { ...(competition.planningAdjustments || {}), [entry.categoryId]: { ...(competition.planningAdjustments?.[entry.categoryId] || {}), ...patch } }; const pools = patch.tatami ? competition.pools.map((pool) => String(pool.categoryId || pool.id) === entry.categoryId ? setPoolTatami(pool, Number(patch.tatami)) : pool) : competition.pools; onUpdateCompetition({ ...competition, pools, planningAdjustments }); };
  const recalculate = () => {
    const assignments = balancedTatamiAssignments(competition.categories || [], PLANNING_TATAMIS.length);
    const pools = (competition.pools || []).map((pool) => setPoolTatami(pool, assignments.get(String(pool.categoryId || pool.id)) || pool.tatami || 1));
    onUpdateCompetition({ ...competition, pools, planningAdjustments: {} });
  };
  if (!(competition.pools || []).length) return <div className="empty-state"><h3>Planning indisponible</h3><p>Générez et validez d’abord les poules : le planning apparaîtra automatiquement, sans ressaisie.</p></div>;
  const kataEntries = planning.entries.filter((entry) => isKata(entry.discipline));
  const combatEntries = planning.entries.filter((entry) => !isKata(entry.discipline));
  return <section className="planning-manager"><div className="manager-header planning-heading"><div><p className="surtitle">PROGRAMME AUTOMATIQUE</p><h2>Planning</h2><p>Les Kata sont terminés en premier sur l’ensemble des tatamis. Les Randori / Ju-Randori démarrent dès la fin du dernier Kata, même si celle-ci intervient avant midi.</p></div><div className="planning-actions"><button className="primary" onClick={recalculate}>Recalculer automatiquement le planning</button><button onClick={() => window.confirm("Réinitialiser et rééquilibrer le planning sur les 3 tatamis ?") && recalculate()}>Réinitialiser le planning</button><button onClick={() => window.print()}>Exporter le planning en PDF</button><button onClick={() => window.print()}>Imprimer le planning</button></div></div>
    <Session title="PHASE 1 · KATA" entries={kataEntries} competitors={competitors} onChange={change} />
    <div className="planning-break"><strong>FIN DES KATA</strong><span>{minutesToTime(planning.kataEnd)} · Début immédiat des Randori / Ju-Randori</span></div>
    <Session title="PHASE 2 · RANDORI / JU-RANDORI" entries={combatEntries} competitors={competitors} onChange={change} />
    <div className="planning-ceremony">{minutesToTime(planning.ceremonyStart)} · REMISE DES MÉDAILLES / CÉRÉMONIE</div></section>;
}
function Session({ title, entries, competitors, onChange }) { return <><div className="planning-session-label">{title}</div><div className="planning-grid">{PLANNING_TATAMIS.map((tatami) => <div className="tatami-column" key={tatami}><h3>TATAMI {tatami}</h3>{entries.filter((e) => e.tatami === tatami).map((entry) => <article className="planning-card" key={entry.categoryId}><div className="planning-card-top"><strong>{minutesToTime(entry.start)} – {minutesToTime(entry.end)}</strong><span>{entry.duration} min</span></div><h4>{entry.name}</h4><p>{entry.disciplineLabel}</p><div className="planning-controls"><label>Tatami<select value={entry.tatami} onChange={(e) => onChange(entry, { tatami: +e.target.value })}>{PLANNING_TATAMIS.map((n) => <option key={n}>{n}</option>)}</select></label><label>Début<input type="time" value={`${String(Math.floor(entry.start / 60)).padStart(2,"0")}:${String(entry.start % 60).padStart(2,"0")}`} onChange={(e) => { const [h,m] = e.target.value.split(":").map(Number); onChange(entry, { start: h * 60 + m }); }} /></label><label>Ordre<input type="number" value={entry.order} onChange={(e) => onChange(entry, { order: +e.target.value })} /></label></div><table><thead><tr><th>Club</th><th>Nom</th><th>Prénom</th></tr></thead><tbody>{entry.competitors.map((id) => { const c = competitors.get(String(id)); return <tr key={id}><td>{c?.club || "—"}</td><td>{c?.nom || "Inconnu"}</td><td>{c?.prenom || "—"}</td></tr>; })}</tbody></table></article>)}</div>)}</div></>; }
export default PlanningManager;
