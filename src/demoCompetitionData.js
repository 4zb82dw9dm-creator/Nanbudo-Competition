import { buildPoolsForCategory, calculatePoolPodium, setPoolTatami } from "./competitionLogic.js";

export const COMPLETE_TEST_COMPETITION_NAME = "COMPÉTITION TEST 100 COMPÉTITEURS";
export const DEMO_COMPETITION_MARKER = "nanbudo-complete-demo-v2";

const CLUBS = ["Nanbudo Paris", "Nanbudo Marseille", "Nanbudo Lyon", "Nanbudo Nantes", "Nanbudo Lille", "Nanbudo Nice", "Nanbudo Bordeaux", "Nanbudo Toulouse", "Nanbudo Strasbourg", "Nanbudo Montpellier"];
const FIRST_NAMES = ["Léo", "Manon", "Hugo", "Inès", "Nathan", "Chloé", "Lucas", "Zoé", "Maël", "Lina", "Tom", "Sarah", "Antoine", "Léa", "Baptiste", "Julie", "Maxime", "Anaïs", "Quentin", "Marie", "Romain", "Amandine", "Olivier", "Céline"];
const LAST_NAMES = ["Martin", "Bernard", "Petit", "Robert", "Richard", "Durand", "Dubois", "Moreau", "Laurent", "Simon", "Michel", "Lefèvre", "Leroy", "Roux", "David", "Bertrand", "Morel", "Fournier", "Girard", "Bonnet", "Dupont", "Lambert", "Fontaine", "Rousseau"];

const DEMO_CATEGORIES = [
  { key: "kata-0", name: "Kata 0 · Poussins · Mixte · Kyu débutants", discipline: "kata_individuel", registrationCategory: "Kata individuel", kataGroup: "Kata 0", age: 9, grade: "6e Kyu", scenario: "F" },
  { key: "kata-1", name: "Kata 1 · Benjamins / Minimes · Mixte · Kyu intermédiaires", discipline: "kata_individuel", registrationCategory: "Kata individuel", kataGroup: "Kata 1", age: 13, grade: "3e Kyu", scenario: "F" },
  { key: "kata-2", name: "Kata 2 · Seniors · Mixte · Dan", discipline: "kata_individuel", registrationCategory: "Kata individuel", kataGroup: "Kata 2", age: 24, grade: "2e Dan", scenario: "F" },
  { key: "randori", name: "Randori · Cadets / Juniors · Mixte · Kyu avancés", discipline: "randori", registrationCategory: "Randori", age: 16, grade: "1er Kyu", scenario: "A" },
  { key: "ju-randori-1", name: "Ju-Randori 1 · Benjamins / Minimes · Mixte · Kyu", discipline: "ju_randori", registrationCategory: "Ju Randori", age: 13, grade: "4e Kyu", scenario: "B/D" },
  { key: "ju-randori-2", name: "Ju-Randori 2 · Seniors · Mixte · Dan", discipline: "ju_randori", registrationCategory: "Ju Randori", age: 28, grade: "2e Dan", scenario: "C/E" },
  { key: "kata0-7", name: "Kata 0 · 7 ans · Mixte", discipline: "kata_individuel", registrationCategory: "Kata individuel", kataGroup: "Kata 0", age: 7, grade: "6e Kyu", scenario: "F" },
  { key: "randori-8", name: "Randori · 8 ans · Mixte", discipline: "randori", registrationCategory: "Randori", age: 8, grade: "6e Kyu", scenario: "A" },
  { key: "kata0-10", name: "Kata 0 · 10 ans · Mixte", discipline: "kata_individuel", registrationCategory: "Kata individuel", kataGroup: "Kata 0", age: 10, grade: "5e Kyu", scenario: "F" },
  { key: "kata1-11", name: "Kata 1 · 11 ans · Mixte", discipline: "kata_individuel", registrationCategory: "Kata individuel", kataGroup: "Kata 1", age: 11, grade: "4e Kyu", scenario: "F" },
  { key: "jur1-12", name: "Ju-Randori 1 · 12 ans · Mixte", discipline: "ju_randori", registrationCategory: "Ju Randori", age: 12, grade: "4e Kyu", scenario: "A" },
  { key: "kata1-14", name: "Kata 1 · 14 ans · Mixte", discipline: "kata_individuel", registrationCategory: "Kata individuel", kataGroup: "Kata 1", age: 14, grade: "2e Kyu", scenario: "F" },
  { key: "randori-15", name: "Randori · 15 ans · Mixte", discipline: "randori", registrationCategory: "Randori", age: 15, grade: "2e Kyu", scenario: "A" },
  { key: "kata2-17", name: "Kata 2 · 17 ans · Mixte", discipline: "kata_individuel", registrationCategory: "Kata individuel", kataGroup: "Kata 2", age: 17, grade: "1er Kyu", scenario: "F" },
  { key: "jur2-18", name: "Ju-Randori 2 · 18 ans · Mixte", discipline: "ju_randori", registrationCategory: "Ju Randori", age: 18, grade: "1er Dan", scenario: "A" },
  { key: "kata2-20", name: "Kata 2 · 20 ans · Mixte", discipline: "kata_individuel", registrationCategory: "Kata individuel", kataGroup: "Kata 2", age: 20, grade: "1er Dan", scenario: "F" },
  { key: "randori-22", name: "Randori · 22 ans · Mixte", discipline: "randori", registrationCategory: "Randori", age: 22, grade: "2e Dan", scenario: "A" },
  { key: "jur2-25", name: "Ju-Randori 2 · 25 ans · Mixte", discipline: "ju_randori", registrationCategory: "Ju Randori", age: 25, grade: "2e Dan", scenario: "A" },
  { key: "kata2-30", name: "Kata 2 · 30 ans · Mixte", discipline: "kata_individuel", registrationCategory: "Kata individuel", kataGroup: "Kata 2", age: 30, grade: "3e Dan", scenario: "F" },
  { key: "randori-35", name: "Randori · 35 ans · Mixte", discipline: "randori", registrationCategory: "Randori", age: 35, grade: "3e Dan", scenario: "A" },
  { key: "jur2-40", name: "Ju-Randori 2 · 40 ans · Mixte", discipline: "ju_randori", registrationCategory: "Ju Randori", age: 40, grade: "4e Dan", scenario: "A" },
  { key: "kata2-45", name: "Kata 2 · 45 ans · Mixte", discipline: "kata_individuel", registrationCategory: "Kata individuel", kataGroup: "Kata 2", age: 45, grade: "4e Dan", scenario: "F" },
  { key: "randori-50", name: "Randori · Vétérans 50 ans · Mixte", discipline: "randori", registrationCategory: "Randori", age: 50, grade: "4e Dan", scenario: "A" },
  { key: "kata2-58", name: "Kata 2 · Vétérans 58 ans · Mixte", discipline: "kata_individuel", registrationCategory: "Kata individuel", kataGroup: "Kata 2", age: 58, grade: "5e Dan", scenario: "F" },
  { key: "jur2-65", name: "Ju-Randori 2 · Vétérans 65 ans · Mixte", discipline: "ju_randori", registrationCategory: "Ju Randori", age: 65, grade: "5e Dan", scenario: "A" },
];

