import { useMemo, useState } from "react";
import { formatTime, parseTime, schedulePools } from "./PlanningManager";

const DEFAULT_SETTINGS = {
  startTime: "09:30",
  lunchStartTime: "12:00",
  lunchEndTime: "14:00",
  tatamiCount: 2,
  durations: {
    kata: 10,
    randori: 15,
    juRandori: 15,
  },
};

function getCompetitionName(competition) {
  return competition?.nom || competition?.name || competition?.titre || "Compétition Nanbudo";
}

function getCompetitionDate(competition) {
  return competition?.date || competition?.competitionDate || "Date à définir";
}

function getCompetitionLocation(competition) {
  return competition?.lieu || competition?.ville || competition?.location || "Lieu à définir";
}

function getPoolStatus(pool) {
  return String(pool?.statut || pool?.status || "").toLocaleLowerCase("fr");
}

function isFinishedPool(pool) {
  const status = getPoolStatus(pool);
  return status.includes("termin") || Boolean(pool?.podium);
}

function isCalledPool(pool) {
  const status = getPoolStatus(pool);
  return status.includes("appel") || status.includes("prête") || status.includes("prete");
}

function isRunningPool(pool) {
  const status = getPoolStatus(pool);
  return status.includes("cours") || status.includes("phase finale");
}

function getPoolLabel(pool, categories) {
  const category = categories.find((item) => String(item.id) === String(pool?.categoryId));
  return pool?.nom || category?.nom || pool?.epreuveLabel || pool?.epreuve || "Poule";
}


function getCurrentMinutes() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function formatDuration(minutes) {
  const safeMinutes = Math.max(0, Math.round(minutes || 0));
  const hours = Math.floor(safeMinutes / 60);
  const remaining = safeMinutes % 60;

  if (!hours) return `${remaining} min`;
  if (!remaining) return `${hours} h`;
  return `${hours} h ${remaining} min`;
}

function getLunchWindow() {
  const lunchStart = parseTime(DEFAULT_SETTINGS.lunchStartTime);
  const lunchEnd = parseTime(DEFAULT_SETTINGS.lunchEndTime);
  return { lunchStart, lunchEnd };
}

function getCompetitionSummary(scheduled) {
  const now = getCurrentMinutes();
  const start = parseTime(DEFAULT_SETTINGS.startTime);
  const estimatedEnd = scheduled.reduce((latest, item) => Math.max(latest, item.end), start);

  return {
    startTime: formatTime(start),
    currentTime: formatTime(now),
    estimatedEnd: scheduled.length ? formatTime(estimatedEnd) : "—",
    elapsed: formatDuration(Math.max(0, now - start)),
  };
}

function buildLastResults(pools, categories) {
  return pools
    .filter(isFinishedPool)
    .map((pool, index) => ({
      id: pool.id || `result-${index}`,
      label: getPoolLabel(pool, categories),
      status: pool.statut || "Terminée",
      order: pool.updatedAt || pool.completedAt || pool.id || index,
    }))
    .sort((a, b) => String(b.order).localeCompare(String(a.order)))
    .slice(0, 10);
}

