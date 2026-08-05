import { useMemo, useState } from "react";
import { competitionRulesEngine } from "./rules/competitionRulesEngine";

const FUKUSHIN = ["Fukushin 1", "Fukushin 2", "Fukushin 3"];
const DECISIONS = ["AKA", "SHIRO", "HIKIWAKE"];
const FINAL_DECISIONS = ["AKA", "SHIRO"];
const ASSAULTS = Array.from({ length: 7 }, (_, index) => `Assaut ${index + 1}`);
const TIE_BREAK_ASSAULTS = ["Tsuki", "Mae Geri", "Mawashi Geri"];
const PENALTIES = [
  { id: "keikoku", label: "Keikoku", value: 0 },
  { id: "fujubun", label: "Fujubun (-1)", value: 1 },
  { id: "chui", label: "Chui (-2)", value: 2 },
  { id: "hansoku_chui", label: "Hansoku Chui (-3)", value: 3 },
  { id: "shikaku", label: "Shikaku", value: 0, disqualification: true },
];

function emptyVotes(labels) {
  return labels.map((label) => ({ label, votes: ["", "", ""] }));
}

function voteResult(votes, allowDraw = true) {
  const counts = votes.reduce((totals, vote) => ({ ...totals, [vote]: (totals[vote] || 0) + 1 }), {});
  if (counts.AKA >= 2) return "AKA";
  if (counts.SHIRO >= 2) return "SHIRO";
  return allowDraw && votes.every(Boolean) ? "HIKIWAKE" : "";
}

function scoreRows(rows) {
  return rows.reduce((score, row) => {
    const result = voteResult(row.votes);
    if (result === "AKA") return { ...score, akaPositive: score.akaPositive + 1 };
    if (result === "SHIRO") return { ...score, shiroPositive: score.shiroPositive + 1 };
    return score;
  }, { akaPositive: 0, shiroPositive: 0 });
}

function penaltyTotal(penalties) {
  return penalties.reduce((total, penalty) => total + penalty.value, 0);
}

