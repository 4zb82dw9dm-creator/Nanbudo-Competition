import { buildPoolsForCategory, calculatePoolPodium, setPoolTatami } from "./competitionLogic.js";

export const COMPLETE_TEST_COMPETITION_NAME = "COMPÉTITION TEST COMPLÈTE";
export const DEMO_COMPETITION_MARKER = "nanbudo-complete-demo-v1";

const CLUBS = ["Nanbudo Paris", "Nanbudo Marseille", "Nanbudo Lyon", "Nanbudo Nantes", "Nanbudo Lille", "Nanbudo Nice", "Nanbudo Bordeaux", "Nanbudo Toulouse"];
const FIRST_NAMES = ["Léo", "Manon", "Hugo", "Inès", "Nathan", "Chloé", "Lucas", "Zoé", "Maël", "Lina", "Tom", "Sarah", "Antoine", "Léa", "Baptiste", "Julie", "Maxime", "Anaïs", "Quentin", "Marie", "Romain", "Amandine", "Olivier", "Céline"];
const LAST_NAMES = ["Martin", "Bernard", "Petit", "Robert", "Richard", "Durand", "Dubois", "Moreau", "Laurent", "Simon", "Michel", "Lefèvre", "Leroy", "Roux", "David", "Bertrand", "Morel", "Fournier", "Girard", "Bonnet", "Dupont", "Lambert", "Fontaine", "Rousseau"];

// These are applications of existing disciplines and Kata groups, not new rules.
const DEMO_CATEGORIES = [
  { key: "kata-0", name: "Kata 0 · Poussins · Mixte · Kyu débutants", discipline: "kata_individuel", registrationCategory: "Kata individuel", kataGroup: "Kata 0", age: 9, grade: "6e Kyu", scenario: "F" },
  { key: "kata-1", name: "Kata 1 · Benjamins / Minimes · Mixte · Kyu intermédiaires", discipline: "kata_individuel", registrationCategory: "Kata individuel", kataGroup: "Kata 1", age: 13, grade: "3e Kyu", scenario: "F" },
  { key: "kata-2", name: "Kata 2 · Seniors · Mixte · Dan", discipline: "kata_individuel", registrationCategory: "Kata individuel", kataGroup: "Kata 2", age: 24, grade: "2e Dan", scenario: "F" },
  { key: "randori", name: "Randori · Cadets / Juniors · Mixte · Kyu avancés", discipline: "randori", registrationCategory: "Randori", age: 16, grade: "1er Kyu", scenario: "A" },
  { key: "ju-randori-1", name: "Ju-Randori 1 · Benjamins / Minimes · Mixte · Kyu", discipline: "ju_randori", registrationCategory: "Ju Randori", age: 13, grade: "4e Kyu", scenario: "B/D" },
  { key: "ju-randori-2", name: "Ju-Randori 2 · Seniors · Mixte · Dan", discipline: "ju_randori", registrationCategory: "Ju Randori", age: 28, grade: "2e Dan", scenario: "C/E" },
];

function makeCompetitor(category, categoryIndex, memberIndex) {
  const index = categoryIndex * 4 + memberIndex;
  const id = `demo-competitor-${index + 1}`;
  const year = 2026 - category.age;
  return {
    id, nom: LAST_NAMES[index].toUpperCase(), prenom: FIRST_NAMES[index], age: category.age,
    sexe: memberIndex % 2 ? "Femme" : "Homme", ceinture: category.grade, grade: category.grade,
    dateNaissance: `${year}-${String(memberIndex + 1).padStart(2, "0")}-15`, club: CLUBS[index % CLUBS.length],
    ville: CLUBS[index % CLUBS.length].replace("Nanbudo ", ""), pays: "France", ligue: "Démonstration",
    email: `demo.${index + 1}@example.test`, responsableClub: `Responsable ${CLUBS[index % CLUBS.length]}`,
    telephoneResponsable: `06 00 00 00 ${String(index + 1).padStart(2, "0")}`,
    categoriesInscription: [category.registrationCategory], categorieInscription: category.registrationCategory,
    discipline: category.discipline.startsWith("kata") ? "kata" : "combat", typeInscription: "Compétiteur",
    fonctionArbitrage: [], roleArbitre: "", observations: `Démonstration · scénario ${category.scenario}`, statutInscription: "Validée",
  };
}

function makeReferees() {
  const roles = [["Arbitre de table"], ["Sushin"], ["Fukushin"], ["Arbitre de table", "Sushin"], ["Sushin", "Fukushin"], ["Arbitre de table", "Fukushin"]];
  return roles.map((fonctionArbitrage, index) => ({
    id: `demo-referee-${index + 1}`, nom: ["GARNIER", "PERRIN", "CARON", "RENAUD", "AUBRY", "FAURE"][index],
    prenom: ["Claire", "Marc", "Sophie", "Julien", "Nathalie", "Pierre"][index], age: 35 + index,
    sexe: index % 2 ? "Homme" : "Femme", ceinture: `${Math.min(6, index + 1)}e Dan`, grade: `${Math.min(6, index + 1)}e Dan`,
    dateNaissance: `${1991 - index}-06-10`, club: CLUBS[index], ville: CLUBS[index].replace("Nanbudo ", ""), pays: "France",
    email: `arbitre.demo.${index + 1}@example.test`, responsableClub: "Commission arbitrage", telephoneResponsable: `06 10 20 30 4${index}`,
    categoriesInscription: [], categorieInscription: "", discipline: "arbitrage", typeInscription: "Arbitre",
    fonctionArbitrage, roleArbitre: fonctionArbitrage.join(", "), affectationTatami: (index % 3) + 1,
    observations: `Affecté au Tatami ${(index % 3) + 1}`, statutInscription: "Validée",
  }));
}

