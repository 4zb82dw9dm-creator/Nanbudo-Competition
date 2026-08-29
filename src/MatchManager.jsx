import { useEffect, useMemo, useRef, useState } from "react";
import { competitionRulesEngine } from "./rules/competitionRulesEngine";
import { determineIndividualMatchWinner, nextPoolTieBreakStep } from "./competitionLogic";
import { applyMaiWarning } from "./maiRules";
import { DraftRecoveryNotice, useArbitrationDraft } from "./arbitrationDrafts";

const FUKUSHIN = ["Fukushin 1", "Fukushin 2", "Fukushin 3"];
const DECISIONS = ["AKA", "SHIRO", "HIKIWAKE"];
const FINAL_DECISIONS = ["AKA", "SHIRO"];
const ASSAULTS = ["Tsuki 1", "Tsuki 2", "Mae Geri 1", "Mae Geri 2", "Mawashi 1", "Mawashi 2", "Dernier Tsuki"];
const TIE_BREAK_ASSAULTS = ["Tsuki", "Mae Geri", "Mawashi Geri"];
const PENALTIES = [
  { id: "keikoku", label: "Keikoku", value: 0 },
  { id: "fujubun", label: "Fujubun (-1)", value: 1 },
  { id: "chui", label: "Chui (-2)", value: 2 },
  { id: "hansoku_chui", label: "Hansoku Chui (-3)", value: 3 },
  { id: "shikaku", label: "Shikaku", value: 0, disqualification: true },
];
const PENALTY_FLOW = ["keikoku", "fujubun", "chui", "hansoku_chui", "shikaku"];
const PENALTY_BY_ID = Object.fromEntries(PENALTIES.map((penalty) => [penalty.id, penalty]));
const MANUAL_PENALTIES = PENALTIES.filter((penalty) => penalty.id !== "shikaku");

function relabelVotes(rows, labels) {
  return labels.map((label, index) => ({ ...(rows?.[index] || { votes: ["", "", ""] }), label }));
}

function voteResult(votes, allowDraw = true) {
  const counts = votes.reduce((totals, vote) => ({ ...totals, [vote]: (totals[vote] || 0) + 1 }), {});
  if (counts.AKA >= 2) return "AKA";
  if (counts.SHIRO >= 2) return "SHIRO";
  return allowDraw && votes.every(Boolean) ? "HIKIWAKE" : "";
}

function scoreRows(rows) {
  return rows.reduce((score, row) => {
    return row.votes.reduce((totals, vote) => {
      if (vote === "AKA") return { ...totals, akaPositive: totals.akaPositive + 1 };
      if (vote === "SHIRO") return { ...totals, shiroPositive: totals.shiroPositive + 1 };
      if (vote === "HIKIWAKE") return { akaPositive: totals.akaPositive + 1, shiroPositive: totals.shiroPositive + 1 };
      return totals;
    }, score);
  }, { akaPositive: 0, shiroPositive: 0 });
}

function emptyPenaltyCounts() {
  return Object.fromEntries(PENALTY_FLOW.map((penaltyId) => [penaltyId, 0]));
}

function normalizePenaltyCounts(penalties = []) {
  const counts = penalties.reduce((totals, penalty) => {
    if (!PENALTY_BY_ID[penalty.id]) return totals;
    return { ...totals, [penalty.id]: totals[penalty.id] + 1 };
  }, emptyPenaltyCounts());

  for (let index = 0; index < PENALTY_FLOW.length - 1; index += 1) {
    const currentLevel = PENALTY_FLOW[index];
    const upperLevel = PENALTY_FLOW[index + 1];
    const conversions = Math.floor(counts[currentLevel] / 3);
    counts[currentLevel] %= 3;
    counts[upperLevel] += conversions;
  }

  if (counts.shikaku > 0) {
    counts.hansoku_chui = 0;
    counts.shikaku = 1;
  }

  return counts;
}

function normalizePenalties(penalties = []) {
  const now = new Date().toISOString();
  const counts = normalizePenaltyCounts(penalties);
  return PENALTY_FLOW.flatMap((penaltyId) =>
    Array.from({ length: counts[penaltyId] }, (_, index) => ({
      ...PENALTY_BY_ID[penaltyId],
      at: penalties.find((penalty) => penalty.id === penaltyId)?.at || now,
      automatic: true,
      conversionIndex: index,
    }))
  );
}

function penaltyTotal(penalties) {
  return normalizePenalties(penalties).reduce((total, penalty) => total + penalty.value, 0);
}