function MatchManager({ match, onSave }) {
  const [kataAka, setKataAka] = useState(match?.kataAka || ["", "", ""]);
  const [kataShiro, setKataShiro] = useState(match?.kataShiro || ["", "", ""]);
  const [assaults, setAssaults] = useState(match?.assaults || emptyVotes(ASSAULTS));
  const [tieBreakAssaults, setTieBreakAssaults] = useState(match?.tieBreakAssaults || emptyVotes(TIE_BREAK_ASSAULTS));
  const [finalFlags, setFinalFlags] = useState(match?.finalFlags || ["", "", ""]);
  const [penalties, setPenalties] = useState(match?.penalties || { aka: [], shiro: [] });
  const isKata = competitionRulesEngine.isKataDiscipline(match.discipline);
  const sum = (values) => values.reduce((total, value) => total + Number(value || 0), 0);
  const kataScoreAka = sum(kataAka);
  const kataScoreShiro = sum(kataShiro);

  const randoriScore = useMemo(() => {
    const main = scoreRows(assaults);
    const akaNegative = penaltyTotal(penalties.aka);
    const shiroNegative = penaltyTotal(penalties.shiro);
    const akaShikaku = penalties.aka.some((penalty) => penalty.id === "shikaku");
    const shiroShikaku = penalties.shiro.some((penalty) => penalty.id === "shikaku");
    let phase = "main";
    let winner = null;
    if (akaShikaku) winner = "shiro";
    if (shiroShikaku) winner = "aka";
    if (!winner && assaults.every((row) => voteResult(row.votes))) {
      if (main.akaPositive - akaNegative > main.shiroPositive - shiroNegative) winner = "aka";
      if (main.shiroPositive - shiroNegative > main.akaPositive - akaNegative) winner = "shiro";
      if (!winner && akaNegative !== shiroNegative) winner = akaNegative > shiroNegative ? "shiro" : "aka";
      if (!winner) phase = "tieBreak";
    }
    const tie = scoreRows(tieBreakAssaults);
    if (!winner && phase === "tieBreak" && tieBreakAssaults.every((row) => voteResult(row.votes))) {
      if (tie.akaPositive > tie.shiroPositive) winner = "aka";
      if (tie.shiroPositive > tie.akaPositive) winner = "shiro";
      if (!winner) phase = "finalFlags";
    }
    if (!winner && phase === "finalFlags" && finalFlags.every(Boolean)) winner = voteResult(finalFlags, false).toLowerCase();
    return { ...main, akaNegative, shiroNegative, akaTotal: main.akaPositive - akaNegative, shiroTotal: main.shiroPositive - shiroNegative, tie, phase, winner };
  }, [assaults, tieBreakAssaults, finalFlags, penalties]);

  function setVote(section, rowIndex, judgeIndex, value) {
    const setter = section === "main" ? setAssaults : setTieBreakAssaults;
    setter((current) => current.map((row, index) => index === rowIndex ? { ...row, votes: row.votes.map((vote, itemIndex) => itemIndex === judgeIndex ? value : vote) } : row));
  }

  function addPenalty(side, penalty) {
    setPenalties((current) => ({ ...current, [side]: [...current[side], { ...penalty, at: new Date().toISOString() }] }));
  }

  function removePenalty(side, index) {
    setPenalties((current) => ({ ...current, [side]: current[side].filter((_, itemIndex) => itemIndex !== index) }));
  }

  function buildHistory(winner) {
    return [
      { type: "start", label: "Début du combat", detail: `${match.aka?.nom || "AKA"} vs ${match.shiro?.nom || "SHIRO"}` },
      ...assaults.map((row) => ({ type: "assault", label: row.label, detail: voteResult(row.votes) || "En attente", votes: row.votes })),
      ...["aka", "shiro"].flatMap((side) => penalties[side].map((penalty) => ({ type: "penalty", label: `Pénalité ${side.toUpperCase()}`, detail: penalty.label }))),
      ...(randoriScore.phase !== "main" ? tieBreakAssaults.map((row) => ({ type: "tieBreak", label: `Départage · ${row.label}`, detail: voteResult(row.votes) || "En attente", votes: row.votes })) : []),
      ...(randoriScore.phase === "finalFlags" ? [{ type: "finalFlags", label: "Décision finale aux drapeaux", detail: voteResult(finalFlags, false) || "En attente", votes: finalFlags }] : []),
      { type: "final", label: "Résultat final", detail: winner ? winner.toUpperCase() : "À départager" },
    ];
  }

  function save() {
    if (isKata) return onSave({ kataAka, kataShiro, scoreAka: kataScoreAka, scoreShiro: kataScoreShiro, vainqueur: kataScoreAka > kataScoreShiro ? "aka" : kataScoreShiro > kataScoreAka ? "shiro" : null });
    onSave({ assaults, tieBreakAssaults, finalFlags, penalties, scoreAka: randoriScore.akaTotal, scoreShiro: randoriScore.shiroTotal, akaScore: randoriScore.akaTotal, shiroScore: randoriScore.shiroTotal, vainqueur: randoriScore.winner, matchHistory: buildHistory(randoriScore.winner) });
  }

  if (isKata) return <section className="match-manager"><div className="manager-header"><div><p className="surtitle">KATA</p><h2>Feuille officielle de notation Kata</h2><p>{match.categoryName}</p></div></div><div className="assauts"><h3>Notes Kata</h3>{[0, 1, 2].map((index) => <div className="juge" key={index}><span>Juge {index + 1}</span><input type="number" step="0.1" value={kataAka[index]} onChange={(event) => setKataAka(kataAka.map((value, itemIndex) => itemIndex === index ? event.target.value : value))} placeholder="AKA" /><input type="number" step="0.1" value={kataShiro[index]} onChange={(event) => setKataShiro(kataShiro.map((value, itemIndex) => itemIndex === index ? event.target.value : value))} placeholder="SHIRO" /></div>)}</div><div className="match-result"><h3>Vainqueur</h3><p>{kataScoreAka > kataScoreShiro ? `AKA · ${match.aka?.nom} ${match.aka?.prenom}` : kataScoreShiro > kataScoreAka ? `SHIRO · ${match.shiro?.nom} ${match.shiro?.prenom}` : "Égalité / à départager"}</p><button className="primary" onClick={save}>Valider le résultat</button></div></section>;

  return <section className="match-manager randori-sheet"><div className="randori-header"><CompetitorHeader side="aka" competitor={match.aka} /><div className="match-meta"><p><strong>Discipline</strong>{competitionRulesEngine.disciplineLabel(match.discipline)}</p><p><strong>Catégorie</strong>{match.categoryName || "Non renseignée"}</p><p><strong>Poule concernée</strong>{match.poolName || match.poolId || "Non renseignée"}</p></div><CompetitorHeader side="shiro" competitor={match.shiro} /></div><AssaultTable title="Les 7 assauts" rows={assaults} onVote={(rowIndex, judgeIndex, value) => setVote("main", rowIndex, judgeIndex, value)} /><ScorePanel score={randoriScore} penalties={penalties} onAddPenalty={addPenalty} onRemovePenalty={removePenalty} />{randoriScore.phase === "tieBreak" && <AssaultTable title="Départage automatique" rows={tieBreakAssaults} onVote={(rowIndex, judgeIndex, value) => setVote("tie", rowIndex, judgeIndex, value)} />}{randoriScore.phase === "finalFlags" && <div className="final-flags"><h3>Décision finale aux drapeaux</h3><div className="assault-grid final-grid"><strong>Fukushin 1</strong><strong>Fukushin 2</strong><strong>Fukushin 3</strong>{finalFlags.map((vote, index) => <DecisionButtons key={index} value={vote} options={FINAL_DECISIONS} onChange={(value) => setFinalFlags((current) => current.map((item, itemIndex) => itemIndex === index ? value : item))} />)}</div></div>}<div className={`match-result ${randoriScore.winner ? "winner-highlight" : ""}`}><h3>Vainqueur</h3><p>{randoriScore.winner === "aka" ? `AKA · ${match.aka?.nom} ${match.aka?.prenom}` : randoriScore.winner === "shiro" ? `SHIRO · ${match.shiro?.nom} ${match.shiro?.prenom}` : "Égalité / départage en cours"}</p><button className="primary kata-validate" onClick={save}>Valider le combat</button></div></section>;
}

