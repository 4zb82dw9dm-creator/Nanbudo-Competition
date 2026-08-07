import { useMemo, useState } from "react";
import { createSimplePdf, downloadBlob, escapeHtml, printHtmlDocument } from "./exportUtils";

const TATAMI_ALL = "all";
const TATAMI_FUNCTIONS = ["Responsable de tatami", "Arbitre central", "Fukushin", "Arbitre de table", "Chronométreur", "Secrétaire", "Autre"];
const PRESENCE_OPTIONS = ["Oui", "Non"];

function arrayValues(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  return value ? String(value).split(",").map((item) => item.trim()).filter(Boolean) : [];
}

function isReferee(competitor) {
  return arrayValues(competitor.fonctionArbitrage || competitor.roleArbitre).length > 0;
}

function refereeDisciplines(competitor) {
  return arrayValues(competitor.categoriesInscription || competitor.categorieInscription);
}

function refereeFunctions(competitor) {
  return arrayValues(competitor.fonctionArbitrage || competitor.roleArbitre);
}

function buildRefereeRows(competition) {
  return (competition.competitors || []).filter(isReferee);
}

function formatPhone(referee) {
  return referee.telephone || referee.telephoneResponsable || "—";
}

function refereeFullName(referee) {
  return `${referee.nom || ""} ${referee.prenom || ""}`.trim();
}

function groupByTatami(referees) {
  return referees.reduce((groups, referee) => {
    const tatami = referee.tatamiAffecte || "Non affecté";
    if (!groups[tatami]) groups[tatami] = [];
    groups[tatami].push(referee);
    return groups;
  }, {});
}