function hasShikaku(penalties) {
  return normalizePenaltyCounts(penalties).shikaku > 0;
}

function groupedPenalties(penalties) {
  const counts = normalizePenaltyCounts(penalties);
  return PENALTIES.map((penalty) => ({ ...penalty, count: counts[penalty.id] })).filter((penalty) => penalty.count > 0);
}

function removePenaltyFromChain(penalties, penaltyId) {
  const directIndex = penalties.findIndex((penalty) => penalty.id === penaltyId);
  if (directIndex >= 0) return penalties.filter((_, itemIndex) => itemIndex !== directIndex);

  const lowerPenaltyId = PENALTY_FLOW[PENALTY_FLOW.indexOf(penaltyId) - 1];
  if (!lowerPenaltyId) return penalties;

  let updatedPenalties = penalties;
  for (let index = 0; index < 3; index += 1) updatedPenalties = removePenaltyFromChain(updatedPenalties, lowerPenaltyId);
  return updatedPenalties;
}

function createScoreSheetState(match) {
  return {
    kataAka: match?.kataAka || ["", "", ""],
    kataShiro: match?.kataShiro || ["", "", ""],
    assaults: relabelVotes(match?.assaults, ASSAULTS),
    tieBreakAssaults: relabelVotes(match?.tieBreakAssaults, TIE_BREAK_ASSAULTS),
    finalFlags: match?.finalFlags || ["", "", ""],
    penalties: match?.penalties || { aka: [], shiro: [] },
    maiWarnings: match?.maiWarnings || { aka: [], shiro: [] },
  };
}

