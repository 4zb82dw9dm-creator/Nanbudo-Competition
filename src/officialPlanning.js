const DEFAULT_DISCIPLINE_ORDER = ["kata", "randori", "juRandori"];
const DISCIPLINE_LABELS = {
  kata: "KATA",
  randori: "RANDORI",
  juRandori: "JU RANDORI",
};
const AGE_CATEGORY_ORDER = ["poussin", "pupille", "benjamin", "minime", "cadet", "junior", "senior", "veteran"];
const SEX_ORDER = ["Femme", "Homme"];

export const OFFICIAL_PLANNING_DOCUMENT_TITLE = "Planning officiel de la compétition";

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
  return DISCIPLINE_LABELS[key] || String(key || "ÉPREUVE").toUpperCase();
}

function getCategory(competition, pool) {
  return (competition.categories || []).find((category) => String(category.id) === String(pool.categoryId));
}

function getCategoryName(pool, category) {
  return category?.nom || pool.nom || "Catégorie";
}

function getAgeRank(pool, category) {
  const candidates = [category?.ageClass, category?.categorie, category?.nom, pool.ageClass, pool.nom];
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

function buildPlanningCategory(competition, pool, sourceOrder) {
  const category = getCategory(competition, pool);
  const disciplineKey = getPlanningDisciplineKey(pool.epreuve || pool.epreuveLabel || pool.type);
  return {
    id: pool.id || `${pool.categoryId || "category"}-${sourceOrder}`,
    categoryId: pool.categoryId || category?.id || null,
    disciplineKey,
    disciplineLabel: getPlanningDisciplineLabel(disciplineKey),
    label: getCategoryName(pool, category).replace(/^Poule\s*-?\s*/i, ""),
    ageRank: getAgeRank(pool, category),
    sexRank: getSexRank(pool, category),
    workload: getCategoryWorkload(pool),
    sourceOrder,
  };
}

export function buildOfficialPlanning(competition = {}, options = {}) {
  const tatamiCount = Math.max(1, Number(options.tatamiCount || competition.nombreTatamis || competition.settings?.nombreTatamis || 1));
  const disciplineOrder = options.disciplineOrder || DEFAULT_DISCIPLINE_ORDER;
  const categories = (competition.pools || competition.brackets || [])
    .map((pool, index) => buildPlanningCategory(competition, pool, index))
    .sort((a, b) => {
      const disciplineRank = disciplineOrder.indexOf(a.disciplineKey) - disciplineOrder.indexOf(b.disciplineKey);
      return disciplineRank || a.ageRank - b.ageRank || a.sexRank - b.sexRank || a.label.localeCompare(b.label, "fr") || a.sourceOrder - b.sourceOrder;
    });

  const tatamis = Array.from({ length: tatamiCount }, (_, index) => ({ number: index + 1, workload: 0, disciplines: {} }));
  categories.forEach((category) => {
    tatamis.sort((a, b) => a.workload - b.workload || a.number - b.number);
    const tatami = tatamis[0];
    if (!tatami.disciplines[category.disciplineKey]) tatami.disciplines[category.disciplineKey] = [];
    tatami.disciplines[category.disciplineKey].push(category);
    tatami.workload += category.workload;
  });
  tatamis.sort((a, b) => a.number - b.number);

  return {
    id: createPlanningId(),
    title: OFFICIAL_PLANNING_DOCUMENT_TITLE,
    type: "official-planning",
    generatedAt: new Date().toISOString(),
    disciplineOrder,
    tatamiCount,
    philosophy: "Ce planning est une proposition d'organisation. Il ne pilote pas automatiquement les combats et peut être adapté librement par les arbitres et le directeur de compétition.",
    tatamis,
  };
}

export function renderOfficialPlanningText(planning) {
  const lines = ["PLANNING OFFICIEL", "", "================================="];
  planning.tatamis.forEach((tatami, tatamiIndex) => {
    if (tatamiIndex > 0) lines.push("=================================");
    lines.push(`AIRE ${tatami.number}`, "");
    planning.disciplineOrder.forEach((disciplineKey) => {
      const items = tatami.disciplines[disciplineKey] || [];
      if (!items.length) return;
      lines.push(getPlanningDisciplineLabel(disciplineKey), "");
      items.forEach((item) => lines.push(`• ${item.label}`));
      lines.push("");
    });
  });
  lines.push("Note : proposition d'organisation modifiable par les responsables de compétition.");
  return lines.join("\n");
}

export function createOfficialPlanningDocument(competition, options) {
  const planning = buildOfficialPlanning(competition, options);
  return {
    id: planning.id,
    title: OFFICIAL_PLANNING_DOCUMENT_TITLE,
    type: "official-planning",
    generatedAt: planning.generatedAt,
    printable: true,
    exportPdfReady: false,
    planning,
    content: renderOfficialPlanningText(planning),
  };
}

export function upsertOfficialPlanningDocument(competition, options) {
  const document = createOfficialPlanningDocument(competition, options);
  const documents = (competition.documents || []).filter((item) => item.type !== "official-planning" && item.title !== OFFICIAL_PLANNING_DOCUMENT_TITLE);
  return { ...competition, documents: [...documents, document], planning: document.planning };
}
