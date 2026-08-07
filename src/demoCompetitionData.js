import { calculateRanking, generateMatches, podiumFromPool } from "./competitionLogic";

export const DEMO_COMPETITION_NAME = "Coupe Test Nanbudo 2026";

const CLUBS = {
  marseille: ["Nanbudo Marseille", "Marseille"],
  tenshin: ["Tenshin", "Montpellier"],
  aix: ["Nanbudo Aix", "Aix-en-Provence"],
  paris: ["Nanbudo Paris", "Paris"],
  lyon: ["Nanbudo Lyon", "Lyon"],
  crest: ["Nanbudo Crest", "Crest"],
  igny: ["Nanbudo Igny", "Igny"],
};

// Les groupes de quatre ci-dessous deviennent volontairement six vraies poules.
const PEOPLE = [
  ["Bernard", "Lucas", "2016-02-12", "Homme", "6e Kyu", "marseille", "Kata 0"],
  ["Petit", "Mathis", "2016-06-24", "Homme", "6e Kyu", "tenshin", "Kata 0"],
  ["Robert", "Noé", "2015-11-08", "Homme", "5e Kyu", "aix", "Kata 0"],
  ["Garcia", "Tom", "2015-04-17", "Homme", "5e Kyu", "crest", "Kata 0"],
  ["Dubois", "Emma", "2014-03-05", "Femme", "5e Kyu", "paris", "Kata 1"],
  ["Moreau", "Lina", "2014-08-21", "Femme", "5e Kyu", "lyon", "Kata 1"],
  ["Laurent", "Chloé", "2013-12-01", "Femme", "4e Kyu", "igny", "Kata 1"],
  ["Simon", "Jade", "2014-05-14", "Femme", "4e Kyu", "marseille", "Kata 1"],
  ["Michel", "Hugo", "2011-01-19", "Homme", "3e Kyu", "aix", "Kata 2"],
  ["Lefèvre", "Nathan", "2010-07-09", "Homme", "3e Kyu", "paris", "Kata 2"],
  ["Leroy", "Ethan", "2011-04-28", "Homme", "2e Kyu", "lyon", "Kata 2"],
  ["Roux", "Maël", "2010-10-16", "Homme", "2e Kyu", "tenshin", "Kata 2"],
  ["David", "Antoine", "1998-02-25", "Homme", "1er Dan", "marseille", "Randori"],
  ["Bertrand", "Baptiste", "1996-09-11", "Homme", "1er Dan", "crest", "Randori"],
  ["Morel", "Romain", "1994-06-03", "Homme", "2e Dan", "igny", "Randori"],
  ["Fournier", "Maxime", "1992-12-20", "Homme", "2e Dan", "aix", "Randori"],
  ["Girard", "Sarah", "2008-03-13", "Femme", "1er Kyu", "lyon", "Ju-Randori 1"],
  ["Bonnet", "Inès", "2008-07-27", "Femme", "1er Kyu", "paris", "Ju-Randori 1"],
  ["Dupont", "Camille", "2007-11-06", "Femme", "1er Dan", "tenshin", "Ju-Randori 1"],
  ["Lambert", "Zoé", "2008-05-30", "Femme", "1er Dan", "crest", "Ju-Randori 1"],
  ["Fontaine", "Léa", "1989-01-08", "Femme", "2e Dan", "marseille", "Ju-Randori 2"],
  ["Rousseau", "Anaïs", "1987-04-22", "Femme", "2e Dan", "igny", "Ju-Randori 2"],
  ["Vincent", "Julie", "1985-08-15", "Femme", "3e Dan", "aix", "Ju-Randori 2"],
  ["Muller", "Manon", "1988-12-02", "Femme", "3e Dan", "lyon", "Ju-Randori 2"],
];

const REFEREES = [
  ["Caron", "Sophie", "1980-03-12", "Femme", "4e Dan", "marseille", ["Arbitre de table", "Fukushin"], ["Kata", "Randori"]],
  ["Marchand", "Thomas", "1977-06-18", "Homme", "5e Dan", "tenshin", ["Shushin", "Fukushin"], ["Randori", "Ju-Randori"]],
  ["Perrin", "Nathalie", "1982-09-04", "Femme", "4e Dan", "aix", ["Arbitre de table"], ["Kata"]],
  ["Faure", "Julien", "1975-01-26", "Homme", "6e Dan", "paris", ["Shushin"], ["Randori", "Ju-Randori"]],
  ["Colin", "Isabelle", "1979-11-15", "Femme", "5e Dan", "crest", ["Fukushin", "Arbitre de table"], ["Kata", "Ju-Randori"]],
  ["Renaud", "Pierre", "1973-05-07", "Homme", "6e Dan", "igny", ["Shushin", "Fukushin", "Arbitre de table"], ["Kata", "Randori", "Ju-Randori"]],
];

const DUAL_ROLE_INDEXES = new Set([12, 16, 20, 23]);