function MatchManager({ match, onSave }) {
  const initialScoreSheet = createScoreSheetState(match);
  const [kataAka, setKataAka] = useState(initialScoreSheet.kataAka);
  const [kataShiro, setKataShiro] = useState(initialScoreSheet.kataShiro);
  const [assaults, setAssaults] = useState(initialScoreSheet.assaults);
  const [tieBreakAssaults, setTieBreakAssaults] = useState(initialScoreSheet.tieBreakAssaults);
  const [finalFlags, setFinalFlags] = useState(initialScoreSheet.finalFlags);
  const [penalties, setPenalties] = useState(initialScoreSheet.penalties);
  const [maiWarnings, setMaiWarnings] = useState(initialScoreSheet.maiWarnings);
  const [maiHistory, setMaiHistory] = useState(() => (match?.matchHistory || []).filter((event) => event.type === "mai" || event.type === "mai_conversion" || event.type === "mai_removed"));
  const draftPayload = useMemo(() => ({ kataAka, kataShiro, assaults, tieBreakAssaults, finalFlags, penalties, maiWarnings, maiHistory }), [kataAka, kataShiro, assaults, tieBreakAssaults, finalFlags, penalties, maiWarnings, maiHistory]);
  const draft = useArbitrationDraft(match, draftPayload, (saved) => {
    setKataAka(saved.kataAka || ["", "", ""]); setKataShiro(saved.kataShiro || ["", "", ""]);
    setAssaults(relabelVotes(saved.assaults, ASSAULTS)); setTieBreakAssaults(relabelVotes(saved.tieBreakAssaults, TIE_BREAK_ASSAULTS));
    setFinalFlags(saved.finalFlags || ["", "", ""]); setPenalties(saved.penalties || { aka: [], shiro: [] });
    setMaiWarnings(saved.maiWarnings || { aka: [], shiro: [] }); setMaiHistory(saved.maiHistory || []);
  });
  const draftMounted = useRef(false);
  const automaticSaveDone = useRef(false);
  const isKata = competitionRulesEngine.isKataDiscipline(match.discipline);
  const hasMai = match.discipline === "ju_randori" || match.discipline === "ju_randori_equipe";
  const isEditing = match.statut === "Terminé";
  const isLocked = false;
  const sum = (values) => values.reduce((total, value) => total + Number(value || 0), 0);
  const kataScoreAka = sum(kataAka);
  const kataScoreShiro = sum(kataShiro);
  const kataReady = kataAka.every((value) => value !== "") && kataShiro.every((value) => value !== "") && kataScoreAka !== kataScoreShiro;

  const randoriScore = useMemo(() => {
    const main = scoreRows(assaults);
    const akaNegative = penaltyTotal(penalties.aka);
    const shiroNegative = penaltyTotal(penalties.shiro);
    const akaShikaku = hasShikaku(penalties.aka);
    const shiroShikaku = hasShikaku(penalties.shiro);
    const akaTotal = main.akaPositive - akaNegative;
    const shiroTotal = main.shiroPositive - shiroNegative;
    const mainAssaultsResolved = assaults.every((row) => voteResult(row.votes));
    const phase = "main";
    const winner = determineIndividualMatchWinner({ akaTotal, shiroTotal, akaShikaku, shiroShikaku });

    return { ...main, akaNegative, shiroNegative, akaTotal, shiroTotal, phase, winner, complete: mainAssaultsResolved };
  }, [assaults, tieBreakAssaults, finalFlags, penalties]);

  function setVote(section, rowIndex, judgeIndex, value) {
    if (isLocked) return;
    const setter = section === "main" ? setAssaults : setTieBreakAssaults;
    setter((current) => current.map((row, index) => index === rowIndex ? { ...row, votes: row.votes.map((vote, itemIndex) => itemIndex === judgeIndex ? value : vote) } : row));
  }

  function addPenalty(side, penalty) {
    if (isLocked || penalty.id === "shikaku") return;
    setPenalties((current) => ({ ...current, [side]: [...current[side], { ...penalty, at: new Date().toISOString() }] }));
  }

  function removePenalty(side, penaltyId) {
    if (isLocked) return;
    setPenalties((current) => ({ ...current, [side]: removePenaltyFromChain(current[side], penaltyId) }));
  }

  function addMai(side, assaultIndex) {
    if (isLocked || !hasMai || assaultIndex < 0 || assaultIndex >= assaults.length) return;
    const at = new Date().toISOString();
    const warning = {
      assaultIndex,
      assaultLabel: assaults[assaultIndex]?.label || ASSAULTS[assaultIndex],
      at,
    };
    const { activeWarnings, conversion } = applyMaiWarning(maiWarnings[side], warning);
    const conversions = conversion ? [{ ...conversion, at }] : [];

    setMaiWarnings((current) => ({ ...current, [side]: activeWarnings }));
    setPenalties((current) => ({
      ...current,
      [side]: [
        ...current[side],
        ...conversions.map((item) => ({ ...PENALTY_BY_ID.fujubun, at, automatic: true, source: "mai", maiConversion: item })),
      ],
    }));
    setMaiHistory((current) => [
      ...current,
      { type: "mai", label: `Maï ${side.toUpperCase()}`, detail: warning.assaultLabel, at },
      ...conversions.map((item) => ({
        type: "mai_conversion",
        label: `Conversion Maï ${side.toUpperCase()}`,
        detail: `${item.consumed.map((mai) => mai.assaultLabel).join(" + ")} → Fujubun`,
        at,
      })),
    ]);
  }

  function removeLastMai(side) {
    if (isLocked || !hasMai || !maiWarnings[side].length) return;
    const removed = maiWarnings[side][maiWarnings[side].length - 1];
    setMaiWarnings((current) => ({ ...current, [side]: current[side].slice(0, -1) }));
    setMaiHistory((current) => [...current, { type: "mai_removed", label: `Maï retiré ${side.toUpperCase()}`, detail: removed.assaultLabel, at: new Date().toISOString() }]);
  }

  function buildHistory(winner) {
    return [
      { type: "start", label: "Début du combat", detail: `${match.aka?.nom || "AKA"} vs ${match.shiro?.nom || "SHIRO"}` },
      ...assaults.map((row) => ({ type: "assault", label: row.label, detail: voteResult(row.votes) || "En attente", votes: row.votes })),
      ...maiHistory,
      ...["aka", "shiro"].flatMap((side) => normalizePenalties(penalties[side]).map((penalty) => ({ type: "penalty", label: `Pénalité ${side.toUpperCase()}`, detail: penalty.label }))),
      { type: "final", label: "Résultat final", detail: winner ? winner.toUpperCase() : "Égalité" },
    ];
  }

  async function save() {
    if (isKata) {
      if (!kataReady) return alert("Saisissez toutes les notes et départagez le match avant de valider.");
      return draft.finalize(() => onSave({ kataAka, kataShiro, scoreAka: kataScoreAka, scoreShiro: kataScoreShiro, vainqueur: kataScoreAka > kataScoreShiro ? "aka" : "shiro" }));
    }
    if (isLocked) return;
    if (!randoriScore.complete) return alert("Saisissez le résultat des sept assauts avant de valider.");
    return draft.finalize(() => onSave({ assaults, penalties: { aka: normalizePenalties(penalties.aka), shiro: normalizePenalties(penalties.shiro) }, maiWarnings, akaNegative: randoriScore.akaNegative, shiroNegative: randoriScore.shiroNegative, scoreAka: randoriScore.akaTotal, scoreShiro: randoriScore.shiroTotal, akaScore: randoriScore.akaTotal, shiroScore: randoriScore.shiroTotal, vainqueur: randoriScore.winner, matchHistory: buildHistory(randoriScore.winner) }));
  }

  useEffect(() => {
    const nextScoreSheet = createScoreSheetState(match);
    setKataAka(nextScoreSheet.kataAka);
    setKataShiro(nextScoreSheet.kataShiro);
    setAssaults(nextScoreSheet.assaults);
    setTieBreakAssaults(nextScoreSheet.tieBreakAssaults);
    setFinalFlags(nextScoreSheet.finalFlags);
    setPenalties(nextScoreSheet.penalties);
    setMaiWarnings(nextScoreSheet.maiWarnings);
    setMaiHistory((match?.matchHistory || []).filter((event) => event.type === "mai" || event.type === "mai_conversion" || event.type === "mai_removed"));
    automaticSaveDone.current = false;
  }, [match.id]);

  useEffect(() => {
    if (!draftMounted.current) { draftMounted.current = true; return; }
    draft.markChanged();
  }, [draftPayload]);

  useEffect(() => {
    if (isKata || isEditing || automaticSaveDone.current) return;
    if (!hasShikaku(penalties.aka) && !hasShikaku(penalties.shiro)) return;
    automaticSaveDone.current = true;
    save();
  }, [isEditing, isKata, penalties, randoriScore.winner]);

  if (draft.pendingDraft) return <section className="match-manager"><DraftRecoveryNotice draft={draft.pendingDraft} onResume={draft.resume} onAbandon={draft.abandon} /></section>;

  if (isKata) return <section className="match-manager"><div className="manager-header"><div><p className="surtitle">KATA</p><h2>Feuille officielle de notation Kata</h2><p>{match.categoryName}</p></div></div><div className="assauts"><h3>Notes Kata</h3>{[0, 1, 2].map((index) => <div className="juge" key={index}><span>Juge {index + 1}</span><input type="number" step="0.1" value={kataAka[index]} onChange={(event) => setKataAka(kataAka.map((value, itemIndex) => itemIndex === index ? event.target.value : value))} placeholder="AKA" /><input type="number" step="0.1" value={kataShiro[index]} onChange={(event) => setKataShiro(kataShiro.map((value, itemIndex) => itemIndex === index ? event.target.value : value))} placeholder="SHIRO" /></div>)}</div><div className="match-result"><h3>Vainqueur</h3><p>{kataScoreAka > kataScoreShiro ? `AKA · ${match.aka?.nom} ${match.aka?.prenom}` : kataScoreShiro > kataScoreAka ? `SHIRO · ${match.shiro?.nom} ${match.shiro?.prenom}` : "Égalité / à départager"}</p><button className="primary" onClick={save} disabled={!kataReady}>Valider le résultat</button></div></section>;

  return <section className="match-manager randori-sheet"><div className="match-meta"><p><strong>Discipline</strong>{competitionRulesEngine.disciplineLabel(match.discipline)}</p><p><strong>Catégorie</strong>{match.categoryName || "Non renseignée"}</p><p><strong>Poule</strong>{match.poolName || match.poolId || "Non renseignée"}</p></div><ControlPanel match={match} score={randoriScore} penalties={penalties} maiWarnings={maiWarnings} hasMai={hasMai} onAddPenalty={addPenalty} onRemovePenalty={removePenalty} onRemoveMai={removeLastMai} disabled={isLocked} /><AssaultCards title="Les 7 assauts" rows={assaults} disabled={isLocked} hasMai={hasMai} maiWarnings={maiWarnings} onAddMai={addMai} onVote={(rowIndex, judgeIndex, value) => setVote("main", rowIndex, judgeIndex, value)} /><div className={`match-result ${randoriScore.winner ? "winner-highlight" : ""}`}><h3>Résultat du combat</h3><p>{randoriScore.winner === "aka" ? `AKA · ${match.aka?.nom} ${match.aka?.prenom}` : randoriScore.winner === "shiro" ? `SHIRO · ${match.shiro?.nom} ${match.shiro?.prenom}` : "Égalité"}</p><button className="primary kata-validate" onClick={save} disabled={isLocked || !randoriScore.complete}>{isLocked ? "Combat validé" : "Valider le combat"}</button></div></section>;
}

