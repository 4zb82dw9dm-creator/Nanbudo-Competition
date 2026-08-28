import { disciplineLabel } from "./competitionLogic";
import { competitionRulesEngine } from "./rules/competitionRulesEngine";
import { sortArbitrationMatches } from "./arbitrationSorting";
import { PLANNING_TATAMIS } from "./planningLogic";

const REFEREE_SLOTS = ["Shushin", "Fukushin 1", "Fukushin 2", "Fukushin 3", "Fukushin 4", "Arbitre de table 1", "Arbitre de table 2", "Arbitre de table 3"];
const TABLE_SLOTS = ["Arbitre de table 1", "Arbitre de table 2", "Arbitre de table 3"];

function CompetitionControl({ competition, onOpenMatch }) {
  const competitors = competition.competitors || [];
  const categories = competition.categories || [];
  const assignments = competition.refereeAssignments || {};
  const getCompetitor = (id) => competitors.find((competitor) => String(competitor.id) === String(id));
  const getCategory = (id) => categories.find((category) => String(category.id) === String(id));
  const name = (id) => { const person = getCompetitor(id); return person ? `${person.nom || ""} ${person.prenom || ""}`.trim() : "—"; };
  const refereeName = (assignment) => assignment?.manualName || name(assignment?.refereeId);

  const groups = new Map(PLANNING_TATAMIS.map((tatami) => [String(tatami), []]));
  (competition.pools || []).forEach((pool) => (pool.matches || []).forEach((match) => {
    const tatami = String(match.tatami || "");
    if (groups.has(tatami)) groups.get(tatami).push({ pool, match });
  }));
  groups.forEach((matches) => matches.sort(sortArbitrationMatches));

  function matchText(item) {
    if (!item) return "Aucun passage";
    const { match } = item;
    if (competitionRulesEngine.isKataDiscipline(match.discipline)) return name(match.competitorId || match.akaId);
    return `AKA ${name(match.akaId)} · SHIRO ${name(match.shiroId)}`;
  }

  return <section className="competition-control">
    <div className="manager-header"><div><p className="surtitle">POSTE DE COMMANDEMENT</p><h2>Contrôle compétition</h2><p>Vue synthétique des trois tatamis : passage en cours, prochain passage, progression et équipe d’arbitrage.</p></div></div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "16px", alignItems: "start" }}>
      {PLANNING_TATAMIS.map((tatami) => {
        const matches = groups.get(String(tatami)) || [];
        const unfinished = matches.filter(({ match }) => match.statut !== "Terminé");
        const current = unfinished[0] || null;
        const next = unfinished[1] || null;
        const finished = matches.length - unfinished.length;
        const progress = matches.length ? Math.round((finished / matches.length) * 100) : 0;
        const team = assignments[tatami] || assignments[String(tatami)] || {};
        const tableCount = TABLE_SLOTS.filter((slot) => refereeName(team[slot]) !== "—").length;
        const tableStatus = tableCount >= 3 ? "Table complète" : tableCount >= 2 ? "Table opérationnelle" : "Table incomplète";
        return <article key={tatami} style={{ border: "2px solid #d7dde5", borderRadius: "14px", background: "white", overflow: "hidden" }}>
          <div style={{ padding: "16px", background: "#14213d", color: "white" }}><p className="surtitle" style={{ color: "inherit", margin: 0 }}>TATAMI {tatami}</p><h3 style={{ margin: "4px 0 8px" }}>{finished}/{matches.length} passages terminés</h3><div style={{ height: "8px", background: "rgba(255,255,255,.22)", borderRadius: "999px", overflow: "hidden" }}><span style={{ display: "block", height: "100%", width: `${progress}%`, background: "white" }} /></div></div>
          <div style={{ padding: "16px" }}>
            <section style={{ padding: "12px", borderRadius: "10px", background: current ? "#eef6ff" : "#f7f9fb", border: "1px solid #d7dde5" }}><p className="surtitle" style={{ marginTop: 0 }}>EN COURS / PROCHAIN À LANCER</p>{current ? <><strong>{disciplineLabel(current.match.discipline)} · {getCategory(current.pool.categoryId)?.nom || "Catégorie"}</strong><p style={{ marginBottom: "8px" }}>{matchText(current)}</p><button className="primary" type="button" onClick={() => onOpenMatch?.(current.pool.id, current.match.id)}>Ouvrir la feuille</button></> : <strong>Tatami terminé</strong>}</section>
            <section style={{ marginTop: "12px", padding: "12px", borderRadius: "10px", background: "#f7f9fb", border: "1px solid #d7dde5" }}><p className="surtitle" style={{ marginTop: 0 }}>À SUIVRE</p>{next ? <><strong>{disciplineLabel(next.match.discipline)} · {getCategory(next.pool.categoryId)?.nom || "Catégorie"}</strong><p style={{ marginBottom: 0 }}>{matchText(next)}</p></> : <strong>Pas d’autre passage prévu</strong>}</section>
            <section style={{ marginTop: "12px" }}><div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "center" }}><p className="surtitle" style={{ margin: 0 }}>ÉQUIPE D’ARBITRAGE</p><strong>{tableStatus} · {tableCount}/3 table</strong></div><div style={{ display: "grid", gap: "6px", marginTop: "8px" }}>{REFEREE_SLOTS.map((slot) => <div key={slot} style={{ display: "flex", justifyContent: "space-between", gap: "10px", padding: "7px 9px", borderRadius: "8px", background: "#f7f9fb" }}><span>{slot}</span><strong style={{ textAlign: "right" }}>{refereeName(team[slot])}</strong></div>)}</div></section>
          </div>
        </article>;
      })}
    </div>
  </section>;
}

export default CompetitionControl;
