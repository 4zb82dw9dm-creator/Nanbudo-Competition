import { useEffect, useMemo, useRef, useState } from "react";
import MatchManager, { PoolTieBreakManager } from "./MatchManager";
import KataSheet from "./KataSheet";
import CompetitionControl from "./CompetitionControl";
import { calculatePoolPodium, disciplineLabel } from "./competitionLogic";
import { competitionRulesEngine } from "./rules/competitionRulesEngine";
import { findNextArbitrationPassage, sortArbitrationMatches } from "./arbitrationSorting";
import { loadArbitrationDraft } from "./arbitrationDraftStorage";
import { saveMatchResult } from "./supabase";

const ALL_TATAMIS = "all";
const FAVORITE_TATAMI_STORAGE_KEY = "nanbudo-favorite-tatami";
const REFEREE_SLOTS = ["Shushin", "Fukushin 1", "Fukushin 2", "Fukushin 3", "Fukushin 4", "Arbitre de table 1", "Arbitre de table 2", "Arbitre de table 3"];

function tatamiOrder(tatami) {
  return Number(tatami) || 0;
}

function ArbitrationManager({ competition, onUpdateCompetition }) {
  const pools = competition.pools || [];
  const competitors = competition.competitors || [];
  const categories = competition.categories || [];
  const [selected, setSelected] = useState(null);
  const [historyMatch, setHistoryMatch] = useState(null);
  const [pendingTieBreak, setPendingTieBreak] = useState(null);
  const [showControl, setShowControl] = useState(false);
  const [activeTatami, setActiveTatami] = useState(() => localStorage.getItem(FAVORITE_TATAMI_STORAGE_KEY) || ALL_TATAMIS);
  const lastDraftSyncRef = useRef("");
  function getCompetitor(id) { return competitors.find((competitor) => competitor.id === id); }
  function getCategory(id) { return categories.find((category) => category.id === id); }
  const matchesByTatami = useMemo(() => {
    const grouped = new Map();
    pools.forEach((pool) => {
      (pool.matches || []).forEach((match) => {
        const tatami = String(match.tatami || "Non affecté");
        if (!grouped.has(tatami)) grouped.set(tatami, []);
        grouped.get(tatami).push({ pool, match });
      });
    });
    return Array.from(grouped.entries())
      .sort(([tatamiA], [tatamiB]) => tatamiOrder(tatamiA) - tatamiOrder(tatamiB) || String(tatamiA).localeCompare(String(tatamiB)))
      .map(([tatami, matches]) => ({ tatami, matches: matches.sort(sortArbitrationMatches) }));
  }, [pools]);
  const tatamis = matchesByTatami.map((group) => group.tatami);

  useEffect(() => {
    if (activeTatami !== ALL_TATAMIS && !tatamis.includes(activeTatami)) {
      setActiveTatami(ALL_TATAMIS);
    }
  }, [activeTatami, tatamis]);

  function handleTatamiSelection(tatami) {
    setActiveTatami(tatami);
    if (tatami === ALL_TATAMIS) {
      localStorage.removeItem(FAVORITE_TATAMI_STORAGE_KEY);
    } else {
      localStorage.setItem(FAVORITE_TATAMI_STORAGE_KEY, tatami);
    }
  }

  const selectedPool = pools.find((pool) => pool.id === selected?.poolId);
  const selectedMatch = selectedPool?.matches.find((match) => match.id === selected?.matchId);

  useEffect(() => {
    lastDraftSyncRef.current = "";
    if (!selectedPool || !selectedMatch || selectedMatch.statut === "Terminé") return undefined;

    const identity = { ...selectedMatch, competitionId: competition.id, poolId: selectedPool.id };
    let stopped = false;

    const syncDraft = async () => {
      const draft = loadArbitrationDraft(localStorage, identity);
      if (!draft?.payload || stopped) return;

      let livePayload = draft.payload;
      if (competitionRulesEngine.isKataDiscipline(selectedMatch.discipline) && Array.isArray(draft.payload.notes)) {
        livePayload = { kataName: draft.payload.kataName || "", kataScores: draft.payload.notes };
      }

      const draftSnapshot = JSON.stringify(livePayload);
      if (draftSnapshot === lastDraftSyncRef.current) return;

      try {
        await saveMatchResult(competition.id, selectedPool.id, {
          ...selectedMatch,
          ...livePayload,
          statut: "En cours",
          liveDraftSavedAt: draft.savedAt,
        });
        if (!stopped) lastDraftSyncRef.current = draftSnapshot;
      } catch (error) {
        console.error("Synchronisation de la saisie en cours impossible", error);
      }
    };

    syncDraft();
    const interval = setInterval(syncDraft, 500);
    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }, [competition.id, selectedPool?.id, selectedMatch?.id, selectedMatch?.statut, selectedMatch?.discipline]);

  function nextPassageFor(pool, match) {
    const group = matchesByTatami.find((item) => item.tatami === String(match.tatami || "Non affecté"));
    if (!group) return null;
    return findNextArbitrationPassage(group.matches, pool.id, match.id);
  }

  function renderNextPassage(pool, match) {
    const next = nextPassageFor(pool, match);
    if (!next) return <div style={{ margin: "12px 0 18px", padding: "14px 16px", border: "2px solid #d7dde5", borderRadius: "12px", background: "#f7f9fb" }}><strong>À SUIVRE · TATAMI {match.tatami}</strong><div style={{ marginTop: "6px" }}>Dernier passage prévu sur ce tatami.</div></div>;
    const nextMatch = next.match;
    const category = getCategory(next.pool.categoryId);
    const isKata = competitionRulesEngine.isKataDiscipline(nextMatch.discipline);
    const competitor = getCompetitor(nextMatch.competitorId || nextMatch.akaId);
    return <div style={{ margin: "12px 0 18px", padding: "14px 16px", border: "2px solid #1f5f99", borderRadius: "12px", background: "#eef6ff" }}><strong>À SUIVRE · TATAMI {nextMatch.tatami}</strong><div style={{ marginTop: "6px" }}>{disciplineLabel(nextMatch.discipline)}{category?.nom ? ` · ${category.nom}` : ""}</div>{isKata ? <div style={{ marginTop: "4px", fontWeight: 700 }}>Passage : {competitor?.nom || "-"} {competitor?.prenom || ""}</div> : <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "8px" }}><div style={{ padding: "8px 10px", borderRadius: "8px", background: "#b3261e", color: "white", fontWeight: 700 }}>AKA · {getCompetitor(nextMatch.akaId)?.nom || "-"} {getCompetitor(nextMatch.akaId)?.prenom || ""}</div><div style={{ padding: "8px 10px", borderRadius: "8px", background: "white", color: "#1f2937", border: "1px solid #9ca3af", fontWeight: 700 }}>SHIRO · {getCompetitor(nextMatch.shiroId)?.nom || "-"} {getCompetitor(nextMatch.shiroId)?.prenom || ""}</div></div>}</div>;
  }

  function refereeName(assignment) {
    if (!assignment) return "Non affecté";
    if (assignment.manualName) return assignment.manualName;
    const referee = getCompetitor(assignment.refereeId);
    return referee ? `${referee.nom || ""} ${referee.prenom || ""}`.trim() : "Non affecté";
  }

  function renderRefereeTeam(tatami) {
    const team = competition.refereeAssignments?.[tatami] || {};
    const tableCount = ["Arbitre de table 1", "Arbitre de table 2", "Arbitre de table 3"].filter((slot) => refereeName(team[slot]) !== "Non affecté").length;
    return <div style={{ margin: "12px 0 18px", padding: "14px 16px", border: "2px solid #d7dde5", borderRadius: "12px", background: "#ffffff" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", alignItems: "center" }}><strong>ÉQUIPE D’ARBITRAGE · TATAMI {tatami}</strong><span style={{ fontWeight: 700 }}>{tableCount >= 3 ? "Table complète · 3 arbitres" : tableCount >= 2 ? "Table opérationnelle · 2 arbitres minimum" : `Table incomplète · ${tableCount}/2 minimum`}</span></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "8px", marginTop: "10px" }}>{REFEREE_SLOTS.map((slot) => <div key={slot} style={{ padding: "8px 10px", borderRadius: "8px", background: "#f7f9fb", border: "1px solid #d7dde5" }}><div style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase" }}>{slot}</div><div style={{ marginTop: "3px", fontWeight: 700 }}>{refereeName(team[slot])}</div></div>)}</div>
    </div>;
  }

  async function saveMatch(result) {
    const winnerId = competitionRulesEngine.isKataDiscipline(selectedMatch.discipline) ? selectedMatch.akaId : result.vainqueur === "aka" ? selectedMatch.akaId : result.vainqueur === "shiro" ? selectedMatch.shiroId : null;
    const completedMatch = { ...selectedMatch, ...result, akaScore: result.scoreAka, shiroScore: result.scoreShiro, winnerId, statut: "Terminé" };

    try {
      await saveMatchResult(competition.id, selectedPool.id, completedMatch);
    } catch (error) {
      console.error("Enregistrement indépendant du résultat impossible", error);
      alert("Le résultat n'a pas pu être synchronisé. Vérifiez la connexion puis réessayez.");
      return false;
    }

    const updatedPools = pools.map((pool) => {
      if (pool.id !== selectedPool.id) return pool;
      const matches = pool.matches.map((match) => match.id === selectedMatch.id ? completedMatch : match);
      const changedPool = { ...pool, matches, poolTieBreakOrder: [], rankingLocked: [], podium: null };
      const calculation = calculatePoolPodium(changedPool);
      if (calculation.tieGroups.length) setPendingTieBreak({ poolId: pool.id, tieGroups: calculation.tieGroups, groupIndex: 0, order: [] });
      return calculation.pool;
    });
    onUpdateCompetition({ ...competition, pools: updatedPools, statut: "Résultats disponibles" });
    setSelected(null);
    return true;
  }

  function completeTieGroup(groupOrder) {
    const pool = pools.find((item) => item.id === pendingTieBreak.poolId);
    const order = [...pendingTieBreak.order, ...groupOrder];
    if (pendingTieBreak.groupIndex + 1 < pendingTieBreak.tieGroups.length) {
      setPendingTieBreak({ ...pendingTieBreak, groupIndex: pendingTieBreak.groupIndex + 1, order });
      return;
    }
    const resolvedPool = calculatePoolPodium({ ...pool, poolTieBreakOrder: order }).pool;
    onUpdateCompetition({ ...competition, pools: pools.map((item) => item.id === pool.id ? resolvedPool : item), statut: "Résultats disponibles" });
    setPendingTieBreak(null);
  }

  function tatamiProgress(matches) {
    const finished = matches.filter(({ match }) => match.statut === "Terminé").length;
    return { finished, remaining: matches.length - finished, total: matches.length };
  }

  function renderMatchCard(pool, match, currentMatchId) {
    const category = getCategory(pool.categoryId);
    const isKata = competitionRulesEngine.isKataDiscipline(match.discipline);
    const competitor = getCompetitor(match.competitorId || match.akaId);
    const winner = match.winnerId ? getCompetitor(match.winnerId) : null;
    const isCurrent = match.id === currentMatchId;
    return <article className={`competition arbitration-match-card ${match.statut === "Terminé" ? "competition-terminee" : ""} ${isCurrent ? "competition-current" : ""}`} key={`${pool.id}-${match.id}`}><div className="match-card-main"><p className="surtitle">{disciplineLabel(match.discipline)} · {category?.nom}</p><h3>#{match.ordre} Tatami {match.tatami} {match.horaire && `· ${match.horaire}`}</h3>{isKata ? <p>Passage : {competitor?.nom} {competitor?.prenom} · {competitor?.club || "Club non renseigné"}{match.finalScore ? ` · Note ${Number(match.finalScore).toFixed(2)}` : ""}</p> : <p>AKA {getCompetitor(match.akaId)?.nom} {getCompetitor(match.akaId)?.prenom} vs SHIRO {getCompetitor(match.shiroId)?.nom} {getCompetitor(match.shiroId)?.prenom}</p>}{winner && !isKata && <p>Vainqueur : {winner.nom} {winner.prenom}</p>}{isCurrent && <span className="current-match-badge">Combat en cours</span>}</div><div className="arbitration-card-actions"><button className="manage-button" onClick={() => setSelected({ poolId: pool.id, matchId: match.id })}>{match.statut === "Terminé" ? "Modifier" : "Arbitrer"}</button>{!isKata && <button className="manage-button" onClick={() => setHistoryMatch({ poolId: pool.id, matchId: match.id })}>Historique</button>}</div></article>;
  }

  if (pendingTieBreak) return <div className="arbitration-manager"><PoolTieBreakManager key={`${pendingTieBreak.poolId}-${pendingTieBreak.groupIndex}`} competitorIds={pendingTieBreak.tieGroups[pendingTieBreak.groupIndex]} getCompetitor={getCompetitor} onComplete={completeTieGroup} /></div>;
  if (historyMatch) {
    const pool = pools.find((item) => item.id === historyMatch.poolId);
    const match = pool?.matches.find((item) => item.id === historyMatch.matchId);
    return <div className="arbitration-manager"><button className="back-button" onClick={() => setHistoryMatch(null)}>← Retour aux matchs</button><section className="match-history-page"><div className="manager-header"><div><p className="surtitle">HISTORIQUE DU COMBAT</p><h2>{disciplineLabel(match?.discipline)} · {getCategory(pool?.categoryId)?.nom}</h2><p>AKA {getCompetitor(match?.akaId)?.nom} {getCompetitor(match?.akaId)?.prenom} vs SHIRO {getCompetitor(match?.shiroId)?.nom} {getCompetitor(match?.shiroId)?.prenom}</p></div></div>{match?.matchHistory?.length ? <ol className="history-timeline">{match.matchHistory.map((event, index) => <li key={`${event.type}-${index}`}><strong>{event.label}</strong><span>{event.detail}</span>{event.votes && <small>{event.votes.join(" · ")}</small>}</li>)}</ol> : <div className="empty-state"><h3>Aucun historique enregistré</h3><p>Validez le combat pour enregistrer les décisions chronologiques.</p></div>}</section></div>;
  }
  if (selectedPool && selectedMatch) {
    const category = getCategory(selectedPool.categoryId);
    const matchProps = { ...selectedMatch, aka: getCompetitor(selectedMatch.akaId), shiro: getCompetitor(selectedMatch.shiroId), competitor: getCompetitor(selectedMatch.competitorId || selectedMatch.akaId), categoryName: category?.nom, poolName: selectedPool.nom, poolId: selectedPool.id, competitionId: competition.id };
    const localDraft = loadArbitrationDraft(localStorage, matchProps);
    const liveSheetVersion = JSON.stringify({ statut: selectedMatch.statut, liveDraftSavedAt: selectedMatch.liveDraftSavedAt, akaScore: selectedMatch.akaScore, shiroScore: selectedMatch.shiroScore, scoreAka: selectedMatch.scoreAka, scoreShiro: selectedMatch.scoreShiro, finalScore: selectedMatch.finalScore, kataName: selectedMatch.kataName, kataScores: selectedMatch.kataScores, assaults: selectedMatch.assaults, tieBreakAssaults: selectedMatch.tieBreakAssaults, finalFlags: selectedMatch.finalFlags, penalties: selectedMatch.penalties, maiWarnings: selectedMatch.maiWarnings, matchHistory: selectedMatch.matchHistory });
    const liveSheetKey = localDraft ? String(selectedMatch.id) : `${selectedMatch.id}:${liveSheetVersion}`;
    return <div className="arbitration-manager"><button className="back-button" onClick={() => setSelected(null)}>← Retour aux matchs</button>{renderRefereeTeam(selectedMatch.tatami)}{renderNextPassage(selectedPool, selectedMatch)}{competitionRulesEngine.isKataDiscipline(selectedMatch.discipline) ? <KataSheet key={liveSheetKey} match={matchProps} onSave={saveMatch} /> : <MatchManager key={liveSheetKey} match={matchProps} onSave={saveMatch} />}</div>;
  }

  if (showControl) return <div className="arbitration-manager"><button className="back-button" type="button" onClick={() => setShowControl(false)}>← Vue arbitrage</button><CompetitionControl competition={competition} onOpenMatch={(poolId, matchId) => { setShowControl(false); setSelected({ poolId, matchId }); }} /></div>;

  const displayedGroups = activeTatami === ALL_TATAMIS ? matchesByTatami : matchesByTatami.filter((group) => group.tatami === activeTatami);
  return <div className="arbitration-manager"><div className="manager-header"><div><p className="surtitle">ARBITRAGE DIRECT</p><h2>Arbitrage par tatami</h2><p>Sélectionnez un tatami pour ouvrir la liste de passage dédiée. Le choix est mémorisé sur cette tablette.</p></div><div><button className="primary" type="button" onClick={() => setShowControl(true)}>Vue contrôle compétition</button></div></div>{pools.length === 0 ? <div className="empty-state"><h3>Aucun match disponible</h3><p>Générez et validez les poules avant l'arbitrage.</p></div> : <><div className="tatami-tabs" role="tablist" aria-label="Sélection du tatami"><button className={activeTatami === ALL_TATAMIS ? "active" : ""} onClick={() => handleTatamiSelection(ALL_TATAMIS)}>Tous</button>{tatamis.map((tatami) => <button key={tatami} className={activeTatami === tatami ? "active" : ""} onClick={() => handleTatamiSelection(tatami)}>Tatami {tatami}</button>)}</div><div className="tatami-groups">{displayedGroups.map((group) => { const progress = tatamiProgress(group.matches); const current = group.matches.find(({ match }) => match.statut !== "Terminé"); return <section className="tatami-group" key={group.tatami}><div className="tatami-group-header"><div><p className="surtitle">TATAMI {group.tatami}</p><h3>{progress.finished} terminés · {progress.remaining} restants</h3></div><div className="tatami-progress" aria-label={`${progress.finished} combats terminés sur ${progress.total}`}><span style={{ width: `${progress.total ? (progress.finished / progress.total) * 100 : 0}%` }} /></div></div>{renderRefereeTeam(group.tatami)}<div className="competition-list">{group.matches.map(({ pool, match }) => renderMatchCard(pool, match, current?.match.id))}</div></section>; })}</div></>}</div>;
}
export default ArbitrationManager;