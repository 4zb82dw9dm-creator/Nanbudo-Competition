import { PLANNING_TATAMIS } from "./planningLogic";

const REFEREE_SLOTS = ["Shushin", "Fukushin 1", "Fukushin 2", "Fukushin 3", "Fukushin 4", "Arbitre de table 1", "Arbitre de table 2", "Arbitre de table 3"];

function refereeLabel(referee) {
  return `${referee.nom || ""} ${referee.prenom || ""}`.trim();
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

  return <div className="competitors-module">
    <div className="manager-header"><div><p className="surtitle">AFFECTATION FIXE</p><h2>Arbitres par tatami</h2><p>Chaque arbitre reste affecté à son tatami pour toute la compétition. Un remplacement manuel reste possible à tout moment. Pour la table : 2 arbitres minimum, 3 idéalement.</p></div><div className="category-total"><strong>{referees.length}</strong><span>arbitres disponibles</span></div></div>
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
