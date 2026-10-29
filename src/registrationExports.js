import { downloadPdfWithDejaVu } from "./pdfExport.js";

export const REGISTRATION_EXPORT_COLUMNS = [
  ["nom", "Nom"],
  ["prenom", "Prénom"],
  ["sexe", "Sexe"],
  ["dateNaissance", "Date de naissance"],
  ["age", "Âge"],
  ["ageGroup", "Catégorie d’âge"],
  ["ceinture", "Grade / ceinture"],
  ["typeInscription", "Type d’inscription"],
  ["discipline", "Disciplines"],
  ["categoriesInscription", "Épreuves / catégories d’inscription"],
  ["fonctionArbitrage", "Fonctions d’arbitrage"],
  ["statutInscription", "Statut"],
  ["club", "Club"],
  ["ville", "Ville"],
  ["responsableClub", "Responsable du club"],
  ["email", "E-mail"],
  ["telephoneResponsable", "Téléphone"],
];

function cellValue(competitor, key) {
  const value = competitor[key] ?? (key === "categoriesInscription" ? competitor.categorieInscription : "");
  return Array.isArray(value) ? value.join(", ") : value;
}

function filename(competition, extension) {
  return `inscriptions-${competition.nom || "competition"}.${extension}`.replace(/[^a-z0-9._-]+/gi, "-");
}

function download(content, type, name) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function exportRegistrationsCsv(competition) {
  const quote = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const rows = [
    REGISTRATION_EXPORT_COLUMNS.map(([, label]) => label),
    ...(competition.competitors || []).map((competitor) => REGISTRATION_EXPORT_COLUMNS.map(([key]) => cellValue(competitor, key))),
  ];
  download(`\ufeff${rows.map((row) => row.map(quote).join(";")).join("\n")}`, "text/csv;charset=utf-8", filename(competition, "csv"));
}

export async function exportRegistrationsPdf(competition) {
  const lines = [
    `Inscriptions - ${competition.nom || "Competition"}`,
    "",
    REGISTRATION_EXPORT_COLUMNS.map(([, label]) => label).join(" | "),
    ...(competition.competitors || []).map((competitor) => REGISTRATION_EXPORT_COLUMNS.map(([key]) => cellValue(competitor, key)).join(" | ")),
  ];
  await downloadPdfWithDejaVu({ lines, filename: filename(competition, "pdf"), landscape: true });
}
