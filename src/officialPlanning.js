import { DOCUMENT_TYPES } from "./documentLibrary.js";

const DEFAULT_DISCIPLINE_ORDER = ["kata", "randori", "juRandori"];
const DISCIPLINE_LABELS = { kata: "KATA", randori: "RANDORI", juRandori: "JU RANDORI" };
const AGE_CATEGORY_ORDER = ["poussin", "pupille", "benjamin", "minime", "cadet", "junior", "senior", "veteran"];
const DEFAULT_DAY_MARKERS = [
  { id: "opening", label: "CÉRÉMONIE D'OUVERTURE", time: "09h00", placement: "top" },
  { id: "referees", label: "PAUSE ARBITRES", time: "", placement: "middle" },
  { id: "lunch", label: "PAUSE DÉJEUNER", time: "12h30", placement: "middle" },
  { id: "medals", label: "REMISE DES MÉDAILLES - CÉRÉMONIE", time: "", placement: "bottom" },
];

export const OFFICIAL_PLANNING_DOCUMENT_TITLE = "Planning officiel de la compétition";

function createPlanningId(prefix = "planning") {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function normalizePlanningText(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
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
function getCategoryName(pool, category) { return category?.nom || pool.nom || "Catégorie"; }
function getAgeRank(pool, category) {
  const text = normalizePlanningText([category?.ageClass, category?.categorie, category?.nom, pool.ageClass, pool.nom].filter(Boolean).join(" "));
  const rank = AGE_CATEGORY_ORDER.findIndex((label) => text.includes(label));
  return rank === -1 ? AGE_CATEGORY_ORDER.length : rank;
}
function getSexRank(pool, category) {
  const text = normalizePlanningText(category?.sexe || pool.sexe || getCategoryName(pool, category));
  if (text.includes("femme") || text.includes("fille") || text.includes("feminin")) return 0;
  if (text.includes("homme") || text.includes("garcon") || text.includes("masculin")) return 1;
  return 2;
}
function getCategoryWorkload(pool) {
  const matchCount = (pool.rounds || []).reduce((total, round) => total + (round.matches || []).length, 0) + (pool.matches || []).length;
  return Math.max(1, matchCount, (pool.passages || []).length, (pool.competitorIds || []).length);
}
function formatPlanningTime(minutes) {
  if (!Number.isFinite(minutes)) return "";
  const normalized = ((Math.round(minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(normalized / 60)).padStart(2, "0")}h${String(normalized % 60).padStart(2, "0")}`;
}
function parsePlanningTime(value, fallback = 570) {
  const [hours, minutes] = String(value || "").replace("h", ":").split(":").map(Number);
  return Number.isFinite(hours) && Number.isFinite(minutes) ? hours * 60 + minutes : fallback;
}
function escapeHtml(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#039;");
}
function buildPlanningCategory(competition, pool, sourceOrder) {
  const category = getCategory(competition, pool);
  const disciplineKey = getPlanningDisciplineKey(pool.epreuve || pool.epreuveLabel || pool.type);
  return { id: pool.id || `${pool.categoryId || "category"}-${sourceOrder}`, categoryId: pool.categoryId || category?.id || null, disciplineKey, disciplineLabel: getPlanningDisciplineLabel(disciplineKey), label: getCategoryName(pool, category).replace(/^Poule\s*-?\s*/i, ""), ageRank: getAgeRank(pool, category), sexRank: getSexRank(pool, category), workload: getCategoryWorkload(pool), competitorIds: pool.competitorIds || category?.competitorIds || [], sourceOrder };
}

export function buildOfficialPlanning(competition = {}, options = {}) {
  const tatamiCount = Math.max(1, Number(options.tatamiCount || competition.nombreTatamis || competition.settings?.nombreTatamis || 3));
  const startAt = parsePlanningTime(options.startTime || competition.settings?.startTime || "09:30");
  const slotMinutes = Math.max(5, Number(options.slotMinutes || 30));
  const categories = (competition.pools || competition.brackets || []).map((pool, index) => buildPlanningCategory(competition, pool, index)).sort((a, b) => {
    const disciplineRank = DEFAULT_DISCIPLINE_ORDER.indexOf(a.disciplineKey) - DEFAULT_DISCIPLINE_ORDER.indexOf(b.disciplineKey);
    return disciplineRank || a.ageRank - b.ageRank || a.sexRank - b.sexRank || a.label.localeCompare(b.label, "fr") || a.sourceOrder - b.sourceOrder;
  });
  const tatamis = Array.from({ length: tatamiCount }, (_, index) => ({ number: index + 1, workload: 0, nextStart: startAt, items: [] }));
  categories.forEach((category) => {
    tatamis.sort((a, b) => a.workload - b.workload || a.nextStart - b.nextStart || a.number - b.number);
    const tatami = tatamis[0];
    tatami.items.push({ ...category, time: formatPlanningTime(tatami.nextStart), estimatedStart: tatami.nextStart });
    tatami.workload += category.workload;
    tatami.nextStart += Math.ceil(category.workload / 4) * slotMinutes;
  });
  tatamis.sort((a, b) => a.number - b.number);
  return { id: createPlanningId(), title: OFFICIAL_PLANNING_DOCUMENT_TITLE, type: DOCUMENT_TYPES.OFFICIAL_PLANNING, generatedAt: new Date().toISOString(), tatamiCount, dayMarkers: DEFAULT_DAY_MARKERS, tatamis };
}

function getCompetitorsHtml(item, competition) {
  const competitors = (item.competitorIds || []).map((id) => (competition.competitors || competition.participants || []).find((c) => String(c.id) === String(id))).filter(Boolean);
  if (!competitors.length) return '<tr><td colspan="3">À compléter</td></tr>';
  return competitors.map((c) => `<tr><td>${escapeHtml(c.club || "—")}</td><td>${escapeHtml(c.nom || "—")}</td><td>${escapeHtml(c.prenom || "—")}</td></tr>`).join("");
}
function renderCategoryCard(item, competition) {
  return `<section class="official-category"><div class="official-category-time">${escapeHtml(item.time || "")}</div><div class="official-category-table"><h3>${escapeHtml(item.label)}</h3><table><thead><tr><th>CLUB</th><th>NOM</th><th>Prénom</th></tr></thead><tbody>${getCompetitorsHtml(item, competition)}</tbody></table></div></section>`;
}
export function renderOfficialPlanningHtml(planning, competition = {}) {
  const top = planning.dayMarkers?.filter((m) => m.placement === "top") || [];
  const middle = planning.dayMarkers?.filter((m) => m.placement === "middle") || [];
  const bottom = planning.dayMarkers?.filter((m) => m.placement === "bottom") || [];
  const columns = planning.tatamis.map((tatami) => `<article class="official-area"><h2>AIRE ${tatami.number}</h2>${tatami.items.map((item) => renderCategoryCard(item, competition)).join("")}</article>`).join("");
  const banner = (marker) => `<div class="official-banner"><span>${escapeHtml(marker.time)}</span><strong>${escapeHtml(marker.label)}</strong></div>`;
  return `<div class="official-planning-document"><header><h1>${escapeHtml(competition.nom || planning.title)}</h1><p>${escapeHtml(competition.lieu || "Lieu à définir")} · ${escapeHtml(competition.date || "Date à définir")}</p></header>${top.map(banner).join("")}<main class="official-grid" style="--area-count:${planning.tatamiCount}">${columns}</main>${middle.map(banner).join("")}${bottom.map(banner).join("")}</div>`;
}
export function renderOfficialPlanningText(planning) { return `Planning officiel en grille - ${planning.tatamiCount} aire(s)`; }
export function getOfficialPlanningStyles() {
  return `@page{size:A4 landscape;margin:10mm}.official-planning-document{font-family:Arial,sans-serif;color:#111;background:#fff}.official-planning-document header{text-align:center;margin-bottom:10px}.official-planning-document h1{margin:0;font-size:20px;text-transform:uppercase}.official-planning-document p{margin:4px 0 0}.official-grid{display:grid;grid-template-columns:repeat(var(--area-count),minmax(0,1fr));gap:12px;align-items:start}.official-area h2{border:2px solid #777;margin:0 0 5px;text-align:center;font-size:20px;line-height:1.1}.official-category{display:grid;grid-template-columns:42px minmax(0,1fr);gap:5px;margin-bottom:7px;break-inside:avoid}.official-category-time{font-weight:900;text-align:right;padding-top:18px;font-size:12px}.official-category-table h3{margin:0;text-align:center;font-size:11px;line-height:1.2}table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{border:1px solid #555;padding:2px 4px;text-align:center;font-size:10px;line-height:1.15;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}th{background:#2f75b5;color:white;font-weight:900}.official-banner{display:grid;grid-template-columns:90px 1fr;border:2px solid #777;margin:10px 0;padding:5px;text-align:center;font-size:15px;font-weight:900;text-transform:uppercase}.official-banner span{text-align:left}@media print{button{display:none}}`;
}
export function renderOfficialPlanningFullHtml(document, competition = {}) {
  return `<!doctype html><html><head><title>${escapeHtml(document.title)}</title><style>${getOfficialPlanningStyles()}</style></head><body>${document.htmlContent || renderOfficialPlanningHtml(document.planning, competition)}</body></html>`;
}
export function createOfficialPlanningDocument(competition, options) {
  const planning = buildOfficialPlanning(competition, options);
  return { id: planning.id, title: OFFICIAL_PLANNING_DOCUMENT_TITLE, type: DOCUMENT_TYPES.OFFICIAL_PLANNING, generatedAt: planning.generatedAt, competitionId: competition.id || null, printable: true, exportPdfReady: true, planning, htmlContent: renderOfficialPlanningHtml(planning, competition), content: renderOfficialPlanningText(planning) };
}
export function upsertOfficialPlanningDocument(competition, options) {
  const document = createOfficialPlanningDocument(competition, options);
  const documents = (competition.documents || []).filter((item) => item.type !== DOCUMENT_TYPES.OFFICIAL_PLANNING && item.title !== OFFICIAL_PLANNING_DOCUMENT_TITLE);
  return { ...competition, documents: [...documents, document], planning: document.planning };
}
