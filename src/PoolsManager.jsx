import { buildPoolsForCategory, calculateRanking, podiumFromPool, disciplineLabel, setPoolTatami } from "./competitionLogic";
import { balancedTatamiAssignments } from "./planningLogic";

function PoolsManager({ competition, onUpdateCompetition }) {
  const categories = competition.categories || [];
  const competitors = competition.competitors || [];
  const pools = competition.pools || [];
  const tatamiCount = Math.max(1, Number(competition.tatamis) || 1);
  function getCompetitor(id) { return competitors.find((competitor) => competitor.id === id); }
  function generateAllPools() {
    const assignments = balancedTatamiAssignments(categories, tatamiCount);
    let nextPoolIndex = 0;
    const generatedPools = categories.flatMap((category) => {
      const assignedTatami = assignments.get(String(category.id)) || 1;
      const categoryPools = buildPoolsForCategory(category, { tatamiCount, startIndex: nextPoolIndex }).map((pool) => setPoolTatami(pool, assignedTatami));
      nextPoolIndex += categoryPools.length;
      return categoryPools;
    });
    onUpdateCompetition({ ...competition, pools: generatedPools, planningAdjustments: {}, statut: "Poules générées" });
  }
  function validatePool(poolId) {
    onUpdateCompetition({
      ...competition,
      pools: pools.map((pool) => {
        if (pool.id !== poolId) return pool;
        const tatami = pool.tatami || 1;
        return {
          ...pool,
          tatami,
          statut: "Tableau généré",
          matches: pool.matches.map((match, index) => ({
            ...match,
            ordre: index + 1,
            tatami,
            horaire: competition.horairesActifs ? `${String(9 + Math.floor(index / 4)).padStart(2, "0")}:${String((index % 4) * 15).padStart(2, "0")}` : "",
          })),
        };
      }),
      statut: "Tableau généré",
    });
  }
  function changePoolTatami(poolId, tatami) {
    const selectedTatami = Number(tatami) || 1;
    const categoryId = pools.find((pool) => pool.id === poolId)?.categoryId;
    onUpdateCompetition({ ...competition, pools: pools.map((pool) => pool.categoryId === categoryId ? setPoolTatami(pool, selectedTatami) : pool), planningAdjustments: {} });
  }
  function closePool(pool) { onUpdateCompetition({ ...competition, pools: pools.map((item) => item.id === pool.id ? { ...item, rankingLocked: calculateRanking(item), podium: podiumFromPool(item), statut: "Terminée" } : item), statut: "Résultats disponibles" }); }

  return <div className="pools-manager"><div className="manager-header"><div><p className="surtitle">POULES ET TABLEAU</p><h2>Poules</h2><p>Tirage aléatoire, équilibrage automatique des poules par tatami, puis génération des matchs et de l'ordre de passage.</p></div><div className="category-total"><strong>{pools.length}</strong><span>poules</span></div></div><button className="primary" onClick={generateAllPools} disabled={categories.length === 0}>Générer automatiquement toutes les poules</button>{pools.length === 0 ? <div className="empty-state"><h3>Aucune poule</h3><p>Validez les catégories puis générez les poules.</p></div> : <div className="competition-list">{pools.map((pool) => { const finished = pool.matches.length > 0 && pool.matches.every((match) => match.statut === "Terminé"); const poolTatami = pool.tatami || 1; return <article className="competition" key={pool.id}><div><p className="surtitle">{disciplineLabel(pool.discipline)}</p><div className="pool-card-title"><h3>{pool.nom}</h3><label>Tatami : <select value={poolTatami} onChange={(event) => changePoolTatami(pool.id, event.target.value)}>{Array.from({ length: tatamiCount }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}</select></label></div><p>{pool.competitorIds.length} compétiteurs · {pool.matches.length} matchs · {pool.statut}</p><div className="competitor-events">{pool.competitorIds.map((id) => <span key={id}>{getCompetitor(id)?.nom} {getCompetitor(id)?.prenom}</span>)}</div><div className="pool-matches"><h3>Tableau de compétition</h3><p><strong>Tatami {poolTatami}</strong></p>{pool.matches.map((match) => <p key={match.id}>#{match.ordre}{match.horaire ? ` · ${match.horaire}` : ""} · {getCompetitor(match.akaId)?.nom}{match.shiroId ? ` / ${getCompetitor(match.shiroId)?.nom}` : ""} · {match.statut}</p>)}</div></div><div className="competition-actions"><button className="manage-button" onClick={() => validatePool(pool.id)}>Valider la poule / générer tableau</button><button className="primary" disabled={!finished} onClick={() => closePool(pool)}>Calculer podium</button></div></article>; })}</div>}</div>;
}
export default PoolsManager;
