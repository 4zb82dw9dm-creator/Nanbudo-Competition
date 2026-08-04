import { useEffect, useMemo, useRef, useState } from "react";
import ControlCenter from "./ControlCenter";
import LiveCompetitionManager from "./LiveCompetitionManager";
import PlanningManager from "./PlanningManager";
import ResultsManager from "./ResultsManager";
import { formatTime, parseTime, schedulePools } from "./PlanningManager";

const SIMULATION_SETTINGS = {
  startTime: "09:30",
  lunchStartTime: "12:00",
  lunchEndTime: "14:00",
  tatamiCount: 3,
  durations: { kata: 10, randori: 15, juRandori: 15 },
};
const SPEEDS = [1, 2, 5, 10];
const STATUS = { IDLE: "idle", RUNNING: "running", PAUSED: "paused", DONE: "done", STOPPED: "stopped" };
const KATA_EVENTS = ["kata0", "kata1", "kata2"];

function cloneCompetition(competition) {
  return JSON.parse(JSON.stringify(competition || {}));
}

function makeSeededRandom(seedText) {
  let seed = String(seedText || "simulation").split("").reduce((total, char) => total + char.charCodeAt(0), 0) || 1;
  return () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

function isKataPool(pool) {
  const value = String(pool?.epreuve || pool?.epreuveLabel || "").toLowerCase();
  return KATA_EVENTS.some((event) => value.includes(event.toLowerCase())) || value.includes("kata");
}

function randoriScore(random, favorite) {
  const base = favorite ? 2 : 1;
  return Math.max(0, base + Math.floor(random() * 3) - (random() < 0.18 ? 1 : 0));
}

function kataNotes(random, competitorIndex, passageNumber) {
  const center = 7.55 + competitorIndex * 0.05 + passageNumber * 0.03 + (random() - 0.5) * 0.45;
  return Array.from({ length: 5 }, (_, judgeIndex) => {
    const note = center + (judgeIndex - 2) * 0.03 + (random() - 0.5) * 0.24;
    return Number(Math.min(8.5, Math.max(6.5, note)).toFixed(1));
  });
}

function scoreFromNotes(notes) {
  const sorted = [...notes].sort((a, b) => a - b);
  return Number(sorted.slice(1, -1).reduce((total, note) => total + note, 0).toFixed(1));
}

function buildPodium(ranking) {
  return {
    firstId: ranking[0]?.competitorId || null,
    secondId: ranking[1]?.competitorId || null,
    thirdId: ranking[2]?.competitorId || null,
    fourthId: ranking[3]?.competitorId || null,
  };
}

function simulateKataPool(pool, random) {
  const competitorIds = pool.competitorIds || [];
  const passages = competitorIds.flatMap((competitorId, competitorIndex) => [1, 2].map((numero) => {
    const notes = kataNotes(random, competitorIndex, numero);
    const sorted = [...notes].sort((a, b) => a - b);
    return {
      id: `${pool.id}-sim-kata-${competitorId}-${numero}`,
      competitorId,
      numero,
      notes,
      notesRetenues: sorted.slice(1, -1),
      noteMinRetiree: sorted[0],
      noteMaxRetiree: sorted[sorted.length - 1],
      score: scoreFromNotes(notes),
      statut: "Terminé",
    };
  }));

  const ranking = competitorIds.map((competitorId) => {
    const scores = passages.filter((passage) => String(passage.competitorId) === String(competitorId)).map((passage) => passage.score);
    return { competitorId, score: Number(scores.reduce((total, score) => total + score, 0).toFixed(1)), passagesTermines: scores.length };
  }).sort((a, b) => b.score - a.score || String(a.competitorId).localeCompare(String(b.competitorId)));

  return { ...pool, passages, rankingLocked: ranking, podium: buildPodium(ranking), statut: "Terminée", completedAt: new Date().toISOString() };
}

function simulateCombatPool(pool, random) {
  const competitorIds = pool.competitorIds || [];
  const rankingMap = new Map(competitorIds.map((id) => [String(id), { competitorId: id, victories: 0, defeats: 0, draws: 0, scoreFor: 0, scoreAgainst: 0, difference: 0, negativePoints: 0, matchesPlayed: 0 }]));
  const sourceMatches = pool.matches?.length ? pool.matches : competitorIds.flatMap((id, index) => competitorIds.slice(index + 1).map((otherId) => ({ id: `${pool.id}-sim-match-${id}-${otherId}`, akaId: id, shiroId: otherId })));
  const matches = sourceMatches.map((match) => {
    const akaFavored = random() > 0.5;
    let akaScore = randoriScore(random, akaFavored);
    let shiroScore = randoriScore(random, !akaFavored);
    if (akaScore === shiroScore) akaScore += akaFavored ? 1 : 0, shiroScore += akaFavored ? 0 : 1;
    const winnerId = akaScore > shiroScore ? match.akaId : match.shiroId;
    const pointsNegatifsAka = random() < 0.12 ? 1 : 0;
    const pointsNegatifsShiro = random() < 0.12 ? 1 : 0;
    const aka = rankingMap.get(String(match.akaId));
    const shiro = rankingMap.get(String(match.shiroId));
    if (aka && shiro) {
      aka.matchesPlayed += 1; shiro.matchesPlayed += 1;
      aka.scoreFor += akaScore; aka.scoreAgainst += shiroScore; aka.negativePoints += pointsNegatifsAka;
      shiro.scoreFor += shiroScore; shiro.scoreAgainst += akaScore; shiro.negativePoints += pointsNegatifsShiro;
      if (String(winnerId) === String(match.akaId)) { aka.victories += 1; shiro.defeats += 1; } else { shiro.victories += 1; aka.defeats += 1; }
    }
    return { ...match, akaScore, shiroScore, pointsNegatifsAka, pointsNegatifsShiro, winnerId, statut: "Terminé" };
  });
  const ranking = [...rankingMap.values()].map((row) => ({ ...row, difference: row.scoreFor - row.scoreAgainst })).sort((a, b) => b.victories - a.victories || a.negativePoints - b.negativePoints || b.difference - a.difference || b.scoreFor - a.scoreFor);
  return { ...pool, matches, rankingLocked: ranking, podium: buildPodium(ranking), statut: "Terminée", completedAt: new Date().toISOString() };
}

function buildSimulationReport(competition, scheduled, startedAt, finishedAt) {
  const pools = competition.pools || [];
  const finishedPools = pools.filter((pool) => pool.statut === "Terminée").length;
  return {
    generatedAt: finishedAt,
    title: `Rapport de simulation — ${competition.nom || "Compétition Nanbudo"}`,
    competitionId: competition.id,
    simulatedOnly: true,
    startedAt,
    finishedAt,
    poolCount: pools.length,
    finishedPools,
    progress: pools.length ? Math.round((finishedPools / pools.length) * 100) : 0,
    plannedPassages: scheduled.length,
  };
}

function SimulationManager({ competition = {} }) {
  const [speed, setSpeed] = useState(2);
  const [status, setStatus] = useState(STATUS.IDLE);
  const [simulatedCompetition, setSimulatedCompetition] = useState(() => cloneCompetition(competition));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [elapsedMinutes, setElapsedMinutes] = useState(0);
  const [startedAt, setStartedAt] = useState(null);
  const randomRef = useRef(makeSeededRandom(competition.id));

  const scheduled = useMemo(() => schedulePools(simulatedCompetition.pools || [], simulatedCompetition.categories || [], SIMULATION_SETTINGS), [simulatedCompetition.categories, simulatedCompetition.pools]);
  const finishedPools = (simulatedCompetition.pools || []).filter((pool) => pool.statut === "Terminée").length;
  const progress = scheduled.length ? Math.round((finishedPools / scheduled.length) * 100) : 0;
  const simulatedClock = formatTime(parseTime(SIMULATION_SETTINGS.startTime) + elapsedMinutes);

  function resetSimulation(newStatus = STATUS.IDLE) {
    randomRef.current = makeSeededRandom(`${competition.id}-${Date.now()}`);
    setSimulatedCompetition({ ...cloneCompetition(competition), statut: "Préparation simulation", liveStatuses: {}, simulationReport: null });
    setCurrentIndex(0);
    setElapsedMinutes(0);
    setStartedAt(null);
    setStatus(newStatus);
  }

  function startSimulation() {
    resetSimulation(STATUS.RUNNING);
    setStartedAt(new Date().toISOString());
  }

  function stopSimulation() {
    resetSimulation(STATUS.STOPPED);
  }

  useEffect(() => {
    if (status !== STATUS.RUNNING) return undefined;
    const interval = window.setInterval(() => {
      setSimulatedCompetition((current) => {
        const currentScheduled = schedulePools(current.pools || [], current.categories || [], SIMULATION_SETTINGS);
        if (currentIndex >= currentScheduled.length) {
          const finishedAt = new Date().toISOString();
          const report = buildSimulationReport(current, currentScheduled, startedAt, finishedAt);
          setStatus(STATUS.DONE);
          return { ...current, statut: "Terminée", simulationReport: report };
        }
        const item = currentScheduled[currentIndex];
        const updatedPools = (current.pools || []).map((pool) => {
          if (String(pool.id) !== String(item.pool.id)) return pool;
          return isKataPool(pool) ? simulateKataPool(pool, randomRef.current) : simulateCombatPool(pool, randomRef.current);
        });
        setElapsedMinutes(item.end - parseTime(SIMULATION_SETTINGS.startTime));
        setCurrentIndex((index) => index + 1);
        return { ...current, statut: "Simulation en cours", pools: updatedPools, planning: currentScheduled, liveStatuses: { ...(current.liveStatuses || {}), [item.id]: "done" }, simulationUpdatedAt: new Date().toISOString() };
      });
    }, Math.max(250, 1400 / speed));
    return () => window.clearInterval(interval);
  }, [currentIndex, speed, startedAt, status]);

  return (
    <section className="simulation-manager">
      <div className="manager-header">
        <div><p className="surtitle">SIMULATION</p><h2>Simulation complète sans intervention humaine</h2><p>Les données ci-dessous sont calculées sur une copie temporaire : la compétition réelle n'est jamais modifiée.</p></div>
        <button className="primary" type="button" onClick={startSimulation}>Lancer une simulation</button>
      </div>

      <div className="competition-card" style={{ borderStyle: "dashed" }}>
        <h3>Contrôles de simulation</h3>
        <div className="competition-actions">
          {SPEEDS.map((value) => <button key={value} className={speed === value ? "primary" : "manage-button"} type="button" onClick={() => setSpeed(value)}>x{value}</button>)}
          <button className="manage-button" type="button" onClick={() => setStatus(STATUS.PAUSED)} disabled={status !== STATUS.RUNNING}>Pause</button>
          <button className="manage-button" type="button" onClick={() => setStatus(STATUS.RUNNING)} disabled={status !== STATUS.PAUSED}>Reprendre</button>
          <button className="delete-button" type="button" onClick={stopSimulation} disabled={status === STATUS.IDLE}>Arrêter</button>
        </div>
      </div>

      <div className="dashboard">
        <div className="card"><span className="number">{Math.round(elapsedMinutes)} min</span><h3>Temps simulé</h3><p>Vitesse x{speed}</p></div>
        <div className="card"><span className="number">{finishedPools}</span><h3>Poules terminées</h3><p>sur {scheduled.length}</p></div>
        <div className="card"><span className="number">{progress}%</span><h3>Progression</h3><p>{status}</p></div>
        <div className="card"><span className="number">{simulatedClock}</span><h3>Heure simulée</h3><p>Départ {SIMULATION_SETTINGS.startTime}</p></div>
      </div>

      {simulatedCompetition.simulationReport && <div className="beta-note"><strong>Rapport généré automatiquement</strong><p>{simulatedCompetition.simulationReport.title} · {simulatedCompetition.simulationReport.finishedPools}/{simulatedCompetition.simulationReport.poolCount} poules terminées.</p></div>}

      <ControlCenter competition={simulatedCompetition} />
      <LiveCompetitionManager competition={simulatedCompetition} onUpdateCompetition={setSimulatedCompetition} />
      <PlanningManager competition={simulatedCompetition} />
      <ResultsManager competition={simulatedCompetition} />
    </section>
  );
}

export default SimulationManager;
