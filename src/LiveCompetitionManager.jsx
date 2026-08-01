import { useEffect, useMemo, useState } from "react";
import { formatTime, schedulePools } from "./PlanningManager";

const TATAMI_COUNT = 3;
const STATUS = {
  RUNNING: "running",
  PAUSED: "paused",
  DONE: "done",
  UPCOMING: "upcoming",
};

function formatClock(date) {
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function formatChronometer(seconds) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;

  return [hours, minutes, remainingSeconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

function getPoolId(item, index) {
  return String(item.id || item.pool?.id || `live-pool-${index}`);
}

function buildFallbackPlanning(competition) {
  return schedulePools(competition.pools || [], competition.categories || [], {
    startTime: "09:30",
    lunchStartTime: "12:00",
    lunchEndTime: "14:00",
    tatamiCount: TATAMI_COUNT,
    durations: {
      kata: 10,
      randori: 15,
      juRandori: 15,
    },
  });
}

function normalizePlanning(competition) {
  const source = Array.isArray(competition.planning)
    ? competition.planning
    : buildFallbackPlanning(competition);

  return source
    .map((item, index) => ({
      ...item,
      id: getPoolId(item, index),
      tatami: Number(item.tatami) || ((index % TATAMI_COUNT) + 1),
      start: Number(item.start) || 0,
      end: Number(item.end) || Number(item.start) || 0,
      passageOrder: item.passageOrder || index + 1,
      label: item.label || item.pool?.nom || item.pool?.epreuveLabel || "Poule",
      epreuveLabel: item.epreuveLabel || item.pool?.epreuveLabel || item.pool?.epreuve || "Épreuve",
      competitorCount:
        item.competitorCount || item.pool?.competitorIds?.length || 0,
    }))
    .sort(
      (a, b) =>
        a.start - b.start ||
        a.tatami - b.tatami ||
        a.passageOrder - b.passageOrder
    );
}

function getComputedStatus(item, tatamiItems, liveStatuses) {
  const savedStatus = liveStatuses[item.id];

  if (savedStatus === STATUS.DONE || savedStatus === STATUS.PAUSED) {
    return savedStatus;
  }

  if (savedStatus === STATUS.RUNNING) {
    return STATUS.RUNNING;
  }

  const firstOpen = tatamiItems.find(
    (candidate) => liveStatuses[candidate.id] !== STATUS.DONE
  );

  return firstOpen?.id === item.id ? STATUS.RUNNING : STATUS.UPCOMING;
}

function getStatusLabel(status) {
  if (status === STATUS.DONE) return "Terminée";
  if (status === STATUS.PAUSED) return "En pause";
  if (status === STATUS.RUNNING) return "En cours";
  return "À venir";
}

function getStatusStyle(status) {
  if (status === STATUS.DONE) {
    return { background: "#e8f5e9", borderColor: "#8bc38f", color: "#2e7d32" };
  }

  if (status === STATUS.RUNNING) {
    return { background: "#fff7df", borderColor: "#d7aa2d", color: "#7a5600" };
  }

  if (status === STATUS.PAUSED) {
    return { background: "#eef1f5", borderColor: "#b8c1ce", color: "#445066" };
  }

  return { background: "#ffffff", borderColor: "#d9dee7", color: "#657080" };
}

function LiveCompetitionManager({ competition = {}, onUpdateCompetition }) {
  const [now, setNow] = useState(new Date());
  const [startedAt] = useState(Date.now());
  const planning = useMemo(() => normalizePlanning(competition), [competition]);
  const liveStatuses = competition.liveStatuses || {};

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const groupedByTatami = useMemo(
    () =>
      Array.from({ length: TATAMI_COUNT }, (_, index) =>
        planning.filter((item) => item.tatami === index + 1)
      ),
    [planning]
  );

  const completedCount = planning.filter(
    (item) => liveStatuses[item.id] === STATUS.DONE
  ).length;
  const remainingCount = Math.max(0, planning.length - completedCount);
  const progress = planning.length
    ? Math.round((completedCount / planning.length) * 100)
    : 0;

  function updateStatus(item, status) {
    if (!onUpdateCompetition) return;

    onUpdateCompetition({
      ...competition,
      liveStatuses: {
        ...liveStatuses,
        [item.id]: status,
      },
    });
  }

  return (
    <section className="planning-manager">
      <div className="section-title">
        <p className="surtitle">Compétition Live</p>
        <h2>Centre de pilotage de la compétition</h2>
        <p>
          Lance les poules en temps réel, suis les files d'attente par tatami et
          prépare les futures liaisons arbitrage, résultats et affichage public.
        </p>
      </div>

      <div className="dashboard">
        <div className="card"><span className="number">{formatClock(now)}</span><h3>Heure officielle</h3><p>Horloge live</p></div>
        <div className="card"><span className="number">{formatChronometer((Date.now() - startedAt) / 1000)}</span><h3>Chronomètre</h3><p>Session active</p></div>
        <div className="card"><span className="number">{remainingCount}</span><h3>Poules restantes</h3><p>À gérer</p></div>
        <div className="card"><span className="number">{completedCount}</span><h3>Poules terminées</h3><p>Validées</p></div>
        <div className="card"><span className="number">{progress}%</span><h3>Avancement</h3><p>Progression globale</p></div>
      </div>

      <div className="competition-card">
        <h3>Progression globale</h3>
        <div style={{ height: 16, background: "#eef1f5", borderRadius: 999, overflow: "hidden" }}>
          <div style={{ width: `${progress}%`, height: "100%", background: "linear-gradient(90deg, var(--color-afdp-blue), var(--color-horizon-gold))", transition: "width 0.3s ease" }} />
        </div>
      </div>

      <div className="competition-list">
        {groupedByTatami.map((tatamiItems, index) => {
          const running = tatamiItems.find(
            (item) => getComputedStatus(item, tatamiItems, liveStatuses) === STATUS.RUNNING
          );
          const next = tatamiItems.find(
            (item) => getComputedStatus(item, tatamiItems, liveStatuses) === STATUS.UPCOMING
          );

          return (
            <article className="competition-card" key={`recap-tatami-${index + 1}`}>
              <h3>Tatami {index + 1}</h3>
              <p><strong>En cours :</strong> {running?.label || "Aucune poule"}</p>
              <p><strong>À suivre :</strong> {next?.label || "File terminée"}</p>
            </article>
          );
        })}
      </div>

      <div className="competition-list">
        {groupedByTatami.map((tatamiItems, index) => (
          <article className="competition-card" key={`tatami-${index + 1}`}>
            <h3>Tatami {index + 1}</h3>
            <p>{tatamiItems.length} poule(s) dans la file d'attente</p>

            {tatamiItems.map((item) => {
              const status = getComputedStatus(item, tatamiItems, liveStatuses);

              return (
                <div className="action-card" key={item.id} style={getStatusStyle(status)}>
                  <strong>#{item.passageOrder} · {formatTime(item.start)} → {formatTime(item.end)}</strong>
                  <p>{item.label}</p>
                  <small>{item.epreuveLabel} · {item.competitorCount} compétiteur(s) · {getStatusLabel(status)}</small>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                    <button className="manage-button" type="button" onClick={() => updateStatus(item, STATUS.RUNNING)}>▶ Démarrer</button>
                    <button className="manage-button" type="button" onClick={() => updateStatus(item, STATUS.PAUSED)}>⏸ Pause</button>
                    <button className="primary" type="button" onClick={() => updateStatus(item, STATUS.DONE)}>✅ Terminer</button>
                  </div>
                </div>
              );
            })}
          </article>
        ))}
      </div>

      <div className="competition-card" style={{ borderStyle: "dashed" }}>
        <h3>Architecture prête pour les extensions live</h3>
        <p>Connecteurs prévus : ArbitrageManager, ResultsManager, écran public, écran arbitres et affichage en direct.</p>
      </div>
    </section>
  );
}

export default LiveCompetitionManager;
