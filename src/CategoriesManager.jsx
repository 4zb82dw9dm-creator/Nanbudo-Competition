import { useState } from "react";
import { buildAutomaticCategories, disciplineLabel } from "./competitionLogic";
import { getValidKataGroup, KATA_GROUP_OPTIONS } from "./constants/katas";
import { competitionRulesEngine } from "./rules/competitionRulesEngine";

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
    onUpdateCompetition({ ...competition, categories: categories.map((category) => category.id === categoryId ? { ...category, kataGroup } : category), pools: [] });
  }
  function mergeSelected() {
    if (selectedIds.length < 2) return alert("Sélectionnez au moins deux catégories à fusionner.");
    const selected = categories.filter((category) => selectedIds.includes(category.id));
    const competitorIds = [...new Set(selected.flatMap((category) => category.competitorIds))];
    const discipline = selected[0].discipline;
    const kataGroup = competitionRulesEngine.isKataDiscipline(discipline) ? getValidKataGroup(selected.find((category) => category.kataGroup)?.kataGroup) : "";
    const merged = { id: Date.now(), nom: categoryName.trim() || `Fusion · ${selected.map((category) => category.nom).join(" + ")}`, discipline, kataGroup, competitorIds, statut: "Prête", manual: true };
    onUpdateCompetition({ ...competition, categories: [...categories.filter((category) => !selectedIds.includes(category.id)), merged], pools: [] });
    setSelectedIds([]); setCategoryName("");
  }
  function splitCompetitor(category, competitorId) {
    const competitor = getCompetitor(competitorId);
    const split = { ...category, id: Date.now(), nom: `${category.nom} · ${competitor?.nom || "Séparé"}`, competitorIds: [competitorId], statut: "À fusionner", manual: true };
    onUpdateCompetition({ ...competition, categories: categories.flatMap((item) => item.id === category.id ? [{ ...item, competitorIds: item.competitorIds.filter((id) => id !== competitorId) }, split].filter((cat) => cat.competitorIds.length > 0) : [item]), pools: [] });
  }

  return <div className="categories-manager"><div className="manager-header"><div><p className="surtitle">CATÉGORIES AUTOMATIQUES</p><h2>Catégories</h2><p>Regroupement automatique par âge, sexe et grade. L'organisateur peut fusionner ou séparer.</p></div><div className="category-total"><strong>{categories.length}</strong><span>catégories</span></div></div><div className="test-tools"><button className="manage-button" onClick={regenerate}>Recréer automatiquement</button><input value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="Nom de la catégorie fusionnée" /><button className="primary" onClick={mergeSelected}>Fusionner la sélection</button></div>{categories.length === 0 ? <div className="empty-state"><h3>Aucune catégorie</h3><p>Clôturez les inscriptions pour générer les catégories.</p></div> : <div className="competition-list">{categories.map((category) => <article className="competition" key={category.id}><div><label className="checkbox-line"><input type="checkbox" checked={selectedIds.includes(category.id)} onChange={() => toggle(category.id)} /> <strong>{category.nom}</strong></label><p>{disciplineLabel(category.discipline)} · {category.statut}</p>{competitionRulesEngine.isKataDiscipline(category.discipline) && <label>Liste de katas<select value={getValidKataGroup(category.kataGroup)} onChange={(event) => updateKataGroup(category.id, event.target.value)}>{KATA_GROUP_OPTIONS.map((kataGroup) => <option key={kataGroup} value={kataGroup}>{kataGroup}</option>)}</select></label>}<div className="competitor-events">{category.competitorIds.map((id) => { const competitor = getCompetitor(id); return <span key={id}>{competitor?.nom} {competitor?.prenom} <button className="link-button" onClick={() => splitCompetitor(category, id)}>Séparer</button></span>; })}</div></div><button className="delete-button" onClick={() => deleteCategory(category.id)}>Supprimer</button></article>)}</div>}</div>;
}
export default CategoriesManager;
