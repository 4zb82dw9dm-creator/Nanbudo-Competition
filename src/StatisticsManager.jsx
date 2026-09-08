import { useMemo } from "react";
import { disciplineLabel } from "./competitionLogic";

const PENALTY_TYPES = [
  ["keikoku", "Keikoku"],
  ["mai", "Maï"],
  ["fujubun", "Fujubun"],
  ["chui", "Chui"],
  ["hansoku_chui", "Hansoku Chui"],
];

function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "—";
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  return minutes ? `${minutes} min ${String(rest).padStart(2, "0")} s` : `${rest} s`;
}

function refereeName(competition, tatami) {
  const team = competition.refereeAssignments?.[tatami] || {};
  const assignment = team.Shushin || team.Sushin || team.shushin || team.sushin;
  if (!assignment) return "Non renseigné";
  if (assignment.manualName) return assignment.manualName;
  const referee = (competition.competitors || []).find((item) => String(item.id) === String(assignment.refereeId));
  return referee ? `${referee.nom || ""} ${referee.prenom || ""}`.trim() : "Non renseigné";
}

function matchPenaltyCounts(match) {
  const counts = Object.fromEntries(PENALTY_TYPES.map(([id]) => [id, 0]));
  if (Array.isArray(match.penaltyEvents) && match.penaltyEvents.length) {
    match.penaltyEvents.forEach((event) => {
      if (!(event.penaltyId in counts)) return;
      counts[event.penaltyId] += event.action === "remove" ? -1 : 1;
    });
    Object.keys(counts).forEach((key) => { counts[key] = Math.max(0, counts[key]); });
    return counts;
  }

  ["aka", "shiro"].forEach((side) => {
    (match.penalties?.[side] || []).forEach((penalty) => {
      if (penalty.id in counts) counts[penalty.id] += 1;
    });
  });
  (match.matchHistory || []).forEach((event) => {
    if (event.type === "mai") counts.mai += 1;
    if (event.type === "mai_removed") counts.mai = Math.max(0, counts.mai - 1);
  });
  return counts;
}

function aggregate(rows, keySelector) {
  const map = new Map();
  rows.forEach((row) => {
    const key = keySelector(row) || "Non renseigné";
    if (!map.has(key)) map.set(key, { key, matches: 0, durationTotal: 0, durationCount: 0, durations: [], penaltyFree: 0, penalties: Object.fromEntries(PENALTY_TYPES.map(([id]) => [id, 0])) });
    const entry = map.get(key);
    entry.matches += 1;
    if (row.durationSeconds > 0) { entry.durationTotal += row.durationSeconds; entry.durationCount += 1; entry.durations.push(row.durationSeconds); }
    const rowSanctionTotal = ["keikoku", "fujubun", "chui", "hansoku_chui"].reduce((sum, id) => sum + (row.penalties[id] || 0), 0);
    if (rowSanctionTotal === 0) entry.penaltyFree += 1;
    PENALTY_TYPES.forEach(([id]) => { entry.penalties[id] += row.penalties[id] || 0; });
  });
  return [...map.values()].map((entry) => ({
    ...entry,
    averageDuration: entry.durationCount ? entry.durationTotal / entry.durationCount : 0,
    minDuration: entry.durations.length ? Math.min(...entry.durations) : 0,
    maxDuration: entry.durations.length ? Math.max(...entry.durations) : 0,
    totalDuration: entry.durationTotal,
    totalPenalties: ["keikoku", "fujubun", "chui", "hansoku_chui"].reduce((sum, id) => sum + (entry.penalties[id] || 0), 0),
    penaltiesPer10: entry.matches ? ["keikoku", "fujubun", "chui", "hansoku_chui"].reduce((sum, id) => sum + (entry.penalties[id] || 0), 0) / entry.matches * 10 : 0,
    penaltyFreePercent: entry.matches ? entry.penaltyFree / entry.matches * 100 : 0,
  }));
}

