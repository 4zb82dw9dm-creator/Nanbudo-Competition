import { useEffect, useMemo, useState } from "react";
import { KATA_PLACEHOLDER, getKatasForCategory } from "./constants/katas";
import { competitionRulesEngine } from "./rules/competitionRulesEngine";
import { DraftRecoveryNotice, useArbitrationDraft } from "./arbitrationDrafts";

const JUDGES = competitionRulesEngine.ruleset.kata.judges;
const NOTE_OPTIONS = competitionRulesEngine.ruleset.kata.noteValues;

function KataSheet({ match, onSave }) {
  const initialNotes = match?.kataScores?.length === 5 ? match.kataScores.map(String) : ["", "", "", "", ""];
  const [kataName, setKataName] = useState(match?.kataName || "");
  const [notes, setNotes] = useState(initialNotes);
  const [activeJudge, setActiveJudge] = useState(() => {
    const firstEmpty = initialNotes.findIndex((note) => note === "");
    return firstEmpty >= 0 ? firstEmpty : 0;
  });
  const kataOptions = useMemo(() => getKatasForCategory(match.categoryName, match.kataGroup), [match.categoryName, match.kataGroup]);
  const result = useMemo(() => competitionRulesEngine.calculateKataPoints(notes), [notes]);
  const competitor = match.competitor;
  const draftPayload = useMemo(() => ({ kataName, notes }), [kataName, notes]);
  const draft = useArbitrationDraft(match, draftPayload, (saved) => {
    const restoredNotes = Array.isArray(saved.notes) ? saved.notes.map(String) : ["", "", "", "", ""];
    setKataName(saved.kataName || "");
    setNotes(restoredNotes);
    const firstEmpty = restoredNotes.findIndex((note) => note === "");
    setActiveJudge(firstEmpty >= 0 ? firstEmpty : 0);
  });

  useEffect(() => {
    if (kataName && !kataOptions.includes(kataName)) setKataName("");
  }, [kataName, kataOptions]);

  function selectScore(note) {
    if (!draft.editingEnabled) return;
    const value = String(note);
    const nextNotes = notes.map((current, index) => index === activeJudge ? value : current);
    draft.saveNow({ kataName, notes: nextNotes });
    setNotes(nextNotes);
    const nextEmpty = nextNotes.findIndex((current, index) => index > activeJudge && current === "");
    if (nextEmpty >= 0) setActiveJudge(nextEmpty);
  }

  async function save() {
    if (!kataName) return alert("Sélectionnez le Kata exécuté.");
    if (!result) return alert("Saisissez les cinq notes avant de valider.");
    if (result.requiresShugo) return alert("SHUGO — Écart de 0,3 point ou plus entre les trois notes retenues. Les arbitres doivent se réunir et corriger les notes avant validation.");
    const roundedAverage = Number(result.average.toFixed(1));
    await draft.finalize(() => onSave({ kataName, kataScores: notes.map(Number), kataHighestRemoved: result.highest, kataLowestRemoved: result.lowest, kataRetainedScores: result.retained, finalScore: roundedAverage, scoreAka: roundedAverage, scoreShiro: 0, vainqueur: "aka" }));
  }

  return <section className="kata-sheet"><div className="manager-header"><div><p className="surtitle">FEUILLE D’ARBITRAGE · KATA</p><h2>Passage Kata</h2><p>{match.categoryName}</p></div><div className="kata-final-card"><span>Moyenne retenue</span><strong>{result ? result.average.toFixed(1) : "--"}</strong></div></div>
    <div className="kata-competitor-card"><div className="present-callout"><small>PASSAGE ACTUEL</small><strong>SE PRÉSENTE</strong></div><div><span>Nom</span><strong>{competitor?.nom || "—"}</strong></div><div><span>Prénom</span><strong>{competitor?.prenom || "—"}</strong></div><div><span>Club</span><strong>{competitor?.club || "—"}</strong></div><div><span>Catégorie</span><strong>{match.categoryName || "—"}</strong></div><div><span>N° passage</span><strong>{match.ordre || "—"}</strong></div></div>
    <DraftRecoveryNotice draft={draft.pendingDraft} onResume={draft.resume} onAbandon={draft.abandon} />
    <fieldset disabled={!draft.editingEnabled} className="draft-fieldset"><label className="kata-select-label">Kata exécuté<select className="tablet-select" value={kataName} onChange={(event) => { const nextKataName = event.target.value; draft.saveNow({ kataName: nextKataName, notes }); setKataName(nextKataName); }}><option value="">{KATA_PLACEHOLDER}</option>{kataOptions.map((kata) => <option key={kata} value={kata}>{kata}</option>)}</select></label>
    <div className="kata-jury kata-click-jury"><h3>Notes du jury</h3><div className="kata-score-buttons" aria-label="Notes Kata">{NOTE_OPTIONS.map((note) => <button type="button" key={note} className={String(notes[activeJudge]) === String(note) ? "selected" : ""} onClick={() => selectScore(note)}>{Number(note).toFixed(1).replace(".", ",")}</button>)}</div><div className="kata-judge-cards">{JUDGES.map((judge, index) => <button type="button" className={`kata-judge-card${activeJudge === index ? " active" : ""}${notes[index] ? " filled" : ""}`} key={judge} onClick={() => setActiveJudge(index)}><span>{judge}</span><strong>{notes[index] ? Number(notes[index]).toFixed(1).replace(".", ",") : "—"}</strong></button>)}</div></div>
    {result?.requiresShugo && <div role="alert" style={{ margin: "16px 0", padding: "20px", border: "3px solid #b42318", borderRadius: "14px", background: "#fff1f0", textAlign: "center" }}><strong style={{ display: "block", fontSize: "2rem" }}>SHUGO</strong><span>Écart de {result.retainedSpread.toFixed(1)} point entre les notes retenues. Réunion des arbitres obligatoire avant validation.</span></div>}
    <div className="kata-summary"><h3>Récapitulatif officiel</h3>{JUDGES.map((judge, index) => <p key={judge}><span>{judge}</span><strong>{notes[index] || "--"}</strong></p>)}<hr /><p>Note la plus haute retirée : <strong>{result ? result.highest.toFixed(1) : "--"}</strong></p><p>Note la plus basse retirée : <strong>{result ? result.lowest.toFixed(1) : "--"}</strong></p><div className="kata-official-score"><span>Moyenne retenue</span><strong>{result ? result.average.toFixed(1) : "--"}</strong></div></div>
    <button className="primary kata-validate" onClick={save} disabled={Boolean(result?.requiresShugo)}>Valider le Kata</button></fieldset>
  </section>;
}

export default KataSheet;
