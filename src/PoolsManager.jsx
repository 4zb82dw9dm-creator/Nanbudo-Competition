import { useState } from "react";
import { buildPoolsForCategory, generateMatches, disciplineLabel, setPoolTatami } from "./competitionLogic";
import { balancedTatamiAssignments } from "./planningLogic";
import { prepareCategoriesForPools } from "./categoryRules";

function PoolsManager({ competition, onUpdateCompetition }) {
  const [selectedPoolIds, setSelectedPoolIds] = useState([]);
  const categories = competition.categories || [];
  const competitors = competition.competitors || [];
  const pools = competition.pools || [];
  const tatamiCount = Math.max(1, Number(competition.tatamis) || 1);
  const sortedPools = [...pools].sort((a, b) => (Number(a.tatami) || 1) - (Number(b.tatami) || 1));
  function getCompetitor(id) { return competitors.find((competitor) => competitor.id === id); }
  function generateAllPools() {
    const preparedCategories = prepareCategoriesForPools(categories, competitors);
    const assignments = balancedTatamiAssignments(preparedCategories, tatamiCount);
    let nextPoolIndex = 0;
    const generatedPools = preparedCategories.flatMap((category) => {
      const assignedTatami = assignments.get(String(category.id)) || 1;
      const categoryPools = buildPoolsForCategory(category, { tatamiCount, startIndex: nextPoolIndex, competitors }).map((pool) => setPoolTatami(pool, assignedTatami));
      nextPoolIndex += categoryPools.length;
      return categoryPools;
    });
    onUpdateCompetition({ ...competition, categories: preparedCategories, pools: generatedPools, planningAdjustments: {}, statut: "Poules générées" });
  }
  function mergePools() {
    const selected = pools.filter((pool) => selectedPoolIds.includes(pool.id));
    if (selected.length < 2) return alert("Sélectionnez au moins deux poules.");
    const first = selected[0];
    if (selected.some((pool) => pool.categoryId !== first.categoryId || pool.discipline !== first.discipline)) return alert("Sélectionnez des poules de la même catégorie et discipline.");
    const siblings = pools.filter((pool) => pool.categoryId === first.categoryId);
    if (siblings.length !== selected.length) return alert("Sélectionnez toutes les poules de cette catégorie pour créer une poule unique.");
    if (selected.some((pool) => pool.podium || (pool.matches || []).some((match) => match.statut !== "À jouer"))) return alert("Impossible de fusionner des poules dont les épreuves ont commencé.");
    const category = categories.find((item) => item.id === first.categoryId);
    if (!category) return alert("Catégorie introuvable.");
    const ids = [...new Set(selected.flatMap((pool) => pool.competitorIds))];
    if (!window.confirm(`Créer une poule unique de ${ids.length} compétiteurs ? Les matchs seront régénérés. Vérifiez la sécurité des compétiteurs.`)) return;
    const tatami = first.tatami || 1;
    const merged = { id: `${Date.now()}-${category.id}-fusion`, categoryId: category.id, discipline: category.discipline, nom: `${category.nom} · Poule unique`, competitorIds: ids, tatami, matches: generateMatches(ids, category, 0, tatami), statut: "Tableau généré", rankingLocked: [], podium: null };
    onUpdateCompetition({ ...competition, pools: [...pools.filter((pool) => !selectedPoolIds.includes(pool.id)), merged], planningAdjustments: {} });
    setSelectedPoolIds([]);
  }
  function changePoolTatami(poolId, tatami) {
    const selectedTatami = Number(tatami) || 1;
    const categoryId = pools.find((pool) => pool.id === poolId)?.categoryId;
    onUpdateCompetition({ ...competition, pools: pools.map((pool) => pool.categoryId === categoryId ? setPoolTatami(pool, selectedTatami) : pool), planningAdjustments: {} });
  }
  return <div className="pools-manager"><div className="manager-header"><div><p className="surtitle">POULES ET TABLEAU</p><h2>Poules</h2><p>Regroupement par poids proche en Randori et Ju-Randori, séparation automatique hommes/femmes, équilibrage des poules par tatami, puis génération des matchs et de l'ordre de passage. Aucune poule mixte n'est créée automatiquement, même en cas d'effectif insuffisant.</p></div><div className="category-total"><strong>{pools.length}</strong><span>poules</span></div></div><button className="primary" onClick={generateAllPools} disabled={categories.length === 0}>Générer automatiquement toutes les poules</button><button className="manage-button" onClick={mergePools} disabled={selectedPoolIds.length < 2}>Fusionner les poules sélectionnées</button>{pools.length === 0 ? <div className="empty-state"><h3>Aucune poule</h3><p>Validez les catégories puis générez les poules.</p></div> : <div className="competition-list">{sortedPools.map((pool) => { const poolTatami = pool.tatami || 1; return <article className="competition" key={pool.id}><div><p className="surtitle">{disciplineLabel(pool.discipline)}</p><div className="pool-card-title"><label style={{ display: "flex", alignItems: "center", gap: 10 }}><input type="checkbox" style={{ appearance: "auto", WebkitAppearance: "checkbox", width: 23, height: 23 }} checked={selectedPoolIds.includes(pool.id)} onChange={() => setSelectedPoolIds((current) => current.includes(pool.id) ? current.filter((id) => id !== pool.id) : [...current, pool.id])} /><strong>{pool.nom}</strong></label><label>Tatami : <select value={poolTatami} onChange={(event) => changePoolTatami(pool.id, event.target.value)}>{Array.from({ length: tatamiCount }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}</select></label></div><p>{pool.competitorIds.length} compétiteurs · {pool.matches.length} matchs · {pool.statut === "À valider" ? "Tableau généré" : pool.statut}</p><div className="competitor-events">{pool.competitorIds.map((id) => <span key={id}>{getCompetitor(id)?.nom} {getCompetitor(id)?.prenom}</span>)}</div><div className="pool-matches"><h3>Tableau de compétition</h3><p><strong>Tatami {poolTatami}</strong></p>{pool.matches.map((match) => <p key={match.id}>#{match.ordre}{match.horaire ? ` · ${match.horaire}` : ""} · {getCompetitor(match.akaId)?.nom}{match.shiroId ? ` / ${getCompetitor(match.shiroId)?.nom}` : ""} · {match.statut}</p>)}</div></div></article>; })}</div>}</div>;
}
export default PoolsManager;