function StatsTable({ title, rows, firstColumn, sampleThreshold = 0 }) {
  return <section className="statistics-panel">
    <div className="statistics-panel-header"><h3>{title}</h3><span>{rows.length} ligne{rows.length > 1 ? "s" : ""}</span></div>
    <div className="registrations-table"><table><thead><tr><th>{firstColumn}</th><th>Passages / combats</th><th>Temps moyen</th><th>Min.</th><th>Max.</th><th>Temps actif</th>{PENALTY_TYPES.map(([, label]) => <th key={label}>{label}</th>)}<th>Sans sanction</th><th>Sanctions / 10 combats</th></tr></thead>
    <tbody>{rows.map((row) => <tr key={row.key}><td><strong>{row.key}</strong></td><td>{row.matches}</td><td>{formatDuration(row.averageDuration)}</td><td>{formatDuration(row.minDuration)}</td><td>{formatDuration(row.maxDuration)}</td><td>{formatDuration(row.totalDuration)}</td>{PENALTY_TYPES.map(([id]) => <td key={id}>{row.penalties[id]}</td>)}<td>{row.penaltyFreePercent.toFixed(0)} %</td><td><strong>{row.penaltiesPer10.toFixed(1)}</strong>{sampleThreshold > 0 && row.matches < sampleThreshold ? <div style={{ fontSize: "12px", fontWeight: 600, marginTop: "3px" }}>Échantillon insuffisant · {row.matches}/{sampleThreshold}</div> : null}</td></tr>)}</tbody></table></div>
  </section>;
}

function StatisticsManager({ competition }) {
  const rows = useMemo(() => (competition.pools || []).flatMap((pool) => (pool.matches || [])
    .filter((match) => match.statut === "Terminé")
    .map((match) => ({
      ...match,
      categoryName: (competition.categories || []).find((category) => category.id === pool.categoryId)?.nom || pool.nom || "Non renseignée",
      durationSeconds: Number(match.durationSeconds || 0),
      shushin: match.refereeSnapshot?.shushin || match.shushinName || refereeName(competition, match.tatami),
      penalties: matchPenaltyCounts(match),
    }))), [competition]);

  const byDiscipline = useMemo(() => aggregate(rows, (row) => disciplineLabel(row.discipline)), [rows]);
  const byTatami = useMemo(() => aggregate(rows, (row) => `Tatami ${row.tatami || "?"}`), [rows]);
  const byReferee = useMemo(() => aggregate(rows, (row) => row.shushin), [rows]);
  const byCategory = useMemo(() => aggregate(rows, (row) => row.categoryName), [rows]);
  const totalPenalties = PENALTY_TYPES.map(([id, label]) => ({ id, label, value: rows.reduce((sum, row) => sum + (row.penalties[id] || 0), 0) }));
  const totalSanctions = totalPenalties.filter((item) => item.id !== "mai").reduce((sum, item) => sum + item.value, 0);
  const totalMai = totalPenalties.find((item) => item.id === "mai")?.value || 0;
  const timed = rows.filter((row) => row.durationSeconds > 0);
  const average = timed.length ? timed.reduce((sum, row) => sum + row.durationSeconds, 0) / timed.length : 0;

  return <div className="statistics-manager">
    <div className="manager-header"><div><p className="surtitle">OBSERVATOIRE HORIZON 2030</p><h2>Statistiques de la compétition</h2><p>Temps de passage, pénalités et cohérence d’arbitrage par discipline, tatami et Shushin.</p></div></div>
    <div className="dashboard statistics-kpis">
      <div className="card"><span className="number">{rows.length}</span><h3>Passages terminés</h3><p>Kata, Randori et Ju-Randori confondus.</p></div>
      <div className="card"><span className="number">{formatDuration(average)}</span><h3>Temps moyen global</h3><p>Calculé sur les passages disposant d’un chronométrage.</p></div>
      <div className="card"><span className="number">{totalSanctions}</span><h3>Sanctions enregistrées</h3><p>Keikoku, Fujubun, Chui et Hansoku Chui. Les Maï sont analysés séparément.</p></div>
    </div>
    <div className="statistics-penalty-cards"><article className="card"><span className="number">{totalMai}</span><h3>Maï constatés</h3><p>Événements techniques, distincts des sanctions.</p></article>{totalPenalties.filter((item) => item.id !== "mai").map((item) => <article className="card" key={item.id}><span className="number">{item.value}</span><h3>{item.label}</h3></article>)}</div>
    <StatsTable title="Analyse par discipline" rows={byDiscipline} firstColumn="Discipline" />
    <StatsTable title="Analyse par tatami" rows={byTatami} firstColumn="Tatami" />
    <StatsTable title="Analyse par Shushin" rows={byReferee.sort((a, b) => b.penaltiesPer10 - a.penaltiesPer10)} firstColumn="Shushin" sampleThreshold={5} />
    <StatsTable title="Analyse par catégorie" rows={byCategory} firstColumn="Catégorie" />
    <div className="beta-note"><strong>Lecture recommandée</strong><p>Les Maï sont des événements techniques et ne sont pas additionnés aux sanctions. Le ratio « sanctions / 10 combats » sert à repérer des écarts d’arbitrage. Pour les Shushin, l’analyse est marquée « échantillon insuffisant » avant 5 passages ou combats.</p></div>
  </div>;
}

export default StatisticsManager;
