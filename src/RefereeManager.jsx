import { PLANNING_TATAMIS } from "./planningLogic";

const REFEREE_SLOTS = ["Shushin", "Fukushin 1", "Fukushin 2", "Fukushin 3", "Fukushin 4", "Arbitre de table 1", "Arbitre de table 2", "Arbitre de table 3"];

function refereeLabel(referee) {
  return `${referee.nom || ""} ${referee.prenom || ""}`.trim();
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function RefereeManager({ competition, referees, onUpdateCompetition }) {
  const assignments = competition.refereeAssignments || {};
  const refereeById = new Map(referees.map((referee) => [String(referee.id), referee]));
  const assignedIds = new Set(Object.values(assignments).flatMap((tatami) => Object.values(tatami || {}).map((slot) => String(slot?.refereeId || "")).filter(Boolean)));

  function updateSlot(tatami, slot, patch) {
    const currentTatami = assignments[tatami] || {};
    const currentSlot = currentTatami[slot] || {};
    onUpdateCompetition({
      ...competition,
      refereeAssignments: {
        ...assignments,
        [tatami]: {
          ...currentTatami,
          [slot]: { ...currentSlot, ...patch },
        },
      },
    });
  }

  function clearSlot(tatami, slot) {
    updateSlot(tatami, slot, { refereeId: "", manualName: "" });
  }

  function tableRefereeCount(tatami) {
    return ["Arbitre de table 1", "Arbitre de table 2", "Arbitre de table 3"].filter((slot) => {
      const assignment = assignments[tatami]?.[slot] || {};
      return assignment.refereeId || assignment.manualName;
    }).length;
  }

  function assignedRefereeName(tatami, slot) {
    const assignment = assignments[tatami]?.[slot] || {};
    if (assignment.manualName) return assignment.manualName;
    const referee = refereeById.get(String(assignment.refereeId || ""));
    return referee ? refereeLabel(referee) : "Non affecté";
  }

  function printAssignments() {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Impossible d’ouvrir la fenêtre d’impression. Autorisez les fenêtres surgissantes puis réessayez.");
      return;
    }

    const tatamiCards = PLANNING_TATAMIS.map((tatami) => {
      const rows = REFEREE_SLOTS.map((slot) => `<tr><td>${escapeHtml(slot)}</td><td>${escapeHtml(assignedRefereeName(tatami, slot))}</td></tr>`).join("");
      return `<section class="tatami"><h2>TATAMI ${escapeHtml(tatami)}</h2><table><tbody>${rows}</tbody></table></section>`;
    }).join("");

    printWindow.document.write(`<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Affectation des arbitres</title>
<style>
  @page { size: A4 landscape; margin: 10mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #172033; background: white; }
  header { text-align: center; margin-bottom: 10mm; }
  .eyebrow { margin: 0 0 4px; font-size: 11px; font-weight: 800; letter-spacing: 1.4px; text-transform: uppercase; color: #5f6b7a; }
  h1 { margin: 0; font-size: 24px; }
  .meta { margin: 5px 0 0; font-size: 12px; color: #4b5563; }
  .grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8mm; align-items: start; }
  .tatami { border: 2px solid #172033; border-radius: 10px; overflow: hidden; break-inside: avoid; }
  .tatami h2 { margin: 0; padding: 10px 12px; background: #172033; color: white; font-size: 19px; text-align: center; letter-spacing: .5px; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  td { padding: 8px 9px; border-top: 1px solid #d7dde5; vertical-align: middle; font-size: 12px; }
  td:first-child { width: 46%; font-weight: 800; background: #f5f7fa; }
  td:last-child { font-weight: 700; }
  footer { margin-top: 7mm; text-align: center; font-size: 10px; color: #6b7280; }
  @media screen { body { padding: 18px; } }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
<header>
  <p class="eyebrow">AFDP Nanbudo · Commission Compétition</p>
  <h1>Affectation des arbitres</h1>
  <p class="meta"><strong>${escapeHtml(competition.nom || "Compétition")}</strong>${competition.date ? ` · ${escapeHtml(competition.date)}` : ""}${competition.lieu ? ` · ${escapeHtml(competition.lieu)}` : ""}</p>
</header>
<main class="grid">${tatamiCards}</main>
<footer>Affectations fixes pour la durée de la compétition · Toute modification doit être reportée sur la feuille affichée.</footer>
<script>window.addEventListener('load', function () { setTimeout(function () { window.focus(); window.print(); }, 250); });</script>
</body>
</html>`);
    printWindow.document.close();
  }

  return <div className="competitors-module">
    <div className="manager-header"><div><p className="surtitle">AFFECTATION FIXE</p><h2>Arbitres par tatami</h2><p>Chaque arbitre reste affecté à son tatami pour toute la compétition. Un remplacement manuel reste possible à tout moment. Pour la table : 2 arbitres minimum, 3 idéalement.</p></div><div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", justifyContent: "flex-end" }}><button className="primary" type="button" onClick={printAssignments}>Imprimer les affectations</button><div className="category-total"><strong>{referees.length}</strong><span>arbitres disponibles</span></div></div></div>
    <div className="tatami-groups">
      {PLANNING_TATAMIS.map((tatami) => { const tableCount = tableRefereeCount(tatami); return <section className="tatami-group" key={tatami}>
        <div className="tatami-group-header"><div><p className="surtitle">TATAMI {tatami}</p><h3>Équipe d’arbitrage</h3><p><strong>Table :</strong> {tableCount}/3 · {tableCount < 2 ? "⚠️ minimum non atteint" : tableCount === 2 ? "minimum atteint" : "équipe idéale"}</p></div></div>
        <div className="competition-list">
          {REFEREE_SLOTS.map((slot) => {
            const assignment = assignments[tatami]?.[slot] || {};
            const selectedId = String(assignment.refereeId || "");
            const selected = selectedId ? refereeById.get(selectedId) : null;
            return <article className="competition" key={slot}>
              <div style={{ width: "100%" }}>
                <p className="surtitle">{slot}</p>
                <div style={{ display: "grid", gridTemplateColumns: "minmax(220px, 1fr) minmax(220px, 1fr) auto", gap: "10px", alignItems: "end" }}>
                  <label>Arbitre inscrit
                    <select value={selectedId} onChange={(event) => updateSlot(tatami, slot, { refereeId: event.target.value, manualName: "" })}>
                      <option value="">— Non affecté —</option>
                      {referees.map((referee) => {
                        const id = String(referee.id);
                        const unavailable = assignedIds.has(id) && id !== selectedId;
                        return <option key={id} value={id} disabled={unavailable}>{refereeLabel(referee)}{referee.club ? ` · ${referee.club}` : ""}{unavailable ? " · déjà affecté" : ""}</option>;
                      })}
                    </select>
                  </label>
                  <label>Remplacement manuel
                    <input type="text" placeholder="Nom Prénom" value={assignment.manualName || ""} onChange={(event) => updateSlot(tatami, slot, { manualName: event.target.value, refereeId: event.target.value ? "" : selectedId })} />
                  </label>
                  <button className="manage-button" type="button" onClick={() => clearSlot(tatami, slot)}>Effacer</button>
                </div>
                <p style={{ marginTop: "8px" }}><strong>En poste :</strong> {assignment.manualName || (selected ? refereeLabel(selected) : "Non affecté")}</p>
              </div>
            </article>;
          })}
        </div>
      </section>; })}
    </div>
    <div className="registrations-table" style={{ marginTop: "24px" }}><table><thead><tr>{["Nom", "Prénom", "Club", "Grade", "Fonctions d’arbitrage", "Affectation"].map((label) => <th key={label}>{label}</th>)}</tr></thead><tbody>{referees.map((referee) => {
      const id = String(referee.id);
      let position = "Non affecté";
      PLANNING_TATAMIS.forEach((tatami) => REFEREE_SLOTS.forEach((slot) => { if (String(assignments[tatami]?.[slot]?.refereeId || "") === id) position = `Tatami ${tatami} · ${slot}`; }));
      return <tr key={referee.id}><td>{referee.nom}</td><td>{referee.prenom}</td><td>{referee.club}</td><td>{referee.grade || referee.ceinture}</td><td>{(Array.isArray(referee.fonctionArbitrage) ? referee.fonctionArbitrage : String(referee.roleArbitre || "").split(",")).filter(Boolean).join(", ")}</td><td><strong>{position}</strong></td></tr>;
    })}</tbody></table></div>
  </div>;
}

export default RefereeManager;