function participant(person, index, referee = false) {
  const [nom, prenom, dateNaissance, sexe, grade, clubKey, discipline, refereeDisciplines] = person;
  const [club, ville] = CLUBS[clubKey];
  const dualRole = !referee && DUAL_ROLE_INDEXES.has(index);
  const fonctionArbitrage = dualRole
    ? (index % 2 ? ["Fukushin"] : ["Shushin", "Fukushin"])
    : referee ? discipline : [];
  const categoriesInscription = referee ? refereeDisciplines : [discipline];
  return {
    id: 202609200001 + index + (referee ? 100 : 0),
    nom: nom.toUpperCase(), prenom, sexe, dateNaissance,
    age: 2026 - Number(dateNaissance.slice(0, 4)), ceinture: grade, grade,
    club, ville, responsableClub: `Responsable ${club}`, email: `${prenom.toLowerCase()}.${nom.toLowerCase()}@example.test`, telephoneResponsable: "0600000000",
    categoriesInscription, categorieInscription: categoriesInscription.join(", "),
    discipline: referee ? "arbitrage" : discipline.startsWith("Kata") ? "kata" : "combat",
    typeInscription: referee ? "Arbitre" : dualRole ? "Compétiteur + Arbitre" : "Compétiteur",
    fonctionArbitrage, roleArbitre: fonctionArbitrage.join(", "), observations: referee ? `Arbitrage : ${refereeDisciplines.join(", ")}` : "",
    statutInscription: "Validée", ligue: "", pays: "France",
  };
}

function completedKata(match, index) {
  const scores = [4.1 + index * 0.1, 4.3, 4.4, 4.2, 4.5].map((score) => Number(score.toFixed(1)));
  const retained = [...scores].sort((a, b) => a - b).slice(1, 4);
  const finalScore = Number((retained.reduce((sum, score) => sum + score, 0) / 3).toFixed(2));
  return { ...match, kataName: index % 2 ? "Sotai Randori-Tori" : "Randori-Tori", kataScores: scores, kataHighestRemoved: Math.max(...scores), kataLowestRemoved: Math.min(...scores), kataRetainedScores: retained, finalScore, akaScore: finalScore, shiroScore: 0, winnerId: match.akaId, statut: "Terminé" };
}

function completedCombat(match, winner = "aka", akaScore = 12, shiroScore = 8) {
  return { ...match, akaScore, shiroScore, scoreAka: akaScore, scoreShiro: shiroScore, winnerId: winner === "aka" ? match.akaId : match.shiroId, vainqueur: winner, statut: "Terminé", matchHistory: [{ type: "final", label: "Résultat fictif", detail: winner.toUpperCase() }] };
}

export function createDemoCompetition() {
  const competitors = [...PEOPLE.map((person, index) => participant(person, index)), ...REFEREES.map((person, index) => participant(person, index, true))];
  const categorySpecs = [
    ["Kata 0", "kata_individuel", "Poussins · Homme · 6e/5e Kyu", 1, "Kata 0"],
    ["Kata 1", "kata_individuel", "Benjamines / Minimes · Femme · 5e/4e Kyu", 1, "Kata 1"],
    ["Kata 2", "kata_individuel", "Cadets / Juniors · Homme · 3e/2e Kyu", 2, "Kata 2"],
    ["Randori", "randori", "Seniors · Homme · Dan", 2, ""],
    ["Ju-Randori 1", "ju_randori", "Cadettes / Juniors · Femme · 1er Kyu/Dan", 3, ""],
    ["Ju-Randori 2", "ju_randori", "Seniors · Femme · Dan", 3, ""],
  ];
  const categories = categorySpecs.map(([label, discipline, details, , kataGroup], index) => ({
    id: `demo-category-${index + 1}`, nom: `${label} · ${details}`, registrationCategory: label, discipline, kataGroup,
    ageGroup: details.split(" · ")[0], sexe: details.includes("Homme") ? "Homme" : "Femme", gradeGroup: details.split(" · ").at(-1),
    competitorIds: PEOPLE.map((person, personIndex) => person[6] === label ? competitors[personIndex].id : null).filter(Boolean), statut: "Prête",
  }));
  const pools = categories.map((category, index) => {
    const tatami = categorySpecs[index][3];
    let matches = generateMatches(category.competitorIds, category, index, tatami).map((match, matchIndex) => ({ ...match, id: `demo-match-${index + 1}-${matchIndex + 1}`, ordre: matchIndex + 1, tatami, statut: "À jouer", akaScore: null, shiroScore: null, winnerId: null }));
    if (index === 0) matches = matches.map(completedKata);
    if (index === 1) matches[0] = { ...completedKata(matches[0], 1), kataName: "Shiho-taï Tsuki" };
    if (index === 3) matches[0] = completedCombat(matches[0], "aka", 13, 9);
    if (index === 4) matches[0] = completedCombat(matches[0], "shiro", 7, 11);
    const pool = { id: `demo-pool-${index + 1}`, categoryId: category.id, discipline: category.discipline, nom: `${category.nom} · Poule 1`, competitorIds: category.competitorIds, tatami, matches, statut: index === 0 ? "Terminée" : "Tableau généré", rankingLocked: [], podium: null };
    if (index === 0) return { ...pool, rankingLocked: calculateRanking(pool), podium: podiumFromPool(pool) };
    return pool;
  });
  return {
    id: 20260920, publicToken: "coupe-test-nanbudo-2026", nom: DEMO_COMPETITION_NAME,
    date: "2026-09-20", lieu: "Marseille", tatamis: 3, horairesActifs: false,
    statut: "Tableau généré / compétition prête à arbitrer", competitors, categories, pools,
    availableKatas: ["Kata 0", "Kata 1", "Kata 2"], katas: ["Kata 0", "Kata 1", "Kata 2"],
  };
}