function makeCompetitor(category, categoryIndex, memberIndex) {
  const index = categoryIndex * 4 + memberIndex;
  const id = `demo-competitor-${index + 1}`;
  const year = 2026 - category.age;
  return {
    id,
    nom: `${LAST_NAMES[index % LAST_NAMES.length].toUpperCase()}-${String(index + 1).padStart(3, "0")}`,
    prenom: FIRST_NAMES[index % FIRST_NAMES.length],
    age: category.age,
    sexe: memberIndex % 2 ? "Femme" : "Homme",
    ceinture: category.grade,
    grade: category.grade,
    dateNaissance: `${year}-${String((index % 12) + 1).padStart(2, "0")}-15`,
    club: CLUBS[index % CLUBS.length],
    ville: CLUBS[index % CLUBS.length].replace("Nanbudo ", ""),
    pays: "France",
    ligue: "Démonstration",
    email: `demo.${index + 1}@example.test`,
    responsableClub: `Responsable ${CLUBS[index % CLUBS.length]}`,
    telephoneResponsable: `06 00 00 ${String(Math.floor(index / 100)).padStart(2, "0")} ${String(index % 100).padStart(2, "0")}`,
    categoriesInscription: [category.registrationCategory],
    categorieInscription: category.registrationCategory,
    discipline: category.discipline.startsWith("kata") ? "kata" : "combat",
    typeInscription: "Compétiteur",
    fonctionArbitrage: [],
    roleArbitre: "",
    observations: `Démonstration · scénario ${category.scenario}`,
    statutInscription: "Validée",
  };
}

function makeReferees() {
  const roles = [
    ["Arbitre de table"],
    ["Shushin"],
    ["Fukushin"],
    ["Arbitre de table", "Shushin"],
    ["Shushin", "Fukushin"],
    ["Arbitre de table", "Fukushin"],
  ];
  return Array.from({ length: 30 }, (_, index) => {
    const fonctionArbitrage = roles[index % roles.length];
    return {
      id: `demo-referee-${index + 1}`,
      nom: `ARBITRE-${String(index + 1).padStart(2, "0")}`,
      prenom: FIRST_NAMES[(index + 6) % FIRST_NAMES.length],
      age: 28 + (index % 35),
      sexe: index % 2 ? "Homme" : "Femme",
      ceinture: `${Math.min(6, (index % 6) + 1)}e Dan`,
      grade: `${Math.min(6, (index % 6) + 1)}e Dan`,
      dateNaissance: `${1998 - (index % 30)}-${String((index % 12) + 1).padStart(2, "0")}-10`,
      club: CLUBS[index % CLUBS.length],
      ville: CLUBS[index % CLUBS.length].replace("Nanbudo ", ""),
      pays: "France",
      email: `arbitre.demo.${index + 1}@example.test`,
      responsableClub: "Commission arbitrage",
      telephoneResponsable: `06 10 20 ${String(Math.floor(index / 10)).padStart(2, "0")} ${String(index % 10).padStart(2, "0")}`,
      categoriesInscription: [],
      categorieInscription: "",
      discipline: "arbitrage",
      typeInscription: "Arbitre",
      fonctionArbitrage,
      roleArbitre: fonctionArbitrage.join(", "),
      affectationTatami: index < 24 ? Math.floor(index / 8) + 1 : null,
      observations: index < 24 ? `Affecté au Tatami ${Math.floor(index / 8) + 1}` : "Arbitre de réserve",
      statutInscription: "Validée",
    };
  });
}

