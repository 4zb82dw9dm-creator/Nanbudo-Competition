import { useState } from "react";
import { buildAutomaticCategories, disciplineLabel } from "./competitionLogic";
import { getValidKataGroup, KATA_GROUP_OPTIONS } from "./constants/katas";
import { competitionRulesEngine } from "./rules/competitionRulesEngine";
import { categoryMaxAge, categorySexes, CHILD_DISCIPLINE_MAX_AGE } from "./categoryRules";

function CategoriesManager({ competition, onUpdateCompetition }) {
  const competitors = competition.competitors || [];
  const categories = competition.categories || [];
  const [selectedIds, setSelectedIds] = useState([]);
  const [categoryName, setCategoryName] = useState("");

  function getCompetitor(id) { return competitors.find((competitor) => competitor.id === id); }
  function regenerate() { onUpdateCompetition({ ...competition, categories: buildAutomaticCategories(competitors), pools: [], statut: "Catégories générées" }); }
  function deleteCategory(id) { onUpdateCompetition({ ...competition, categories: categories.filter((category) => category.id !== id), pools: (competition.pools || []).filter((pool) => pool.categoryId !== id) }); }
  function toggle(id) { setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]); }
  function updateKataGroup(categoryId, kataGroup) {
    const category = categories.find((item) => item.id === categoryId);
    const maxAge = categoryMaxAge(category, competitors);
    if (["Kata 0", "Kata 1"].includes(kataGroup) && maxAge !== null && maxAge > CHILD_DISCIPLINE_MAX_AGE) {
      return alert(`Kata 0 et Kata 1 sont réservés aux compétiteurs de ${CHILD_DISCIPLINE_MAX_AGE} ans maximum.`);
    }
    onUpdateCompetition({ ...competition, categories: categories.map((item) => item.id === categoryId ? { ...item, kataGroup } : item), pools: [] });
  }
  function mergeSelected() {
    if (selectedIds.length < 2) return alert("Sélectionnez au moins deux catégories à fusionner.");
    const selected = categories.filter((category) => selectedIds.includes(category.id));
    if (new Set(selected.map((category) => category.discipline)).size > 1) return alert("La fusion manuelle doit conserver la même discipline.");
    const competitorIds = [...new Set(selected.flatMap((category) => category.competitorIds))];
    const discipline = selected[0].discipline;
    const kataGroup = competitionRulesEngine.isKataDiscipline(discipline) ? getValidKataGroup(selected.find((category) => category.kataGroup)?.kataGroup) : "";
    const mergedSexes = [...new Set(selected.flatMap((category) => categorySexes(category, competitors)))];
    const manualMixed = mergedSexes.length > 1;
    const merged = { id: Date.now(), nom: categoryName.trim() || `Fusion · ${selected.map((category) => category.nom).join(" + ")}`, discipline, kataGroup, competitorIds, sexe: manualMixed ? "Mixte" : mergedSexes[0] || selected[0].sexe, statut: "Prête", manual: true, manualMixed };
    onUpdateCompetition({ ...competition, categories: [...categories.filter((category) => !selectedIds.includes(category.id)), merged], pools: [] });
    setSelectedIds([]); setCategoryName("");
  }
  function splitCompetitor(category, competitorId) {
    const competitor = getCompetitor(competitorId);
    const split = { ...category, id: Date.now(), nom: `${category.nom} · ${competitor?.nom || "Séparé"}`, competitorIds: [competitorId], sexe: competitor?.sexe || category.sexe, statut: "À fusionner", manual: true, manualMixed: false };
    onUpdateCompetition({ ...competition, categories: categories.flatMap((item) => item.id === category.id ? [{ ...item, competitorIds: item.competitorIds.filter((id) => id !== competitorId) }, split].filter((cat) => cat.competitorIds.length > 0) : [item]), pools: [] });
  }

  return <div className="categories-manager"><div className="manager-header"><div><p className="surtitle">CATÉGORIES AUTOMATIQUES</p><h2>Catégories</h2><p>Regroupement automatique par âge, sexe et grade. Les catégories hommes/femmes restent séparées. Une catégorie mixte ne peut être créée que par fusion manuelle.</p></div><div className="category-total"><strong>{categories.length}</strong><span>catégories</span></div></div><div className="test-tools"><button className="manage-button" onClick={regenerate}>Recréer automatiquement</button><input value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="Nom de la catégorie fusionnée" /><button className="primary" onClick={mergeSelected}>Fusionner la sélection</button></div>{categories.length === 0 ? <div className="empty-state"><h3>Aucune catégorie</h3><p>Clôturez les inscriptions pour générer les catégories.</p></div> : <div className="competition-list">{categories.map((category) => { const maxAge = categoryMaxAge(category, competitors); const kataOptions = KATA_GROUP_OPTIONS.filter((kataGroup) => maxAge === null || maxAge <= CHILD_DISCIPLINE_MAX_AGE || !["Kata 0", "Kata 1"].includes(kataGroup)); return <article className="competition" key={category.id}><div><label className="checkbox-line"><input type="checkbox" checked={selectedIds.includes(category.id)} onChange={() => toggle(category.id)} /> <strong>{category.nom}</strong></label><p>{disciplineLabel(category.discipline)} · {category.statut}{category.manualMixed ? " · Mixte créé manuellement" : ""}</p>{competitionRulesEngine.isKataDiscipline(category.discipline) && <label>Liste de katas<select value={getValidKataGroup(category.kataGroup)} onChange={(event) => updateKataGroup(category.id, event.target.value)}>{kataOptions.map((kataGroup) => <option key={kataGroup} value={kataGroup}>{kataGroup}</option>)}</select></label>}<div className="competitor-events">{category.competitorIds.map((id) => { const competitor = getCompetitor(id); return <span key={id}>{competitor?.nom} {competitor?.prenom} <button className="link-button" onClick={() => splitCompetitor(category, id)}>Séparer</button></span>; })}</div></div><button className="delete-button" onClick={() => deleteCategory(category.id)}>Supprimer</button></article>; })}</div>}</div>;
}
export default CategoriesManager;
