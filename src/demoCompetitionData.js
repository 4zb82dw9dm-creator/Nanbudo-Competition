import { buildAutomaticCategories, buildPoolsForCategory, calculateRanking, podiumFromPool } from "./competitionLogic";

const DEMO_COMPETITORS = [
  ["Martin", "Léo", 7, "6e Kyu", "Nanbudo Paris 12", "leo.martin@example.test", "Claire Dubois", ["Kata individuel"]],
  ["Bernard", "Camille", 8, "6e Kyu", "Budokan Lyon", "camille.bernard@example.test", "Marc Lefèvre", ["Ju Randori"]],
  ["Petit", "Hugo", 9, "5e Kyu", "Nanbudo Atlantique Nantes", "hugo.petit@example.test", "Sophie Caron", ["Kata individuel", "Ju Randori"]],
  ["Robert", "Manon", 10, "5e Kyu", "Dojo de Lille", "manon.robert@example.test", "Antoine Moreau", ["Kata individuel"]],
  ["Richard", "Nathan", 11, "4e Kyu", "Nanbudo Provence Marseille", "nathan.richard@example.test", "Élodie Garnier", ["Ju Randori"]],
  ["Durand", "Inès", 12, "4e Kyu", "Samouraï Club Toulouse", "ines.durand@example.test", "Julien Renaud", ["Kata individuel", "Ju Randori"]],
  ["Dubois", "Lucas", 12, "3e Kyu", "Nanbudo Côte d'Azur Nice", "lucas.dubois@example.test", "Nathalie Perrin", ["Kata individuel"]],
  ["Moreau", "Chloé", 13, "3e Kyu", "École Nanbudo Grenoble", "chloe.moreau@example.test", "Thomas Marchand", ["Ju Randori"]],
  ["Laurent", "Ethan", 14, "2e Kyu", "Dojo Sakura Strasbourg", "ethan.laurent@example.test", "Isabelle Colin", ["Kata individuel", "Ju Randori"]],
  ["Simon", "Zoé", 14, "2e Kyu", "Nanbudo Breizh Rennes", "zoe.simon@example.test", "Pierre Aubry", ["Kata individuel"]],
  ["Michel", "Noah", 15, "1er Kyu", "Cercle Nanbudo Bordeaux", "noah.michel@example.test", "Valérie Faure", ["Ju Randori"]],
  ["Lefèvre", "Emma", 15, "1er Kyu", "Nanbudo Paris 12", "emma.lefevre@example.test", "Claire Dubois", ["Kata individuel", "Ju Randori"]],
  ["Leroy", "Maël", 16, "1er Dan", "Budokan Lyon", "mael.leroy@example.test", "Marc Lefèvre", ["Kata individuel"]],
  ["Roux", "Lina", 16, "1er Dan", "Nanbudo Atlantique Nantes", "lina.roux@example.test", "Sophie Caron", ["Ju Randori"]],
  ["David", "Tom", 17, "2e Dan", "Dojo de Lille", "tom.david@example.test", "Antoine Moreau", ["Kata individuel", "Ju Randori"]],
  ["Bertrand", "Sarah", 17, "2e Dan", "Nanbudo Provence Marseille", "sarah.bertrand@example.test", "Élodie Garnier", ["Kata individuel"]],
  ["Morel", "Antoine", 18, "2e Dan", "Samouraï Club Toulouse", "antoine.morel@example.test", "Julien Renaud", ["Ju Randori"]],
  ["Fournier", "Léa", 21, "3e Dan", "Nanbudo Côte d'Azur Nice", "lea.fournier@example.test", "Nathalie Perrin", ["Kata individuel", "Ju Randori"]],
  ["Girard", "Baptiste", 24, "3e Dan", "École Nanbudo Grenoble", "baptiste.girard@example.test", "Thomas Marchand", ["Kata individuel"]],
  ["Bonnet", "Julie", 27, "4e Dan", "Dojo Sakura Strasbourg", "julie.bonnet@example.test", "Isabelle Colin", ["Ju Randori"]],
  ["Dupont", "Maxime", 30, "4e Dan", "Nanbudo Breizh Rennes", "maxime.dupont@example.test", "Pierre Aubry", ["Kata individuel", "Ju Randori"]],
  ["Lambert", "Anaïs", 33, "5e Dan", "Cercle Nanbudo Bordeaux", "anais.lambert@example.test", "Valérie Faure", ["Kata individuel"]],
  ["Fontaine", "Quentin", 35, "5e Dan", "Nanbudo Paris 12", "quentin.fontaine@example.test", "Claire Dubois", ["Ju Randori"]],
  ["Rousseau", "Marie", 36, "6e Dan", "Budokan Lyon", "marie.rousseau@example.test", "Marc Lefèvre", ["Kata individuel", "Ju Randori"]],
  ["Vincent", "Romain", 39, "6e Dan", "Nanbudo Atlantique Nantes", "romain.vincent@example.test", "Sophie Caron", ["Kata individuel"]],
  ["Muller", "Amandine", 42, "3e Dan", "Dojo de Lille", "amandine.muller@example.test", "Antoine Moreau", ["Ju Randori"]],
  ["Lefort", "Olivier", 45, "4e Dan", "Nanbudo Provence Marseille", "olivier.lefort@example.test", "Élodie Garnier", ["Kata individuel", "Ju Randori"]],
  ["Garnier", "Céline", 47, "5e Dan", "Samouraï Club Toulouse", "celine.garnier@example.test", "Julien Renaud", ["Kata individuel"]],
  ["Chevalier", "Philippe", 49, "6e Dan", "Nanbudo Côte d'Azur Nice", "philippe.chevalier@example.test", "Nathalie Perrin", ["Ju Randori"]],
  ["François", "Nadia", 50, "6e Dan", "École Nanbudo Grenoble", "nadia.francois@example.test", "Thomas Marchand", ["Kata individuel", "Ju Randori"]],
];

