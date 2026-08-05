import { useState } from "react";
import MatchManager from "./MatchManager";
import KataSheet from "./KataSheet";
import { calculateRanking, podiumFromPool, disciplineLabel } from "./competitionLogic";
import { competitionRulesEngine } from "./rules/competitionRulesEngine";

function ArbitrationManager({ competition, onUpdateCompetition }) {
  const pools = competition.pools || [];
  const competitors = competition.competitors || [];
  const categories = competition.categories || [];
  const [selected, setSelected] = useState(null);
  const [historyMatch, setHistoryMatch] = useState(null);
  function getCompetitor(id) { return competitors.find((competitor) => competitor.id === id); }
  function getCategory(id) { return categories.find((category) => category.id === id); }
  const selectedPool = pools.find((pool) => pool.id === selected?.poolId);
  const selectedMatch = selectedPool?.matches.find((match) => match.id === selected?.matchId);
  function saveMatch(result) {
    const winnerId = competitionRulesEngine.isKataDiscipline(selectedMatch.discipline) ? selectedMatch.akaId : result.vainqueur === "aka" ? selectedMatch.akaId : result.vainqueur === "shiro" ? selectedMatch.shiroId : null;
    const updatedPools = pools.map((pool) => {
      if (pool.id !== selectedPool.id) return pool;
      const matches = pool.matches.map((match) => match.id === selectedMatch.id ? { ...match, ...result, akaScore: result.scoreAka, shiroScore: result.scoreShiro, winnerId, statut: "Terminé" } : match);
      const complete = matches.length > 0 && matches.every((match) => match.statut === "Terminé");
      return { ...pool, matches, rankingLocked: complete ? calculateRanking({ ...pool, matches }) : pool.rankingLocked, podium: complete ? podiumFromPool({ ...pool, matches }) : pool.podium, statut: complete ? "Terminée" : pool.statut };
    });
    onUpdateCompetition({ ...competition, pools: updatedPools, statut: "Résultats disponibles" });
    setSelected(null);
  }
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
  return <div className="arbitration-manager"><div className="manager-header"><div><p className="surtitle">ARBITRAGE DIRECT</p><h2>Arbitrage</h2><p>Le clic sur un match ouvre immédiatement la feuille officielle Kata ou Combat, sans page intermédiaire.</p></div></div>{pools.length === 0 ? <div className="empty-state"><h3>Aucun match disponible</h3><p>Générez et validez les poules avant l'arbitrage.</p></div> : <div className="competition-list">{pools.flatMap((pool) => (pool.matches || []).map((match) => { const category = getCategory(pool.categoryId); const isKata = competitionRulesEngine.isKataDiscipline(match.discipline); const competitor = getCompetitor(match.competitorId || match.akaId); const winner = match.winnerId ? getCompetitor(match.winnerId) : null; return <article className={`competition ${match.statut === "Terminé" ? "competition-terminee" : ""}`} key={match.id}><div><p className="surtitle">{disciplineLabel(match.discipline)} · {category?.nom}</p><h3>#{match.ordre} Tatami {match.tatami} {match.horaire && `· ${match.horaire}`}</h3>{isKata ? <p>Passage : {competitor?.nom} {competitor?.prenom} · {competitor?.club || "Club non renseigné"}{match.finalScore ? ` · Note ${Number(match.finalScore).toFixed(2)}` : ""}</p> : <p>AKA {getCompetitor(match.akaId)?.nom} {getCompetitor(match.akaId)?.prenom} vs SHIRO {getCompetitor(match.shiroId)?.nom} {getCompetitor(match.shiroId)?.prenom}</p>}{winner && !isKata && <p>Vainqueur : {winner.nom} {winner.prenom}</p>}</div><button className="manage-button" onClick={() => setSelected({ poolId: pool.id, matchId: match.id })}>{match.statut === "Terminé" ? "Modifier" : "Arbitrer"}</button>{!isKata && <button className="manage-button" onClick={() => setHistoryMatch({ poolId: pool.id, matchId: match.id })}>Historique</button>}</article>; }))}</div>}</div>;
}
export default ArbitrationManager;