function buildRefereeAssignments(referees) {
  const slots = ["Shushin", "Fukushin 1", "Fukushin 2", "Fukushin 3", "Fukushin 4", "Arbitre de table 1", "Arbitre de table 2", "Arbitre de table 3"];
  return Object.fromEntries([1, 2, 3].map((tatami) => [tatami, Object.fromEntries(slots.map((slot, slotIndex) => {
    const referee = referees[(tatami - 1) * 8 + slotIndex];
    return [slot, { refereeId: referee?.id || "", manualName: "" }];
  }))]));
}

function buildDemoPools(categories) {
  return categories.map((category, index) => {
    const [pool] = buildPoolsForCategory(category, { tatamiCount: 3, startIndex: index });
    const tatami = (index % 3) + 1;
    const sessionStart = category.discipline.startsWith("kata") ? 9 * 60 : 14 * 60;
    return setPoolTatami({
      ...pool,
      id: `demo-pool-${index + 1}`,
      nom: `${category.nom} · Poule 1`,
      scenario: category.scenario,
      matches: pool.matches.map((match, matchIndex) => ({
        ...match,
        id: `demo-match-${index + 1}-${matchIndex + 1}`,
        ordre: matchIndex + 1,
        horaire: `${String(Math.floor((sessionStart + index * 10 + matchIndex * 5) / 60)).padStart(2, "0")}:${String((sessionStart + index * 10 + matchIndex * 5) % 60).padStart(2, "0")}`,
      })),
    }, tatami);
  });
}

export function createCompleteTestCompetition() {
  const competitors = DEMO_CATEGORIES.flatMap((category, categoryIndex) => Array.from({ length: 4 }, (_, memberIndex) => makeCompetitor(category, categoryIndex, memberIndex)));
  const categories = DEMO_CATEGORIES.map((definition, index) => ({
    id: `demo-category-${index + 1}`,
    nom: definition.name,
    discipline: definition.discipline,
    registrationCategory: definition.registrationCategory,
    kataGroup: definition.kataGroup || "",
    ageGroup: definition.age <= 10 ? "7–10 ans" : definition.age <= 15 ? "10–15 ans" : definition.age < 18 ? "Juniors" : definition.age < 40 ? "Seniors" : "Vétérans",
    sexe: "Mixte",
    gradeGroup: definition.grade.includes("Dan") ? "Dan" : "Kyu",
    scenario: definition.scenario,
    competitorIds: competitors.slice(index * 4, index * 4 + 4).map(({ id }) => id),
    statut: "Prête",
    manual: true,
  }));
  const referees = makeReferees();
  return {
    id: `demo-${crypto.randomUUID()}`,
    slug: `competition-test-100-${crypto.randomUUID().slice(0, 8)}`,
    demoMarker: DEMO_COMPETITION_MARKER,
    isDemoCompetition: true,
    nom: COMPLETE_TEST_COMPETITION_NAME,
    date: "2026-10-17",
    lieu: "Paris",
    tatamis: 3,
    horairesActifs: true,
    statut: "Tableaux générés",
    competitors: [...competitors, ...referees],
    categories,
    pools: buildDemoPools(categories),
    refereeAssignments: buildRefereeAssignments(referees),
    availableKatas: ["Kata 0", "Kata 1", "Kata 2"],
    katas: ["Kata 0", "Kata 1", "Kata 2"],
    planningAdjustments: {},
  };
}

function simulatedKata(pool) {
  const averages = [4.15, 4.28, 4.41, 4.57];
  return pool.matches.map((match, index) => ({ ...match, kataName: ["Randori-tori", "Shiho-taï Tsuki", "Nanbu Shodan"][Math.min(2, Number(pool.id.split("-").at(-1)) - 1)], kataScores: [averages[index], averages[index], averages[index], averages[index], averages[index]], scoreAka: averages[index], akaScore: averages[index], finalScore: averages[index], winnerId: match.akaId, statut: "Terminé" }));
}

function simulatedCombat(pool) {
  const ids = pool.competitorIds;
  return pool.matches.map((match) => {
    const a = ids.indexOf(match.akaId), b = ids.indexOf(match.shiroId);
    let akaScore = a < b ? 5 - a : 1, shiroScore = a < b ? a : 4 - b;
    let akaNegative = a, shiroNegative = b;
    if (pool.scenario === "B/D" || pool.scenario === "C/E") {
      const targets = pool.scenario === "B/D" ? [2, 4, 6, 8] : [1, 3, 3, 5];
      akaScore = pool.scenario === "B/D" ? 2 : 3;
      shiroScore = akaScore;
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