export function createDemoCompetitionTest30() {
  const competitors = DEMO_COMPETITORS.map(([nom, prenom, age, ceinture, club, email, responsableClub, categoriesInscription], index) => ({
    id: 202608050000 + index + 1,
    nom: nom.toUpperCase(),
    prenom,
    age,
    ceinture,
    grade: ceinture,
    club,
    email,
    responsableClub,
    categoriesInscription,
    categorieInscription: categoriesInscription.join(", "),
    discipline: categoriesInscription.some((category) => !category.startsWith("Kata")) ? "both" : "kata",
    sexe: "Non renseigné",
    dateNaissance: "",
    ligue: "",
    pays: "",
    statutInscription: "Validée",
  }));
  return {
    id: 2026080530,
    publicToken: "competition-test-30-demo",
    nom: "Compétition Test 30",
    date: "2026-09-20",
    lieu: "Paris",
    tatamis: 3,
    horairesActifs: true,
    statut: "Catégories générées",
    competitors,
    categories: buildAutomaticCategories(competitors),
    pools: [],
    availableKatas: ["Kata 0", "Kata 1", "Kata 2"],
    katas: ["Kata 0", "Kata 1", "Kata 2"],
  };
}

export const COMPLETE_TEST_COMPETITION_NAME = "Coupe Test Nanbudo 2026";

export function createCompleteTestCompetition() {
  const competitors = DEMO_COMPETITORS.slice(0, 12).map(([nom, prenom, age, ceinture, club, email, responsableClub, categoriesInscription], index) => {
    const isRefereeOnly = index === 10;
    const isCompetitorAndReferee = index === 4 || index === 8;
    const typeInscription = isRefereeOnly ? "Arbitre" : isCompetitorAndReferee ? "Compétiteur + Arbitre" : "Compétiteur";
    const registeredCategories = isRefereeOnly ? [] : categoriesInscription;
    return {
      id: 202608070001 + index,
      nom: nom.toUpperCase(), prenom, age, ceinture, grade: ceinture, club, email, responsableClub,
      ville: "Paris", telephoneResponsable: "06 00 00 00 00", sexe: index % 2 ? "Femme" : "Homme",
      dateNaissance: `${2026 - age}-01-15`, ligue: "Île-de-France", pays: "France",
      categoriesInscription: registeredCategories, categorieInscription: registeredCategories.join(", "),
      discipline: isRefereeOnly ? "arbitrage" : registeredCategories.some((category) => !category.startsWith("Kata")) ? "both" : "kata",
      typeInscription,
      fonctionArbitrage: isRefereeOnly || isCompetitorAndReferee ? [index % 2 ? "Fukushin" : "Shushin"] : [],
      roleArbitre: isRefereeOnly || isCompetitorAndReferee ? (index % 2 ? "Fukushin" : "Shushin") : "",
      observations: "Donnée de démonstration", statutInscription: "Validée",
    };
  });

  const categories = buildAutomaticCategories(competitors).map((category, index) => ({
    ...category,
    id: `test-category-${index + 1}`,
    statut: "Validée",
  }));
  let poolIndex = 0;
  const pools = categories.flatMap((category) => {
    const generated = buildPoolsForCategory(category, { tatamiCount: 3, startIndex: poolIndex });
    poolIndex += generated.length;
    return generated;
  }).map((pool, index) => {
    const matches = pool.matches.map((match, matchIndex) => {
      if (matchIndex > 0) return { ...match, id: `test-match-${index + 1}-${matchIndex + 1}`, ordre: matchIndex + 1, horaire: `10:${String((index * 10 + matchIndex * 5) % 60).padStart(2, "0")}` };
      const isKata = match.shiroId == null;
      return {
        ...match, id: `test-match-${index + 1}-1`, ordre: 1, horaire: `10:${String((index * 10) % 60).padStart(2, "0")}`,
        akaScore: isKata ? 24.5 : 3, shiroScore: isKata ? null : 1, finalScore: isKata ? 24.5 : null,
        winnerId: match.akaId, statut: "Terminé",
      };
    });
    const updatedPool = { ...pool, id: `test-pool-${index + 1}`, matches, statut: "En cours" };
    const isFinished = matches.length === 1;
    return isFinished ? { ...updatedPool, statut: "Terminée", rankingLocked: calculateRanking(updatedPool), podium: podiumFromPool(updatedPool) } : updatedPool;
  });

  return {
    id: 202608072026,
    publicToken: "coupe-test-nanbudo-2026",
    nom: COMPLETE_TEST_COMPETITION_NAME,
    date: "2026-10-17",
    lieu: "Paris",
    tatamis: 3,
    horairesActifs: true,
    statut: "Compétition en cours",
    competitors,
    categories,
    pools,
    availableKatas: ["Kata 0", "Kata 1", "Kata 2"],
    katas: ["Kata 0", "Kata 1", "Kata 2"],
  };
}
