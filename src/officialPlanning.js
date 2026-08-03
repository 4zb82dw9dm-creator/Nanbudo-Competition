import { DOCUMENT_TYPES } from "./documentLibrary.js";

const DEFAULT_DISCIPLINE_ORDER = ["kata", "randori", "juRandori"];
const DISCIPLINE_LABELS = {
  kata: "Kata",
  randori: "Randori",
  juRandori: "Ju Randori",
};
const AGE_CATEGORY_ORDER = ["poussin", "pupille", "benjamin", "minime", "cadet", "junior", "senior", "veteran"];
const SEX_ORDER = ["Femme", "Homme"];
const DEFAULT_PLANNING_EVENTS = [
  { id: "opening-ceremony", type: "ceremony", label: "Cérémonie d'ouverture", time: "", enabled: false },
  { id: "referee-break", type: "break", label: "Pause arbitres", time: "", enabled: false },
  { id: "lunch-break", type: "break", label: "Pause déjeuner", time: "", enabled: false },
  { id: "awards-ceremony", type: "ceremony", label: "Remise des récompenses", time: "", enabled: false },
];

export const OFFICIAL_PLANNING_DOCUMENT_TITLE = "Planning officiel";

function createPlanningId(prefix = "planning") {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function normalizePlanningText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function getPlanningDisciplineKey(value) {
  const text = normalizePlanningText(value);
  if (text.includes("ju") && text.includes("randori")) return "juRandori";
  if (text.includes("randori")) return "randori";
  return "kata";
}

export function getPlanningDisciplineLabel(key) {
  return DISCIPLINE_LABELS[key] || String(key || "Épreuve");
}

function getCategory(competition, pool) {
  return (competition.categories || []).find((category) => String(category.id) === String(pool.categoryId));
}

function getCompetitor(competition, id) {
  return (competition.competitors || competition.participants || []).find((competitor) => String(competitor.id) === String(id));
}

function getCategoryName(pool, category) {
  return category?.nom || pool.nom || "Catégorie";
}

function getAgeRank(pool, category) {
  const candidates = [category?.ageClass, category?.categorie, category?.trancheAge, category?.nom, pool.ageClass, pool.nom];
  const text = normalizePlanningText(candidates.filter(Boolean).join(" "));
  const rank = AGE_CATEGORY_ORDER.findIndex((label) => text.includes(label));
  return rank === -1 ? AGE_CATEGORY_ORDER.length : rank;
}

function getSexRank(pool, category) {
  const source = category?.sexe || pool.sexe || getCategoryName(pool, category);
  const text = normalizePlanningText(source);
  if (text.includes("femme") || text.includes("fille") || text.includes("feminin")) return 0;
  if (text.includes("homme") || text.includes("garcon") || text.includes("masculin")) return 1;
  return SEX_ORDER.length;
}

function getCategoryWorkload(pool) {
  const matchCount = (pool.rounds || []).reduce((total, round) => total + (round.matches || []).length, 0) + (pool.matches || []).length;
  const passageCount = (pool.passages || []).length;
  const competitorCount = (pool.competitorIds || []).length;
  return Math.max(1, matchCount, passageCount, competitorCount);
}

function getWeightLabel(category, competitors) {
  const explicitWeight = category?.poids || category?.poidsLabel || category?.weight || category?.weightClass;
  if (explicitWeight) return String(explicitWeight);
  const weights = [...new Set(competitors.map((competitor) => competitor?.poids).filter(Boolean))];
  if (weights.length === 1) return `${weights[0]} kg`;
  return "";
}

function buildPlanningCompetitors(competition, pool, category) {
  const ids = pool.competitorIds || category?.competitorIds || category?.competitors || [];
  return ids
    .map((id) => getCompetitor(competition, id))
    .filter(Boolean)
    .sort((a, b) => String(a.club || "").localeCompare(String(b.club || ""), "fr") || String(a.nom || "").localeCompare(String(b.nom || ""), "fr") || String(a.prenom || "").localeCompare(String(b.prenom || ""), "fr"))
    .map((competitor) => ({
      id: competitor.id,
      club: competitor.club || "Club à préciser",
      nom: competitor.nom || "",
      prenom: competitor.prenom || "",
    }));
}

function buildPlanningCategory(competition, pool, sourceOrder) {
  const category = getCategory(competition, pool);
  const disciplineKey = getPlanningDisciplineKey(pool.epreuve || pool.epreuveLabel || pool.type || category?.epreuve || category?.epreuveLabel);
  const competitors = buildPlanningCompetitors(competition, pool, category);
  return {
    id: pool.id || `${pool.categoryId || "category"}-${sourceOrder}`,
    categoryId: pool.categoryId || category?.id || null,
    disciplineKey,
    disciplineLabel: getPlanningDisciplineLabel(disciplineKey),
    label: getCategoryName(pool, category).replace(/^Poule\s*-?\s*/i, ""),
    category: category?.categorie || category?.trancheAge || pool.ageClass || "Catégorie",
    sex: category?.sexe || pool.sexe || "",
    weight: getWeightLabel(category, competitors),
    competitors,
    scheduleSlots: { start: "", end: "", estimatedDurationMinutes: null },
    ageRank: getAgeRank(pool, category),
    sexRank: getSexRank(pool, category),
    workload: getCategoryWorkload(pool),
    sourceOrder,
  };
}

export function buildOfficialPlanning(competition = {}, options = {}) {
  const sourceCount = options.tatamiCount || competition.nombreTatamis || competition.settings?.nombreTatamis || competition.tatamiCount || 3;
  const tatamiCount = Math.max(1, Number(sourceCount));
  const disciplineOrder = options.disciplineOrder || DEFAULT_DISCIPLINE_ORDER;
  const categories = (competition.pools || competition.brackets || [])
    .map((pool, index) => buildPlanningCategory(competition, pool, index))
    .sort((a, b) => {
      const disciplineRank = disciplineOrder.indexOf(a.disciplineKey) - disciplineOrder.indexOf(b.disciplineKey);
      return disciplineRank || a.ageRank - b.ageRank || a.sexRank - b.sexRank || a.label.localeCompare(b.label, "fr") || a.sourceOrder - b.sourceOrder;
    });

  const activeTatamiCount = Math.min(tatamiCount, Math.max(1, categories.length || tatamiCount));
  const tatamis = Array.from({ length: activeTatamiCount }, (_, index) => ({ number: index + 1, workload: 0, categories: [] }));
  categories.forEach((category, categoryIndex) => {
    const tatami = categoryIndex < tatamis.length ? tatamis[categoryIndex] : [...tatamis].sort((a, b) => a.workload - b.workload || a.categories.length - b.categories.length || a.number - b.number)[0];
    tatami.categories.push(category);
    tatami.workload += category.workload;
  });

  return {
    id: createPlanningId(),
    title: OFFICIAL_PLANNING_DOCUMENT_TITLE,
    type: DOCUMENT_TYPES.OFFICIAL_PLANNING,
    generatedAt: new Date().toISOString(),
    competition: { name: competition.nom || "Compétition", place: competition.lieu || "Lieu à définir", date: competition.date || "Date à définir" },
    disciplineOrder,
    tatamiCount,
    layout: { paper: "A4", orientation: "landscape", maxColumnsPerPage: 3, printReady: true, pdfReady: true, excelReady: true },
    planningEvents: options.planningEvents || DEFAULT_PLANNING_EVENTS,
    futureCapabilities: ["calcul automatique des horaires", "déplacement des catégories entre aires", "temps moyens par discipline", "détection des conflits clubs", "planning public", "planning arbitres"],
    philosophy: "Planning officiel généré automatiquement à partir des tableaux. Les horaires restent réservés au moteur de calcul des prochaines versions.",
    tatamis,
  };
}

function formatCategoryTitle(item) {
  return [item.disciplineLabel, item.category, item.sex, item.weight].filter(Boolean).join(" · ");
}

export function renderOfficialPlanningText(planning) {
  const lines = ["PLANNING OFFICIEL", `${planning.competition.name} — ${planning.competition.place} — ${planning.competition.date}`, "", "DOCUMENTS → PLANNING OFFICIEL", "Format prévu : A4 paysage · PDF · Excel", ""];
  planning.tatamis.forEach((tatami) => {
    lines.push(`AIRE ${tatami.number}`, "---------------------------------");
    tatami.categories.forEach((item) => {
      lines.push(`${item.scheduleSlots.start || "Horaire à définir"}  ${formatCategoryTitle(item)}`);
      lines.push("Club | Nom | Prénom");
      item.competitors.forEach((competitor) => lines.push(`${competitor.club} | ${competitor.nom} | ${competitor.prenom}`));
      lines.push("");
    });
  });
  return lines.join("\n");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function renderOfficialPlanningHtml(planning) {
  const tatamiPages = [];
  for (let index = 0; index < planning.tatamis.length; index += planning.layout.maxColumnsPerPage) {
    tatamiPages.push(planning.tatamis.slice(index, index + planning.layout.maxColumnsPerPage));
  }
  const pages = tatamiPages.map((tatamis) => `<section class="planning-grid" style="grid-template-columns:repeat(${tatamis.length},minmax(0,1fr))">${tatamis.map((tatami) => `<article class="tatami-column"><h2>Aire ${tatami.number}</h2>${tatami.categories.map((item) => `<section class="category-box"><div class="time">${escapeHtml(item.scheduleSlots.start || "Horaire à définir")}</div><h3>${escapeHtml(formatCategoryTitle(item))}</h3><table><thead><tr><th>Club</th><th>Nom</th><th>Prénom</th></tr></thead><tbody>${item.competitors.length ? item.competitors.map((competitor) => `<tr><td>${escapeHtml(competitor.club)}</td><td>${escapeHtml(competitor.nom)}</td><td>${escapeHtml(competitor.prenom)}</td></tr>`).join("") : `<tr><td colspan="3">Aucun compétiteur affecté</td></tr>`}</tbody></table></section>`).join("")}</article>`).join("")}</section>`).join("");
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${escapeHtml(planning.title)}</title><style>@page{size:A4 landscape;margin:10mm}*{box-sizing:border-box}body{margin:0;background:#eef3fb;color:#14213d;font-family:Arial,Helvetica,sans-serif}.official-planning{padding:18px}.sheet{background:white;min-height:190mm;padding:18px;border:1px solid #d8e1ee;box-shadow:0 10px 30px rgba(20,33,61,.12)}header{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;border-bottom:4px solid #1d4f91;padding-bottom:12px;margin-bottom:14px}.kicker{color:#1d4f91;text-transform:uppercase;font-size:11px;font-weight:700;letter-spacing:.12em;margin:0 0 4px}h1{margin:0;font-size:28px}.meta{text-align:right;font-size:12px;color:#4d5f7c}.planning-grid{display:grid;gap:10px}.tatami-column{border:1px solid #b9c9df;border-radius:10px;overflow:hidden;background:#f8fbff}.tatami-column h2{margin:0;background:#1d4f91;color:white;text-align:center;padding:10px;text-transform:uppercase;font-size:17px}.category-box{margin:10px;background:white;border:1px solid #c9d5e6;border-radius:8px;overflow:hidden;break-inside:avoid}.time{background:#e8f0fb;color:#0c366f;font-weight:700;padding:7px 9px;border-bottom:1px solid #c9d5e6}.category-box h3{margin:0;padding:8px 9px;font-size:14px;color:#102a4c}table{width:100%;border-collapse:collapse;font-size:11px}th,td{border-top:1px solid #d9e2ef;padding:5px 6px;text-align:left}th{background:#f0f5fb;color:#1d4f91;text-transform:uppercase;font-size:10px}.events{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:10px 0 14px}.event{border:1px dashed #90a8c7;border-radius:8px;padding:8px;background:#f8fbff;font-size:11px}.event strong{display:block;color:#1d4f91}.footer-note{font-size:10px;color:#5d6e86;margin-top:12px}@media print{body{background:white}.official-planning{padding:0}.sheet{box-shadow:none;border:0;page-break-after:always}}</style></head><body><main class="official-planning"><div class="sheet"><header><div><p class="kicker">Document officiel de compétition</p><h1>${escapeHtml(planning.title)}</h1><p>${escapeHtml(planning.competition.name)} · ${escapeHtml(planning.competition.place)} · ${escapeHtml(planning.competition.date)}</p></div><div class="meta">A4 paysage<br>PDF / Excel prêts<br>Généré le ${new Date(planning.generatedAt).toLocaleString("fr-FR")}</div></header><section class="events">${planning.planningEvents.map((event) => `<div class="event"><strong>${escapeHtml(event.label)}</strong>${escapeHtml(event.time || "À positionner")}</div>`).join("")}</section>${pages}<p class="footer-note">${escapeHtml(planning.philosophy)}</p></div></main></body></html>`;
}

export function createOfficialPlanningDocument(competition, options) {
  const planning = buildOfficialPlanning(competition, options);
  return {
    id: planning.id,
    title: OFFICIAL_PLANNING_DOCUMENT_TITLE,
    type: DOCUMENT_TYPES.OFFICIAL_PLANNING,
    generatedAt: planning.generatedAt,
    competitionId: competition.id || null,
    printable: true,
    exportPdfReady: true,
    exportExcelReady: true,
    folder: "Documents → Planning officiel",
    planning,
    content: renderOfficialPlanningText(planning),
    htmlContent: renderOfficialPlanningHtml(planning),
  };
}

export function upsertOfficialPlanningDocument(competition, options) {
  const document = createOfficialPlanningDocument(competition, options);
  const documents = (competition.documents || []).filter((item) => item.type !== DOCUMENT_TYPES.OFFICIAL_PLANNING && item.title !== OFFICIAL_PLANNING_DOCUMENT_TITLE);
  return { ...competition, documents: [...documents, document], planning: document.planning };
}
