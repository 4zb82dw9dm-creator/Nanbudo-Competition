import { useEffect, useMemo, useState } from "react";
import MatchManager, { PoolTieBreakManager } from "./MatchManager";
import KataSheet from "./KataSheet";
import { calculatePoolPodium, disciplineLabel } from "./competitionLogic";
import { competitionRulesEngine } from "./rules/competitionRulesEngine";

const ALL_TATAMIS = "all";
const FAVORITE_TATAMI_STORAGE_KEY = "nanbudo-favorite-tatami";

function matchOrder(match) {
  return Number(match.ordre) || 0;
}

function tatamiOrder(tatami) {
  return Number(tatami) || 0;
}

function sortMatchesByPassage(a, b) {
  return matchOrder(a.match) - matchOrder(b.match) || tatamiOrder(a.match.tatami) - tatamiOrder(b.match.tatami) || String(a.match.id).localeCompare(String(b.match.id));
}

function ArbitrationManager({ competition, onUpdateCompetition }) {
  const pools = competition.pools || [];
  const competitors = competition.competitors || [];
  const categories = competition.categories || [];
  const [selected, setSelected] = useState(null);
  const [historyMatch, setHistoryMatch] = useState(null);
  const [pendingTieBreak, setPendingTieBreak] = useState(null);
  const [activeTatami, setActiveTatami] = useState(() => localStorage.getItem(FAVORITE_TATAMI_STORAGE_KEY) || ALL_TATAMIS);
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
      .map(([tatami, matches]) => ({ tatami, matches: matches.sort(sortMatchesByPassage) }));
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

  function saveMatch(result) {
    const winnerId = competitionRulesEngine.isKataDiscipline(selectedMatch.discipline) ? selectedMatch.akaId : result.vainqueur === "aka" ? selectedMatch.akaId : result.vainqueur === "shiro" ? selectedMatch.shiroId : null;
    const updatedPools = pools.map((pool) => {
      if (pool.id !== selectedPool.id) return pool;
      const matches = pool.matches.map((match) => match.id === selectedMatch.id ? { ...match, ...result, akaScore: result.scoreAka, shiroScore: result.scoreShiro, winnerId, statut: "Terminé" } : match);
      const changedPool = { ...pool, matches, poolTieBreakOrder: [], rankingLocked: [], podium: null };
      const calculation = calculatePoolPodium(changedPool);
      if (calculation.tieGroups.length) setPendingTieBreak({ poolId: pool.id, tieGroups: calculation.tieGroups, groupIndex: 0, order: [] });
      return calculation.pool;
    });
    onUpdateCompetition({ ...competition, pools: updatedPools, statut: "Résultats disponibles" });
    setSelected(null);
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
    const matchProps = { ...selectedMatch, aka: getCompetitor(selectedMatch.akaId), shiro: getCompetitor(selectedMatch.shiroId), competitor: getCompetitor(selectedMatch.competitorId || selectedMatch.akaId), categoryName: category?.nom, poolName: selectedPool.nom, poolId: selectedPool.id };
    return <div className="arbitration-manager"><button className="back-button" onClick={() => setSelected(null)}>← Retour aux matchs</button>{competitionRulesEngine.isKataDiscipline(selectedMatch.discipline) ? <KataSheet key={selectedMatch.id} match={matchProps} onSave={saveMatch} /> : <MatchManager key={selectedMatch.id} match={matchProps} onSave={saveMatch} />}</div>;
  }

  const displayedGroups = activeTatami === ALL_TATAMIS ? matchesByTatami : matchesByTatami.filter((group) => group.tatami === activeTatami);
  return <div className="arbitration-manager"><div className="manager-header"><div><p className="surtitle">ARBITRAGE DIRECT</p><h2>Arbitrage par tatami</h2><p>Sélectionnez un tatami pour ouvrir la liste de passage dédiée. Le choix est mémorisé sur cette tablette.</p></div></div>{pools.length === 0 ? <div className="empty-state"><h3>Aucun match disponible</h3><p>Générez et validez les poules avant l'arbitrage.</p></div> : <><div className="tatami-tabs" role="tablist" aria-label="Sélection du tatami"><button className={activeTatami === ALL_TATAMIS ? "active" : ""} onClick={() => handleTatamiSelection(ALL_TATAMIS)}>Tous</button>{tatamis.map((tatami) => <button key={tatami} className={activeTatami === tatami ? "active" : ""} onClick={() => handleTatamiSelection(tatami)}>Tatami {tatami}</button>)}</div><div className="tatami-groups">{displayedGroups.map((group) => { const progress = tatamiProgress(group.matches); const current = group.matches.find(({ match }) => match.statut !== "Terminé"); return <section className="tatami-group" key={group.tatami}><div className="tatami-group-header"><div><p className="surtitle">TATAMI {group.tatami}</p><h3>{progress.finished} terminés · {progress.remaining} restants</h3></div><div className="tatami-progress" aria-label={`${progress.finished} combats terminés sur ${progress.total}`}><span style={{ width: `${progress.total ? (progress.finished / progress.total) * 100 : 0}%` }} /></div></div><div className="competition-list">{group.matches.map(({ pool, match }) => renderMatchCard(pool, match, current?.match.id))}</div></section>; })}</div></>}</div>;
}
export default ArbitrationManager;
