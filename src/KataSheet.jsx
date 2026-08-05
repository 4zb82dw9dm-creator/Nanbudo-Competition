import { useEffect, useMemo, useState } from "react";
import { KATA_PLACEHOLDER, getKatasForCategory } from "./constants/katas";
import { competitionRulesEngine } from "./rules/competitionRulesEngine";

const JUDGES = competitionRulesEngine.ruleset.kata.judges;
const NOTE_OPTIONS = competitionRulesEngine.ruleset.kata.noteValues;
function KataSheet({ match, onSave }) {
  const initialNotes = match?.kataScores?.length === 5 ? match.kataScores.map(String) : ["", "", "", "", ""];
  const [kataName, setKataName] = useState(match?.kataName || "");
  const [notes, setNotes] = useState(initialNotes);
  const kataOptions = useMemo(() => getKatasForCategory(match.categoryName), [match.categoryName]);
  const result = useMemo(() => competitionRulesEngine.calculateKataPoints(notes), [notes]);
  const competitor = match.competitor;

  useEffect(() => {
    if (kataName && !kataOptions.includes(kataName)) setKataName("");
  }, [kataName, kataOptions]);

  function save() {
    if (!kataName) return alert("Sélectionnez le Kata exécuté.");
    if (!result) return alert("Saisissez les cinq notes avant de valider.");
    onSave({ kataName, kataScores: notes.map(Number), kataHighestRemoved: result.highest, kataLowestRemoved: result.lowest, kataRetainedScores: result.retained, finalScore: Number(result.average.toFixed(2)), scoreAka: Number(result.average.toFixed(2)), scoreShiro: 0, vainqueur: "aka" });
  }

  return <section className="kata-sheet"><div className="manager-header"><div><p className="surtitle">FEUILLE D’ARBITRAGE · KATA</p><h2>Passage Kata</h2><p>{match.categoryName}</p></div><div className="kata-final-card"><span>Moyenne retenue</span><strong>{result ? result.average.toFixed(2) : "--"}</strong></div></div>
    <div className="kata-competitor-card"><div><span>Nom</span><strong>{competitor?.nom || "—"}</strong></div><div><span>Prénom</span><strong>{competitor?.prenom || "—"}</strong></div><div><span>Club</span><strong>{competitor?.club || "—"}</strong></div><div><span>Catégorie</span><strong>{match.categoryName || "—"}</strong></div><div><span>N° passage</span><strong>{match.ordre || "—"}</strong></div></div>
    <label className="kata-select-label">Kata exécuté<select className="tablet-select" value={kataName} onChange={(event) => setKataName(event.target.value)}><option value="">{KATA_PLACEHOLDER}</option>{kataOptions.map((kata) => <option key={kata} value={kata}>{kata}</option>)}</select></label>
    <div className="kata-jury"><h3>Jury</h3>{JUDGES.map((judge, index) => <label className="kata-judge-row" key={judge}><span>{judge}</span><select className="tablet-select" value={notes[index]} onChange={(event) => setNotes(notes.map((note, noteIndex) => noteIndex === index ? event.target.value : note))}><option value="">Note...</option>{NOTE_OPTIONS.map((note) => <option key={note} value={note}>{note}</option>)}</select></label>)}</div>
    <div className="kata-summary"><h3>Récapitulatif officiel</h3>{JUDGES.map((judge, index) => <p key={judge}><span>{judge}</span><strong>{notes[index] || "--"}</strong></p>)}<hr /><p>Note la plus haute retirée : <strong>{result ? result.highest.toFixed(1) : "--"}</strong></p><p>Note la plus basse retirée : <strong>{result ? result.lowest.toFixed(1) : "--"}</strong></p><div className="kata-official-score"><span>Moyenne retenue</span><strong>{result ? result.average.toFixed(2) : "--"}</strong></div></div>
    <button className="primary kata-validate" onClick={save}>Valider le Kata</button>
  </section>;
}

export default KataSheet;