function RefereesManager({ competition, onUpdateCompetition }) {
  const [sortKey, setSortKey] = useState("tatamiAffecte");
  const tatamiOptions = Array.from({ length: Number(competition.tatamis) || 1 }, (_, index) => String(index + 1));
  const referees = useMemo(() => {
    const rows = buildRefereeRows(competition);
    return [...rows].sort((a, b) => {
      const value = (referee) => {
        if (sortKey === "discipline") return refereeDisciplines(referee).join(", ");
        if (sortKey === "fonctionTatami") return referee.fonctionTatami || "";
        if (sortKey === "tatamiAffecte") return referee.tatamiAffecte || "";
        return referee[sortKey] || "";
      };
      return String(value(a)).localeCompare(String(value(b)), "fr", { numeric: true }) || refereeFullName(a).localeCompare(refereeFullName(b), "fr");
    });
  }, [competition, sortKey]);

  function updateReferee(id, field, value) {
    onUpdateCompetition({
      ...competition,
      competitors: (competition.competitors || []).map((competitor) => competitor.id === id ? { ...competitor, [field]: value } : competitor),
    });
  }

  function exportExcel() {
    const header = ["Tatami affecté", "Fonction sur le tatami", "Présence", "Nom", "Prénom", "Club", "Sexe", "Date de naissance", "Grade", "Disciplines", "Fonctions d’arbitrage", "E-mail", "Téléphone"];
    const rows = referees.map((referee) => [referee.tatamiAffecte || "Non affecté", referee.fonctionTatami || "", referee.presenceArbitre || "Non", referee.nom, referee.prenom, referee.club, referee.sexe, referee.dateNaissance, referee.grade || referee.ceinture, refereeDisciplines(referee).join(", "), refereeFunctions(referee).join(", "), referee.email, formatPhone(referee)]);
    const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(";")).join("\n");
    downloadBlob(`\ufeff${csv}`, `arbitres-${competition.nom || "competition"}.xls`, "application/vnd.ms-excel;charset=utf-8");
  }

  function documentHtml({ autoPrint = false } = {}) {
    const logo = `${window.location.origin}${import.meta.env.BASE_URL}assets/logo-afdp.png`;
    const groups = groupByTatami(referees);
    return `<!doctype html><html><head><meta charset="utf-8"><title>Arbitres - ${escapeHtml(competition.nom)}</title><style>body{font-family:Arial,sans-serif;color:#182033;margin:32px}.doc-header{display:flex;align-items:center;gap:18px;border-bottom:4px solid #d71920;padding-bottom:16px}img{height:72px}.surtitle{color:#d71920;font-weight:700;letter-spacing:.12em;text-transform:uppercase}section{break-inside:avoid;margin-top:26px}h2{background:#182033;color:#fff;padding:10px 14px;border-radius:10px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #d9dee8;padding:7px;text-align:left;vertical-align:top}th{background:#f1f3f8}.badge{font-weight:700;color:#d71920}@media print{button{display:none}}</style></head><body><header class="doc-header"><img src="${logo}" alt="AFDP"><div><p class="surtitle">Liste des arbitres</p><h1>${escapeHtml(competition.nom)}</h1><p>${escapeHtml(competition.date || "Date à définir")} · ${escapeHtml(competition.lieu || "Lieu à définir")}</p></div></header>${Object.entries(groups).map(([tatami, rows]) => `<section><h2>Tatami ${escapeHtml(tatami)}</h2><table><thead><tr><th>Présence</th><th>Fonction tatami</th><th>Nom</th><th>Club</th><th>Sexe</th><th>Naissance</th><th>Grade</th><th>Disciplines</th><th>Fonctions inscription</th><th>Contact</th></tr></thead><tbody>${rows.map((referee) => `<tr><td class="badge">${escapeHtml(referee.presenceArbitre || "Non")}</td><td>${escapeHtml(referee.fonctionTatami || "")}</td><td>${escapeHtml(refereeFullName(referee))}</td><td>${escapeHtml(referee.club)}</td><td>${escapeHtml(referee.sexe)}</td><td>${escapeHtml(referee.dateNaissance)}</td><td>${escapeHtml(referee.grade || referee.ceinture)}</td><td>${escapeHtml(refereeDisciplines(referee).join(", "))}</td><td>${escapeHtml(refereeFunctions(referee).join(", "))}</td><td>${escapeHtml(referee.email)}<br>${escapeHtml(formatPhone(referee))}</td></tr>`).join("")}</tbody></table></section>`).join("")}<script>${autoPrint ? "window.addEventListener('load',()=>window.print())" : ""}</script></body></html>`;
  }

  function exportPdf() {
    const groups = groupByTatami(referees);
    const pages = Object.entries(groups).map(([tatami, rows]) => ({
      title: `${competition.nom} - Tatami ${tatami}`,
      lines: rows.flatMap((referee) => [`${refereeFullName(referee)} - ${referee.club} - ${referee.fonctionTatami || "A affecter"} - Presence ${referee.presenceArbitre || "Non"}`, `Disciplines: ${refereeDisciplines(referee).join(", ") || "-"} | Fonctions: ${refereeFunctions(referee).join(", ")}`]),
    }));
    downloadBlob(createSimplePdf(pages.length ? pages : [{ title: `${competition.nom} - Arbitres`, lines: ["Aucun arbitre inscrit"] }]), `arbitres-${competition.nom || "competition"}.pdf`, "application/pdf");
  }
  function printReferees() { printHtmlDocument(documentHtml({ autoPrint: true })); }

  return <div className="referees-manager"><div className="manager-header"><div><p className="surtitle">ARBITRES</p><h2>Arbitres</h2><p>{referees.length} personne{referees.length > 1 ? "s" : ""} avec au moins une fonction d’arbitrage. Cette liste prépare l’alimentation de l’arbitrage par tatami.</p></div><div className="export-actions"><button className="manage-button" type="button" onClick={exportExcel}>Export Excel</button><button className="manage-button" type="button" onClick={exportPdf}>Export PDF</button><button className="primary" type="button" onClick={printReferees}>Impression</button></div></div><div className="filters"><select value={sortKey} onChange={(event) => setSortKey(event.target.value)}><option value="tatamiAffecte">Tri par tatami</option><option value="fonctionTatami">Tri par fonction</option><option value="discipline">Tri par discipline</option><option value="club">Tri par club</option></select></div>{referees.length === 0 ? <div className="empty-state"><h3>Aucun arbitre inscrit</h3><p>La liste sera générée automatiquement dès qu’une inscription contiendra une fonction d’arbitrage.</p></div> : <div className="registrations-table"><table><thead><tr><th>Tatami affecté</th><th>Fonction sur le tatami</th><th>Présence</th><th>Nom</th><th>Prénom</th><th>Club</th><th>Sexe</th><th>Date de naissance</th><th>Grade</th><th>Disciplines</th><th>Fonctions d’arbitrage</th><th>E-mail</th><th>Téléphone</th></tr></thead><tbody>{referees.map((referee) => <tr key={referee.id}><td><select value={referee.tatamiAffecte || ""} onChange={(event) => updateReferee(referee.id, "tatamiAffecte", event.target.value)}><option value="">Non affecté</option>{tatamiOptions.map((tatami) => <option key={tatami} value={tatami}>Tatami {tatami}</option>)}</select></td><td><select value={referee.fonctionTatami || ""} onChange={(event) => updateReferee(referee.id, "fonctionTatami", event.target.value)}><option value="">À affecter</option>{TATAMI_FUNCTIONS.map((role) => <option key={role}>{role}</option>)}</select></td><td><select value={referee.presenceArbitre || "Non"} onChange={(event) => updateReferee(referee.id, "presenceArbitre", event.target.value)}>{PRESENCE_OPTIONS.map((presence) => <option key={presence}>{presence}</option>)}</select></td><td>{referee.nom}</td><td>{referee.prenom}</td><td>{referee.club}</td><td>{referee.sexe}</td><td>{referee.dateNaissance}</td><td>{referee.grade || referee.ceinture}</td><td>{refereeDisciplines(referee).join(", ") || "—"}</td><td>{refereeFunctions(referee).join(", ")}</td><td>{referee.email}</td><td>{formatPhone(referee)}</td></tr>)}</tbody></table></div>}</div>;
}

export default RefereesManager;
