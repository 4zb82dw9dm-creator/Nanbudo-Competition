export const REGISTRATION_EXPORT_COLUMNS = [
  ["nom", "Nom"],
  ["prenom", "Prénom"],
  ["club", "Club"],
  ["ville", "Ville"],
  ["responsableClub", "Responsable du club"],
  ["email", "E-mail"],
  ["telephoneResponsable", "Téléphone"],
];

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
    ...(competition.competitors || []).map((competitor) => REGISTRATION_EXPORT_COLUMNS.map(([key]) => competitor[key] || "")),
  ];
  download(`\ufeff${rows.map((row) => row.map(quote).join(";")).join("\n")}`, "text/csv;charset=utf-8", filename(competition, "csv"));
}

function escapePdfText(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7e]/g, "").replace(/([\\()])/g, "\\$1");
}

export function exportRegistrationsPdf(competition) {
  const lines = [
    `Inscriptions - ${competition.nom || "Competition"}`,
    "",
    REGISTRATION_EXPORT_COLUMNS.map(([, label]) => label).join(" | "),
    ...(competition.competitors || []).map((competitor) => REGISTRATION_EXPORT_COLUMNS.map(([key]) => competitor[key] || "").join(" | ")),
  ];
  const content = ["BT", "/F1 8 Tf", "28 560 Td", "11 TL", ...lines.flatMap((line) => [`(${escapePdfText(line).slice(0, 150)}) Tj`, "T*"]), "ET"].join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => { offsets.push(pdf.length); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => { pdf += `${String(offset).padStart(10, "0")} 00000 n \n`; });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  download(pdf, "application/pdf", filename(competition, "pdf"));
}