function CompetitorHeader({ side, competitor }) { return <article className={`fighter-card ${side}`}><h2>{side.toUpperCase()} <span>{side === "aka" ? "Rouge" : "Blanc"}</span></h2><p><strong>Nom</strong>{competitor?.nom || "-"}</p><p><strong>Prénom</strong>{competitor?.prenom || "-"}</p><p><strong>Club</strong>{competitor?.club || "Club non renseigné"}</p></article>; }
function DecisionButtons({ value, options = DECISIONS, onChange }) { return <div className="decision-buttons">{options.map((option) => <button key={option} type="button" className={`vote-button ${value === option ? `selected ${option.toLowerCase()}` : ""}`} onClick={() => onChange(option)}>{option}</button>)}</div>; }
function AssaultTable({ title, rows, onVote }) { return <div className="assault-card"><h3>{title}</h3><div className="assault-grid"><strong>Assaut</strong>{FUKUSHIN.map((judge) => <strong key={judge}>{judge}</strong>)}<strong>Résultat</strong>{rows.map((row, rowIndex) => <div className="assault-row-contents" key={row.label}><span className="assault-label">{row.label}</span>{row.votes.map((vote, judgeIndex) => <DecisionButtons key={`${row.label}-${judgeIndex}`} value={vote} onChange={(value) => onVote(rowIndex, judgeIndex, value)} />)}<strong className={`result-pill ${voteResult(row.votes).toLowerCase()}`}>{voteResult(row.votes) || "-"}</strong></div>)}</div></div>; }
function ScorePanel({ score, penalties, onAddPenalty, onRemovePenalty }) { return <div className="score-panel">{["aka", "shiro"].map((side) => <article className={`score-card ${side}`} key={side}><h3>{side.toUpperCase()}</h3><p><span>Points positifs</span><strong>{score[`${side}Positive`]}</strong></p><p><span>Points négatifs</span><strong>{score[`${side}Negative`]}</strong></p><p><span>Score total</span><strong>{score[`${side}Total`]}</strong></p><div className="penalty-actions"><h4>Pénalités</h4>{PENALTIES.map((penalty) => <button key={penalty.id} type="button" onClick={() => onAddPenalty(side, penalty)}>{penalty.label}</button>)}</div><div className="penalty-list">{penalties[side].map((penalty, index) => <button key={`${penalty.id}-${index}`} type="button" onClick={() => onRemovePenalty(side, index)}>{penalty.label} ×</button>)}</div></article>)}</div>; }
export default MatchManager;
