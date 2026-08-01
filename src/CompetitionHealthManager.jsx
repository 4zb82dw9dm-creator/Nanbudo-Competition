import { useEffect, useMemo, useState } from "react";

const BACKUP_LIMIT = 12;
const AUTO_BACKUP_INTERVAL = 30000;
const HEALTH_BACKUP_PREFIX = "nanbudo-health-backups";
const EVENT_LOG_PREFIX = "nanbudo-health-events";

const EVENT_LABELS = {
  kata0: "Kata 0",
  kata1: "Kata 1",
  kata2: "Kata 2",
  randori: "Randori",
  juRandori1: "Ju Randori 1",
  juRandori2: "Ju Randori 2",
};

function getStorageKey(prefix, competitionId) {
  return `${prefix}:${competitionId || "competition"}`;
}

function readStorageList(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function formatDateTime(value) {
  if (!value) return "Jamais";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date inconnue";
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatLogTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--";
  return date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function sameId(a, b) {
  return String(a) === String(b);
}

function hasRecordedResult(pool) {
  const matchResult = [
    ...(pool.matches || []),
    ...(pool.finalMatches || []),
  ].some(
    (match) =>
      match.statut === "Terminé" ||
      match.winnerId ||
      Number(match.akaScore) > 0 ||
      Number(match.shiroScore) > 0
  );

  const passageResult = [
    ...(pool.passages || []),
    ...(pool.finalPassages || []),
  ].some(
    (passage) =>
      passage.statut === "Terminé" ||
      passage.total !== undefined ||
      passage.score !== undefined
  );

  return Boolean(
    matchResult ||
      passageResult ||
      pool.podium ||
      (pool.rankingLocked || []).length > 0
  );
}

function getPoolCompetitorIds(pool) {
  const ids = [...(pool.competitorIds || [])];
  (pool.matches || []).forEach((match) => ids.push(match.akaId, match.shiroId));
  (pool.passages || []).forEach((passage) => ids.push(passage.competitorId));
  return ids.filter((id) => id !== undefined && id !== null && id !== "");
}

function buildDiagnostics(competition) {
  const competitors = competition.competitors || [];
  const categories = competition.categories || [];
  const pools = competition.pools || [];
  const planning = competition.planning || [];
  const tatamis = new Set(planning.map((item) => item.tatami).filter(Boolean));
  pools.forEach((pool) => [pool.tatami, pool.tatamiNumber, pool.tatamiId].filter(Boolean).forEach((tatami) => tatamis.add(tatami)));
  const refereeValues = pools.flatMap((pool) => [pool.arbitre, pool.arbitreCentral, pool.referee, ...(pool.arbitres || []), ...(pool.referees || [])]).filter(Boolean);
  const resultsCount = pools.filter(hasRecordedResult).length;
  const completedPools = pools.filter((pool) => pool.statut === "Terminée" || pool.status === "done" || hasRecordedResult(pool)).length;
  const progress = pools.length ? Math.round((completedPools / pools.length) * 100) : 0;

  return {
    competitors: competitors.length,
    pools: pools.length,
    tatamis: tatamis.size || competition.tatamiCount || 0,
    planningGenerated: planning.length > 0,
    refereesAssigned: refereeValues.length,
    resultsCount,
    progress,
    completedPools,
  };
}

function buildAlerts(competition, diagnostics) {
  const competitors = competition.competitors || [];
  const categories = competition.categories || [];
  const pools = competition.pools || [];
  const categoryIds = new Set(categories.flatMap((category) => category.competitorIds || []).map(String));
  const alerts = [];

  competitors.forEach((competitor) => {
    if (!categoryIds.has(String(competitor.id))) {
      alerts.push(`Compétiteur sans catégorie : ${competitor.nom || ""} ${competitor.prenom || ""}`.trim());
    }
  });

  const poolOccurrences = new Map();
  pools.forEach((pool) => {
    new Set(getPoolCompetitorIds(pool).map(String)).forEach((id) => {
      poolOccurrences.set(id, (poolOccurrences.get(id) || 0) + 1);
    });
  });
  poolOccurrences.forEach((count, id) => {
    if (count > 1) {
      const competitor = competitors.find((item) => sameId(item.id, id));
      alerts.push(`Compétiteur présent dans plusieurs poules : ${competitor ? `${competitor.nom} ${competitor.prenom}` : id}`);
    }
  });

  pools.forEach((pool) => {
    if (getPoolCompetitorIds(pool).length === 0) alerts.push(`Poule vide : ${pool.nom || pool.name || pool.id}`);
  });

  if (!diagnostics.planningGenerated) alerts.push("Planning non généré.");

  const referees = pools.flatMap((pool) => [pool.arbitre, pool.arbitreCentral, pool.referee, ...(pool.arbitres || []), ...(pool.referees || [])]).filter(Boolean).map((value) => String(value).trim().toLocaleLowerCase("fr"));
  const duplicatedReferees = [...new Set(referees.filter((referee, index) => referees.indexOf(referee) !== index))];
  duplicatedReferees.forEach((referee) => alerts.push(`Arbitre en double : ${referee}`));

  if (pools.length > 0 && diagnostics.progress < 100) alerts.push("Compétition incomplète.");

  return alerts;
}

function buildWorkflowEvents(competition) {
  const events = [];
  if ((competition.competitors || []).length) events.push({ key: "competitors", label: "Inscriptions démarrées" });
  if ((competition.categories || []).length) events.push({ key: "categories", label: "Catégories générées" });
  if ((competition.pools || []).length) events.push({ key: "pools", label: "Poules générées" });
  if ((competition.planning || []).length) events.push({ key: "planning", label: "Planning généré" });

  (competition.pools || []).forEach((pool) => {
    const eventLabel = EVENT_LABELS[pool.epreuve] || pool.epreuveLabel || pool.epreuve || pool.nom || "Poule";
    if (pool.statut === "Terminée" || hasRecordedResult(pool)) {
      events.push({ key: `pool-finished-${pool.id}`, label: `${eventLabel} terminé` });
    }
  });

  if (competition.statut === "Terminée") events.push({ key: "competition-finished", label: "Compétition terminée" });
  return events;
}

function CompetitionHealthManager({ competition, onUpdateCompetition }) {
  const backupKey = getStorageKey(HEALTH_BACKUP_PREFIX, competition.id);
  const eventKey = getStorageKey(EVENT_LOG_PREFIX, competition.id);
  const [backups, setBackups] = useState(() => readStorageList(backupKey));
  const [eventLog, setEventLog] = useState(() => readStorageList(eventKey));

  const diagnostics = useMemo(() => buildDiagnostics(competition), [competition]);
  const alerts = useMemo(() => buildAlerts(competition, diagnostics), [competition, diagnostics]);
  const workflowEvents = useMemo(() => buildWorkflowEvents(competition), [competition]);
  const lastBackup = backups[0];

  useEffect(() => {
    setBackups(readStorageList(backupKey));
    setEventLog(readStorageList(eventKey));
  }, [backupKey, eventKey]);

  useEffect(() => {
    setEventLog((current) => {
      const existing = new Set(current.map((event) => event.key));
      const additions = workflowEvents.filter((event) => !existing.has(event.key)).map((event) => ({ ...event, at: new Date().toISOString() }));
      if (!additions.length) return current;
      const next = [...additions, ...current].slice(0, 80);
      localStorage.setItem(eventKey, JSON.stringify(next));
      return next;
    });
  }, [eventKey, workflowEvents]);

  useEffect(() => {
    function saveBackup() {
      const backup = { id: `${Date.now()}`, createdAt: new Date().toISOString(), competition };
      setBackups((current) => {
        const next = [backup, ...current].slice(0, BACKUP_LIMIT);
        localStorage.setItem(backupKey, JSON.stringify(next));
        return next;
      });
    }

    saveBackup();
    const timer = window.setInterval(saveBackup, AUTO_BACKUP_INTERVAL);
    return () => window.clearInterval(timer);
  }, [backupKey, competition]);

  function restoreBackup(backup) {
    if (!window.confirm(`Restaurer la sauvegarde du ${formatDateTime(backup.createdAt)} ?`)) return;
    onUpdateCompetition(backup.competition);
  }

  return (
    <section className="health-manager">
      <div className="section-title">
        <p className="surtitle">Contrôle qualité</p>
        <h2>Santé de la compétition</h2>
        <p>Diagnostic automatique, alertes, journal d'événements et sauvegardes de sécurité.</p>
      </div>

      <div className="dashboard">
        <div className="card"><span className="number">{diagnostics.competitors}</span><h3>Compétiteurs</h3><p>Enregistrés</p></div>
        <div className="card"><span className="number">{diagnostics.pools}</span><h3>Poules</h3><p>Créées</p></div>
        <div className="card"><span className="number">{diagnostics.tatamis}</span><h3>Tatamis</h3><p>Détectés</p></div>
        <div className="card"><span className="number">{diagnostics.planningGenerated ? "Oui" : "Non"}</span><h3>Planning</h3><p>Généré</p></div>
        <div className="card"><span className="number">{diagnostics.refereesAssigned}</span><h3>Arbitres</h3><p>Affectés</p></div>
        <div className="card"><span className="number">{diagnostics.resultsCount}</span><h3>Résultats</h3><p>Enregistrés</p></div>
      </div>

      <article className="competition-card health-progress-card">
        <div><h3>Progression de la compétition</h3><p>{diagnostics.completedPools} poule(s) terminée(s) sur {diagnostics.pools}</p></div>
        <strong>{diagnostics.progress}%</strong>
        <div className="health-progress"><span style={{ width: `${diagnostics.progress}%` }} /></div>
      </article>

      <div className="health-grid">
        <article className="competition-card">
          <h3>Alertes</h3>
          {alerts.length === 0 ? <p className="info">Aucune alerte détectée.</p> : <ul className="health-alerts">{alerts.map((alert) => <li key={alert}>{alert}</li>)}</ul>}
        </article>

        <article className="competition-card">
          <h3>Journal d'événements</h3>
          {eventLog.length === 0 ? <p className="info">Le journal sera alimenté automatiquement par le workflow.</p> : <ol className="event-log">{eventLog.map((event) => <li key={`${event.key}-${event.at}`}><strong>{formatLogTime(event.at)}</strong><span>{event.label}</span></li>)}</ol>}
        </article>
      </div>

      <article className="backup-panel health-backup-panel">
        <div><p className="surtitle">Sauvegarde automatique</p><h3>Dernière sauvegarde : {formatDateTime(lastBackup?.createdAt)}</h3><p>Une sauvegarde locale est créée toutes les 30 secondes. Historique conservé : {backups.length}/{BACKUP_LIMIT}.</p></div>
        <div className="backup-history">
          {backups.map((backup) => <button className="manage-button" type="button" key={backup.id} onClick={() => restoreBackup(backup)}>Restaurer {formatDateTime(backup.createdAt)}</button>)}
        </div>
      </article>
    </section>
  );
}

export default CompetitionHealthManager;