function buildDemoPools(categories) {
  return categories.map((category, index) => {
    // Reuse the production pool/match generator, then impose the category's one tatami.
    const [pool] = buildPoolsForCategory(category, { tatamiCount: 3, startIndex: index });
    const tatami = (index % 3) + 1;
    const sessionStart = category.discipline.startsWith("kata") ? 9 * 60 : 14 * 60;
    return setPoolTatami({
      ...pool, id: `demo-pool-${index + 1}`, nom: `${category.nom} · Poule 1`, scenario: category.scenario,
      statut: "Tableau généré", matches: pool.matches.map((match, matchIndex) => ({
        ...match, id: `demo-match-${index + 1}-${matchIndex + 1}`, ordre: matchIndex + 1,
        horaire: `${String(Math.floor((sessionStart + index * 10 + matchIndex * 5) / 60)).padStart(2, "0")}:${String((sessionStart + index * 10 + matchIndex * 5) % 60).padStart(2, "0")}`,
      })),
    }, tatami);
  });
}

export function createCompleteTestCompetition() {
  const competitors = DEMO_CATEGORIES.flatMap((category, categoryIndex) => Array.from({ length: 4 }, (_, memberIndex) => makeCompetitor(category, categoryIndex, memberIndex)));
  const categories = DEMO_CATEGORIES.map((definition, index) => ({
    id: `demo-category-${index + 1}`, nom: definition.name, discipline: definition.discipline,
    registrationCategory: definition.registrationCategory, kataGroup: definition.kataGroup || "",
    ageGroup: definition.age < 12 ? "Poussins" : definition.age < 15 ? "Benjamins / Minimes" : definition.age < 18 ? "Cadets / Juniors" : "Seniors",
    sexe: "Mixte", gradeGroup: definition.grade.includes("Dan") ? "Dan" : "Kyu", scenario: definition.scenario,
    competitorIds: competitors.slice(index * 4, index * 4 + 4).map(({ id }) => id), statut: "Prête", manual: true,
  }));
  return {
    id: `demo-${crypto.randomUUID()}`, slug: `competition-test-complete-${crypto.randomUUID().slice(0, 8)}`,
    demoMarker: DEMO_COMPETITION_MARKER, isDemoCompetition: true, nom: COMPLETE_TEST_COMPETITION_NAME,
    date: "2026-10-17", lieu: "Paris", tatamis: 3, horairesActifs: true, statut: "Tableaux générés",
    competitors: [...competitors, ...makeReferees()], categories, pools: buildDemoPools(categories),
    refereeAssignments: makeReferees().map(({ id, affectationTatami, fonctionArbitrage }) => ({ refereeId: id, tatami: affectationTatami, roles: fonctionArbitrage })),
    availableKatas: ["Kata 0", "Kata 1", "Kata 2"], katas: ["Kata 0", "Kata 1", "Kata 2"], planningAdjustments: {},
  };
}

function simulatedKata(pool) {
  const averages = [4.15, 4.28, 4.41, 4.57];
  return pool.matches.map((match, index) => ({ ...match, kataName: ["Randori-tori", "Shiho-taï Tsuki", "Nanbu Shodan"][Number(pool.id.at(-1)) - 1], kataScores: [averages[index], averages[index], averages[index], averages[index], averages[index]], scoreAka: averages[index], akaScore: averages[index], finalScore: averages[index], winnerId: match.akaId, statut: "Terminé" }));
}

function simulatedCombat(pool) {
  const ids = pool.competitorIds;
  return pool.matches.map((match) => {
    const a = ids.indexOf(match.akaId), b = ids.indexOf(match.shiroId);
    let akaScore = a < b ? 5 - a : 1, shiroScore = a < b ? a : 4 - b;
    let akaNegative = a, shiroNegative = b;
    if (pool.scenario === "B/D" || pool.scenario === "C/E") {
      const targets = pool.scenario === "B/D" ? [2, 4, 6, 8] : [1, 3, 3, 5];
      akaScore = pool.scenario === "B/D" ? 2 : 3; shiroScore = akaScore;
      // Put each total on that competitor's first bout so aggregate negatives are exact.
      akaNegative = a === 0 && b === 1 ? targets[a] : 0;
      shiroNegative = a === 0 ? targets[b] : 0;
    }
    const winnerId = akaScore > shiroScore ? match.akaId : shiroScore > akaScore ? match.shiroId : null;
    return { ...match, scoreAka: akaScore, scoreShiro: shiroScore, akaScore, shiroScore, akaNegative, shiroNegative, winnerId, vainqueur: winnerId === match.akaId ? "aka" : winnerId === match.shiroId ? "shiro" : null, statut: "Terminé", matchHistory: [{ type: "simulation", label: "Résultat de démonstration", detail: `${akaScore} - ${shiroScore}` }] };
  });
}

export function simulateCompleteTestCompetition(competition) {
  if (competition.demoMarker !== DEMO_COMPETITION_MARKER) return competition;
  const pools = (competition.pools || []).map((pool) => {
    const matches = pool.discipline.startsWith("kata") ? simulatedKata(pool) : simulatedCombat(pool);
    return calculatePoolPodium({ ...pool, matches, poolTieBreakOrder: [], rankingLocked: [], podium: null }).pool;
  });
  return { ...competition, pools, demoSimulatedAt: new Date().toISOString(), statut: "Résultats de démonstration simulés" };
}