function buildTatamis(scheduled, categories) {
  const currentMinutes = getCurrentMinutes();
  const { lunchStart, lunchEnd } = getLunchWindow();
  const tatamiNumbers = scheduled.length
    ? [...new Set(scheduled.map((item) => item.tatami))].sort((a, b) => a - b)
    : Array.from({ length: DEFAULT_SETTINGS.tatamiCount }, (_, index) => index + 1);

  return tatamiNumbers.map((tatamiNumber) => {
    const items = scheduled.filter((item) => item.tatami === tatamiNumber);
    const pendingItems = items.filter((item) => !isFinishedPool(item.pool));
    const running = pendingItems.find((item) => currentMinutes >= item.start && currentMinutes < item.end) || null;
    const called = pendingItems.find((item) => item.start > currentMinutes && item.start - currentMinutes <= 15) || null;
    const next = pendingItems.find((item) => item.start > currentMinutes && item.id !== called?.id) || null;
    const current = running || pendingItems.find((item) => isRunningPool(item.pool)) || null;
    const visibleNext = called || next || null;
    const lastEnd = items.reduce((latest, item) => Math.max(latest, item.end), 0);
    const delayedItem = pendingItems.find((item) => item.end < currentMinutes - 10) || null;
    const isLunchBreak = currentMinutes >= lunchStart && currentMinutes < lunchEnd;

    let status = "🟢 Libre";
    if (isLunchBreak) status = "⚪ Pause";
    else if (current) status = "🔴 En cours";
    else if (called || items.some((item) => isCalledPool(item.pool))) status = "🟠 Appel";

    return {
      number: tatamiNumber,
      status,
      currentTime: current ? `${formatTime(current.start)} → ${formatTime(current.end)}` : "—",
      currentPool: current ? current.label : "Aucune poule en cours",
      nextPool: visibleNext ? `${visibleNext.label} (${formatTime(visibleNext.start)})` : "Aucune poule suivante",
      estimatedEnd: lastEnd ? formatTime(lastEnd) : "—",
      inactive: !current && !called && pendingItems.length > 0 && !isLunchBreak,
      delayed: Boolean(delayedItem),
      competitorCount: current ? current.competitorCount : visibleNext ? visibleNext.competitorCount : 0,
      categoryLabel: current ? getPoolLabel(current.pool, categories) : visibleNext ? getPoolLabel(visibleNext.pool, categories) : "",
    };
  });
}

function buildAlerts(tatamis, scheduled) {
  const currentMinutes = getCurrentMinutes();
  const { lunchStart, lunchEnd } = getLunchWindow();
  const alerts = [];

  tatamis.forEach((tatami) => {
    if (tatami.delayed) alerts.push(`Retard supérieur à 10 minutes sur le tatami ${tatami.number}.`);
    if (tatami.inactive) alerts.push(`Tatami ${tatami.number} inactif : aucune poule en cours ni appelée.`);
  });

  if (scheduled.length === 0) alerts.push("Aucune poule programmée dans le planning.");
  if (currentMinutes >= lunchStart && currentMinutes < lunchEnd) {
    alerts.push(`Pause méridienne en cours (${formatTime(lunchStart)} → ${formatTime(lunchEnd)}).`);
  }

  return alerts;
}

