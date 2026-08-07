import { hasRefereeRole } from "./CompetitionDashboard";

const ROLES = ["Shushin", "Fukushin", "Arbitre de table"];
function functionsOf(referee) { return Array.isArray(referee.fonctionArbitrage) ? referee.fonctionArbitrage : String(referee.roleArbitre || "").split(",").map((value) => value.trim()); }
export default function RefereeAssignments({ competition, onUpdateCompetition, readOnly = false }) {
  const referees = (competition.competitors || []).filter((item) => hasRefereeRole(item.typeInscription));
  const assignments = competition.refereeAssignments || {};
  function assign(tatami, role, refereeId) { const next = { ...assignments, [tatami]: { ...(assignments[tatami] || {}), [role]: refereeId || null } }; onUpdateCompetition({ ...competition, refereeAssignments: next }); }
  const assignedElsewhere = (id, tatami) => Object.entries(assignments).some(([number, roles]) => number !== String(tatami) && Object.values(roles).map(String).includes(String(id)));
  return <section className="feature-page"><div className="manager-header"><div><p className="surtitle">AFFECTATION PERMANENTE</p><h2>Affectation des arbitres</h2><p>Les affectations enregistrées restent valables pendant toute la compétition. Aucun roulement automatique.</p></div></div><div className="assignment-grid">{[1,2,3].map((tatami) => <article className="feature-card" key={tatami}><h3>Tatami {tatami}</h3>{ROLES.map((role) => { const current = assignments[tatami]?.[role] || ""; return <label key={role}>{role === "Shushin" ? "Sushin (Shushin)" : role}<select disabled={readOnly} value={current} onChange={(event) => assign(tatami, role, event.target.value)}><option value="">Non affecté</option>{referees.filter((referee) => functionsOf(referee).includes(role) || (role === "Shushin" && functionsOf(referee).includes("Sushin"))).map((referee) => <option key={referee.id} value={referee.id} disabled={!current && assignedElsewhere(referee.id, tatami)}>{referee.nom} {referee.prenom}{assignedElsewhere(referee.id, tatami) ? " · autre tatami" : ""}</option>)}</select></label>; })}</article>)}</div></section>;
}