function ControlPanel({ match, score, penalties, maiWarnings, hasMai, onAddPenalty, onRemovePenalty, onRemoveMai, disabled }) { return <div className="randori-control-zone" aria-label="Console de pilotage du combat">{["aka", "shiro"].map((side) => <CompetitorControlCard key={side} side={side} competitor={match[side]} score={score} penalties={penalties[side]} maiWarnings={maiWarnings[side]} hasMai={hasMai} onAddPenalty={(penalty) => onAddPenalty(side, penalty)} onRemovePenalty={(penaltyId) => onRemovePenalty(side, penaltyId)} onRemoveMai={() => onRemoveMai(side)} disabled={disabled} />)}</div>; }
function CompetitorControlCard({ side, competitor, score, penalties, maiWarnings, hasMai, onAddPenalty, onRemovePenalty, onRemoveMai, disabled }) { const visiblePenalties = groupedPenalties(penalties); return <article className={`control-card ${side}`}><div className="control-fighter"><h2>{side.toUpperCase()} <span>{side === "aka" ? "Rouge" : "Blanc"}</span></h2><p><strong>{competitor?.nom || "-"} {competitor?.prenom || ""}</strong><span>{competitor?.club || "Club non renseigné"}</span></p></div><div className="control-score-values"><p><span>Points +</span><strong>{score[`${side}Positive`]}</strong></p><p><span>Points -</span><strong>{score[`${side}Negative`]}</strong></p><p><span>Total</span><strong>{score[`${side}Total`]}</strong></p></div><div className="penalty-actions"><span className="penalty-title">Pénalités</span>{MANUAL_PENALTIES.map((penalty) => <button key={penalty.id} className={`penalty-button ${penalty.id}`} type="button" disabled={disabled} onClick={() => onAddPenalty(penalty)}>{penalty.label}</button>)}</div><div className="penalty-list" aria-live="polite">{hasMai && maiWarnings.length > 0 && <button type="button" disabled={disabled} onClick={onRemoveMai} title={`Dernier Maï : ${maiWarnings[maiWarnings.length - 1].assaultLabel}`}>Maï en cours ×{maiWarnings.length} <span aria-hidden="true">[-]</span></button>}{visiblePenalties.map((penalty) => <button key={penalty.id} type="button" disabled={disabled} onClick={() => onRemovePenalty(penalty.id)}>{penalty.label} ×{penalty.count} <span aria-hidden="true">[-]</span></button>)}</div></article>; }
function DecisionButtons({ value, options = DECISIONS, onChange, disabled = false }) { return <div className="decision-buttons">{options.map((option) => <button key={option} type="button" disabled={disabled} className={`vote-button ${value === option ? `selected ${option.toLowerCase()}` : ""}`} onClick={() => onChange(option)}>{option}</button>)}</div>; }
function AssaultCards({ title, rows, onVote, disabled = false, hasMai = false, maiWarnings = { aka: [], shiro: [] }, onAddMai }) { return <div className="assaults-section"><h3>{title}</h3>{rows.map((row, rowIndex) => { const akaMaiCount = (maiWarnings.aka || []).filter((item) => item.assaultIndex === rowIndex).length; const shiroMaiCount = (maiWarnings.shiro || []).filter((item) => item.assaultIndex === rowIndex).length; return <article className="assault-card" key={row.label}><div className="assault-card-header"><span className="assault-label">{row.label}</span><strong className={`result-pill ${voteResult(row.votes).toLowerCase()}`}>{voteResult(row.votes) || "En attente"}</strong></div>{hasMai && <div className="assault-mai-actions" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", margin: "12px 0" }}><button className="penalty-button mai" style={{ background: "#c62828", color: "#ffffff", borderColor: "#9b1c1c" }} type="button" disabled={disabled} onClick={() => onAddMai?.("aka", rowIndex)}>AKA MAÏ{akaMaiCount ? ` ×${akaMaiCount}` : ""}</button><button className="penalty-button mai" style={{ background: "#ffffff", color: "#14213d", borderColor: "#aeb7c2" }} type="button" disabled={disabled} onClick={() => onAddMai?.("shiro", rowIndex)}>SHIRO MAÏ{shiroMaiCount ? ` ×${shiroMaiCount}` : ""}</button></div>}<div className="judge-vote-grid">{FUKUSHIN.map((judge, judgeIndex) => <div className="judge-vote-card" key={`${row.label}-${judge}`}><strong>{judge}</strong><DecisionButtons value={row.votes[judgeIndex]} disabled={disabled} onChange={(value) => onVote(rowIndex, judgeIndex, value)} /></div>)}</div></article>; })}</div>; }

export function PoolTieBreakManager({ competitorIds, getCompetitor, onComplete }) {
  const pairs = useMemo(() => competitorIds.flatMap((akaId, index) => competitorIds.slice(index + 1).map((shiroId) => ({ akaId, shiroId }))), [competitorIds]);
  const [pairIndex, setPairIndex] = useState(0);
  const [stageIndex, setStageIndex] = useState(0);
  const [votes, setVotes] = useState(["", "", ""]);
  const [flags, setFlags] = useState(["", "", ""]);
  const [decisions, setDecisions] = useState([]);
  const pair = pairs[pairIndex];
  const stage = TIE_BREAK_ASSAULTS[stageIndex];

  function finishPair(side) {
    const nextDecisions = [...decisions, { ...pair, winnerId: side === "aka" ? pair.akaId : pair.shiroId }];
    if (pairIndex + 1 < pairs.length) {
      setDecisions(nextDecisions);
      setPairIndex(pairIndex + 1);
      setStageIndex(0);
      setVotes(["", "", ""]);
      setFlags(["", "", ""]);
      return;
    }
    const wins = new Map(competitorIds.map((id) => [id, 0]));
    nextDecisions.forEach(({ winnerId }) => wins.set(winnerId, wins.get(winnerId) + 1));
    const directWinner = new Map(nextDecisions.map(({ akaId, shiroId, winnerId }) => [[akaId, shiroId].sort().join("|"), winnerId]));
    const order = [...competitorIds].sort((a, b) => wins.get(b) - wins.get(a) || (directWinner.get([a, b].sort().join("|")) === a ? -1 : 1));
    onComplete(order);
  }

  function validateStage() {
    const result = voteResult(votes);
    const next = nextPoolTieBreakStep(stageIndex, result);
    if (next.winner) return finishPair(next.winner);
    setStageIndex(next.stageIndex);
    setVotes(["", "", ""]);
  }

  if (!pair) return null;
  const aka = getCompetitor(pair.akaId);
  const shiro = getCompetitor(pair.shiroId);
  const flagResult = voteResult(flags, false);
  return <section className="match-manager randori-sheet pool-tie-break"><div className="manager-header"><div><p className="surtitle">DÉPARTAGE DE LA POULE</p><h2>{competitorIds.map((id) => { const competitor = getCompetitor(id); return `${competitor?.nom || ""} ${competitor?.prenom || ""}`.trim(); }).join(" · ")}</h2><p>Seuls les compétiteurs encore à égalité après comparaison des points négatifs sont concernés.</p></div></div><div className="match-meta"><p><strong>AKA</strong>{aka?.nom} {aka?.prenom}</p><p><strong>SHIRO</strong>{shiro?.nom} {shiro?.prenom}</p><p><strong>Progression</strong>Comparaison {pairIndex + 1} / {pairs.length}</p></div>{stageIndex < TIE_BREAK_ASSAULTS.length ? <><AssaultCards title={`Départage · ${stage}`} rows={[{ label: stage, votes }]} onVote={(_, judgeIndex, value) => setVotes((current) => current.map((vote, index) => index === judgeIndex ? value : vote))} /><button className="primary" disabled={!votes.every(Boolean)} onClick={validateStage}>{voteResult(votes) === "HIKIWAKE" ? `Passer à ${TIE_BREAK_ASSAULTS[stageIndex + 1] || "la décision aux drapeaux"}` : `Valider ${stage}`}</button></> : <div className="final-flags"><h3>Décision finale aux drapeaux</h3><div className="final-flag-cards">{flags.map((vote, index) => <article className="final-flag-card" key={FUKUSHIN[index]}><strong>{FUKUSHIN[index]}</strong><DecisionButtons value={vote} options={FINAL_DECISIONS} onChange={(value) => setFlags((current) => current.map((item, itemIndex) => index === itemIndex ? value : item))} /></article>)}</div><button className="primary" disabled={!flagResult} onClick={() => finishPair(flagResult.toLowerCase())}>Valider la décision aux drapeaux</button></div>}</section>;
}
export default MatchManager;