function ControlCenter({ competition = {} }) {
  const [competitionState, setCompetitionState] = useState("ready");
  const competitors = competition.competitors || [];
  const categories = competition.categories || [];
  const pools = competition.pools || [];

  const scheduled = useMemo(
    () => schedulePools(pools, categories, DEFAULT_SETTINGS),
    [categories, pools]
  );

  const finishedPools = useMemo(() => pools.filter(isFinishedPool), [pools]);
  const remainingPools = Math.max(0, pools.length - finishedPools.length);
  const progress = pools.length ? Math.round((finishedPools.length / pools.length) * 100) : 0;
  const tatamis = useMemo(() => buildTatamis(scheduled, categories), [categories, scheduled]);
  const alerts = useMemo(() => buildAlerts(tatamis, scheduled), [scheduled, tatamis]);
  const upcomingPools = useMemo(
    () => scheduled.filter((item) => !isFinishedPool(item.pool) && item.start >= getCurrentMinutes()).slice(0, 5),
    [scheduled]
  );
  const lastResults = useMemo(() => buildLastResults(pools, categories), [categories, pools]);
  const summary = useMemo(() => getCompetitionSummary(scheduled), [scheduled]);

  return (
    <section className="control-center">
      <div className="control-hero">
        <div>
          <p className="surtitle">CENTRE DE CONTRÔLE</p>
          <h2>{getCompetitionName(competition)}</h2>
          <p>{getCompetitionDate(competition)} · {getCompetitionLocation(competition)}</p>
        </div>
        <div className="control-live-badge">Pilotage compétition · {competitionState}</div>
      </div>

      <div className="control-stats">
        <article className="control-stat-card"><span>{competitors.length}</span><strong>Compétiteurs</strong><small>nombre total</small></article>
        <article className="control-stat-card"><span>{categories.length}</span><strong>Catégories</strong><small>nombre total</small></article>
        <article className="control-stat-card"><span>{pools.length}</span><strong>Poules</strong><small>nombre total</small></article>
        <article className="control-stat-card"><span>{scheduled.length}</span><strong>Planning</strong><small>passages programmés</small></article>
      </div>

      <div className="control-progress-panel">
        <div className="control-progress-header"><strong>Avancement général</strong><span>{progress} %</span></div>
        <div className="control-progress-track"><div style={{ width: `${progress}%` }} /></div>
        <small>{pools.length} poule(s) au total · {finishedPools.length} terminée(s) · {remainingPools} restante(s)</small>
      </div>

      <div className="control-connectors" aria-label="Actions rapides">
        <button type="button" onClick={() => setCompetitionState("démarrée")}>▶ Démarrer la compétition</button>
        <button type="button" onClick={() => setCompetitionState("suspendue")}>⏸ Suspendre</button>
        <button type="button" onClick={() => setCompetitionState("reprise")}>▶ Reprendre</button>
        <button type="button" onClick={() => setCompetitionState("terminée")}>🏁 Terminer la compétition</button>
      </div>

      <div className="control-stats">
        <article className="control-stat-card"><span>{summary.startTime}</span><strong>Heure de début</strong><small>planning</small></article>
        <article className="control-stat-card"><span>{summary.currentTime}</span><strong>Heure actuelle</strong><small>poste de contrôle</small></article>
        <article className="control-stat-card"><span>{summary.estimatedEnd}</span><strong>Fin estimée</strong><small>planning consolidé</small></article>
        <article className="control-stat-card"><span>{summary.elapsed}</span><strong>Temps écoulé</strong><small>depuis le début</small></article>
      </div>

      <div className="tatami-grid">
        {tatamis.map((tatami) => (
          <article className="tatami-card" key={tatami.number}>
            <h3>Tatami {tatami.number}</h3>
            <dl>
              <div><dt>Statut :</dt><dd>{tatami.status}</dd></div>
              <div><dt>Heure actuelle</dt><dd>{tatami.currentTime}</dd></div>
              <div><dt>Poule en cours</dt><dd>{tatami.currentPool}</dd></div>
              <div><dt>Prochaine poule</dt><dd>{tatami.nextPool}</dd></div>
              <div><dt>Fin prévue</dt><dd>{tatami.estimatedEnd}</dd></div>
              <div><dt>Nombre de compétiteurs</dt><dd>{tatami.competitorCount}</dd></div>
            </dl>
          </article>
        ))}
      </div>

      <div className="control-panels">
        <article className="control-panel">
          <h3>Prochains appels</h3>
          {upcomingPools.length === 0 ? <p>Aucune poule programmée.</p> : (
            <ol>{upcomingPools.map((item) => <li key={item.id}><strong>{formatTime(item.start)} · Tatami {item.tatami}</strong><span>{item.label}</span><small>{item.epreuveLabel} · {item.competitorCount} compétiteur(s)</small></li>)}</ol>
          )}
        </article>
        <article className="control-panel">
          <h3>Alertes</h3>
          {alerts.length === 0 ? <p>Aucune alerte active.</p> : (
            <ol>{alerts.map((alert) => <li key={alert}><strong>{alert}</strong></li>)}</ol>
          )}
        </article>
        <article className="control-panel">
          <h3>Derniers résultats</h3>
          {lastResults.length === 0 ? <p>Aucun résultat enregistré.</p> : (
            <ol>{lastResults.map((result) => <li key={result.id}><strong>{result.label}</strong><span>{result.status}</span></li>)}</ol>
          )}
        </article>
      </div>

      <div className="control-connectors">
        <span>PlanningManager prêt</span><span>LiveCompetitionManager prêt</span><span>ResultsManager prêt</span><span>ArbitrageManager prêt</span>
      </div>
    </section>
  );
}

export default ControlCenter;
