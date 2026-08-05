import { useMemo, useState } from "react";

const JUDGES = ["Sushin", "Fukushin 1", "Fukushin 2", "Fukushin 3", "Fukushin 4"];
const NOTE_OPTIONS = ["3.9", "4.0", "4.1", "4.2", "4.3", "4.4", "4.5", "4.6", "4.7", "4.8", "4.9"];
const DEFAULT_KATAS = ["Nanbu Shodan", "Nanbu Nidan", "Nanbu Sandan", "Nanbu Yondan", "Nanbu Godan"];

function calculateKataResult(notes) {
  if (notes.some((note) => note === "")) return null;
  const numericNotes = notes.map(Number);
  const highest = Math.max(...numericNotes);
  const lowest = Math.min(...numericNotes);
  const remaining = [...numericNotes];
  remaining.splice(remaining.indexOf(highest), 1);
  remaining.splice(remaining.indexOf(lowest), 1);
  const total = remaining.reduce((sum, note) => sum + note, 0);
  return { highest, lowest, retained: remaining, total, average: total / remaining.length };
}

function KataSheet({ match, availableKatas = [], onSave }) {
  const initialNotes = match?.kataScores?.length === 5 ? match.kataScores.map(String) : ["", "", "", "", ""];
  const [kataName, setKataName] = useState(match?.kataName || "");
  const [notes, setNotes] = useState(initialNotes);
  const kataOptions = availableKatas.length > 0 ? availableKatas : DEFAULT_KATAS;
  const result = useMemo(() => calculateKataResult(notes), [notes]);
  const competitor = match.competitor;

  function save() {
    if (!kataName) return alert("Sélectionnez le Kata exécuté.");
    if (!result) return alert("Saisissez les cinq notes avant de valider.");
    onSave({ kataName, kataScores: notes.map(Number), kataHighestRemoved: result.highest, kataLowestRemoved: result.lowest, kataRetainedScores: result.retained, finalScore: Number(result.average.toFixed(2)), scoreAka: Number(result.average.toFixed(2)), scoreShiro: 0, vainqueur: "aka" });
  }

  return <section className="kata-sheet"><div className="manager-header"><div><p className="surtitle">FEUILLE D’ARBITRAGE · KATA</p><h2>Passage Kata</h2><p>{match.categoryName}</p></div><div className="kata-final-card"><span>Moyenne retenue</span><strong>{result ? result.average.toFixed(2) : "--"}</strong></div></div>
    <div className="kata-competitor-card"><div><span>Nom</span><strong>{competitor?.nom || "—"}</strong></div><div><span>Prénom</span><strong>{competitor?.prenom || "—"}</strong></div><div><span>Club</span><strong>{competitor?.club || "—"}</strong></div><div><span>Catégorie</span><strong>{match.categoryName || "—"}</strong></div><div><span>N° passage</span><strong>{match.ordre || "—"}</strong></div></div>
    <label className="kata-select-label">Kata exécuté<select className="tablet-select" value={kataName} onChange={(event) => setKataName(event.target.value)}><option value="">Choisir un Kata...</option>{kataOptions.map((kata) => <option key={kata} value={kata}>{kata}</option>)}</select></label>
    <div className="kata-jury"><h3>Jury</h3>{JUDGES.map((judge, index) => <label className="kata-judge-row" key={judge}><span>{judge}</span><select className="tablet-select" value={notes[index]} onChange={(event) => setNotes(notes.map((note, noteIndex) => noteIndex === index ? event.target.value : note))}><option value="">Note...</option>{NOTE_OPTIONS.map((note) => <option key={note} value={note}>{note}</option>)}</select></label>)}</div>
    <div className="kata-summary"><h3>Récapitulatif officiel</h3>{JUDGES.map((judge, index) => <p key={judge}><span>{judge}</span><strong>{notes[index] || "--"}</strong></p>)}<hr /><p>Note la plus haute retirée : <strong>{result ? result.highest.toFixed(1) : "--"}</strong></p><p>Note la plus basse retirée : <strong>{result ? result.lowest.toFixed(1) : "--"}</strong></p><div className="kata-official-score"><span>Moyenne retenue</span><strong>{result ? result.average.toFixed(2) : "--"}</strong></div></div>
    <button className="primary kata-validate" onClick={save}>Valider le Kata</button>
  </section>;
}

export default KataSheet;
