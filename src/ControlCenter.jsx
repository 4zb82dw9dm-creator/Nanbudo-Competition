import { useMemo } from "react";
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

function getCompetitorCount(pool, categories) {
  if (Array.isArray(pool?.competitorIds)) return pool.competitorIds.length;
  const category = categories.find((item) => String(item.id) === String(pool?.categoryId));
  return category?.competitorIds?.length || 0;
}

function getCurrentMinutes() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
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
  const tatamiNumbers = scheduled.length
    ? [...new Set(scheduled.map((item) => item.tatami))].sort((a, b) => a - b)
    : Array.from({ length: DEFAULT_SETTINGS.tatamiCount }, (_, index) => index + 1);

  return tatamiNumbers.map((tatamiNumber) => {
    const items = scheduled.filter((item) => item.tatami === tatamiNumber);
    const running = items.find((item) => currentMinutes >= item.start && currentMinutes < item.end && !isFinishedPool(item.pool));
    const called = items.find((item) => item.start > currentMinutes && item.start - currentMinutes <= 15 && !isFinishedPool(item.pool));
    const next = items.find((item) => item.start > currentMinutes && item.id !== called?.id && !isFinishedPool(item.pool));
    const current = running || items.find((item) => isRunningPool(item.pool)) || null;
    const visibleNext = called || next || null;

    let status = "🟢 Libre";
    if (current) status = "🔴 En cours";
    else if (visibleNext || items.some((item) => isCalledPool(item.pool))) status = "🟠 Appel";

    return {
      number: tatamiNumber,
      status,
      currentTime: current ? `${formatTime(current.start)} → ${formatTime(current.end)}` : "—",
      currentPool: current ? current.label : "Aucune poule en cours",
      nextPool: visibleNext ? `${visibleNext.label} (${formatTime(visibleNext.start)})` : "Aucune poule suivante",
      competitorCount: current ? current.competitorCount : visibleNext ? visibleNext.competitorCount : 0,
      categoryLabel: current ? getPoolLabel(current.pool, categories) : visibleNext ? getPoolLabel(visibleNext.pool, categories) : "",
    };
  });
}

function ControlCenter({ competition = {} }) {
  const competitors = competition.competitors || [];
  const categories = competition.categories || [];
  const pools = competition.pools || [];

  const scheduled = useMemo(
    () => schedulePools(pools, categories, DEFAULT_SETTINGS),
    [categories, pools]
  );

  const finishedPools = useMemo(() => pools.filter(isFinishedPool), [pools]);
  const progress = pools.length ? Math.round((finishedPools.length / pools.length) * 100) : 0;
  const tatamis = useMemo(() => buildTatamis(scheduled, categories), [categories, scheduled]);
  const upcomingPools = useMemo(
    () => scheduled.filter((item) => !isFinishedPool(item.pool)).slice(0, 10),
    [scheduled]
  );
  const lastResults = useMemo(() => buildLastResults(pools, categories), [categories, pools]);

  return (
    <section className="control-center">
      <div className="control-hero">
        <div>
          <p className="surtitle">CENTRE DE CONTRÔLE</p>
          <h2>{getCompetitionName(competition)}</h2>
          <p>{getCompetitionDate(competition)} · {getCompetitionLocation(competition)}</p>
        </div>
        <div className="control-live-badge">Pilotage compétition</div>
      </div>

      <div className="control-stats">
        <article className="control-stat-card"><span>{competitors.length}</span><strong>Compétiteurs</strong><small>nombre total</small></article>
        <article className="control-stat-card"><span>{categories.length}</span><strong>Catégories</strong><small>nombre total</small></article>
        <article className="control-stat-card"><span>{pools.length}</span><strong>Poules</strong><small>nombre total</small></article>
        <article className="control-stat-card"><span>{scheduled.length}</span><strong>Planning</strong><small>passages programmés</small></article>
      </div>

      <div className="control-progress-panel">
        <div className="control-progress-header"><strong>Compétition</strong><span>{progress} %</span></div>
        <div className="control-progress-track"><div style={{ width: `${progress}%` }} /></div>
        <small>{finishedPools.length} poule(s) terminée(s) sur {pools.length}</small>
      </div>

      <div className="tatami-grid">
        {tatamis.map((tatami) => (
          <article className="tatami-card" key={tatami.number}>
            <h3>Tatami {tatami.number}</h3>
            <dl>
              <div><dt>Statut :</dt><dd>{tatami.status}</dd></div>
              <div><dt>Heure actuelle</dt><dd>{tatami.currentTime}</dd></div>
              <div><dt>Poule en cours</dt><dd>{tatami.currentPool}</dd></div>
              <div><dt>Poule suivante</dt><dd>{tatami.nextPool}</dd></div>
              <div><dt>Nombre de compétiteurs</dt><dd>{tatami.competitorCount}</dd></div>
            </dl>
          </article>
        ))}
      </div>

      <div className="control-panels">
        <article className="control-panel">
          <h3>À venir</h3>
          {upcomingPools.length === 0 ? <p>Aucune poule programmée.</p> : (
            <ol>{upcomingPools.map((item) => <li key={item.id}><strong>{formatTime(item.start)} · Tatami {item.tatami}</strong><span>{item.label}</span><small>{item.epreuveLabel} · {item.competitorCount} compétiteur(s)</small></li>)}</ol>
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
        <span>Arbitres</span><span>Résultats en direct</span><span>Écran public</span>
      </div>
    </section>
  );
}

export default ControlCenter;
