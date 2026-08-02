export const COMPETITION_TEST_COMPETITORS = [
  ["MARTIN", "Lucas", "Nanbudo Marseille", "Homme", 17, 63, "1er Kyu", true, false, false, true, false, false],
  ["BERNARD", "Hugo", "Nanbudo Lyon", "Homme", 18, 67, "1er Dan", false, true, false, false, true, false],
  ["ROBERT", "Enzo", "Nanbudo Paris", "Homme", 17, 65, "2e Kyu", false, false, true, false, false, true],
  ["DUBOIS", "Emma", "Nanbudo Marseille", "Femme", 17, 54, "1er Kyu", true, false, false, true, false, false],
  ["THOMAS", "Léa", "Nanbudo Toulouse", "Femme", 18, 57, "1er Dan", false, true, false, false, true, false],
  ["PETIT", "Chloé", "Nanbudo Lyon", "Femme", 17, 52, "2e Kyu", false, false, true, false, false, true],
  ["DURAND", "Thomas", "Nanbudo Marseille", "Homme", 25, 68, "1er Dan", true, false, false, true, false, false],
  ["LEROY", "Nicolas", "Nanbudo Paris", "Homme", 29, 71, "2e Dan", false, true, false, false, true, false],
  ["MOREAU", "Julien", "Nanbudo Lyon", "Homme", 31, 69, "1er Dan", false, false, true, false, false, true],
  ["SIMON", "Alexandre", "Nanbudo Toulouse", "Homme", 27, 82, "2e Dan", true, false, false, true, false, false],
  ["GARCIA", "Camille", "Nanbudo Paris", "Femme", 24, 55, "1er Dan", true, false, false, true, false, false],
  ["DAVID", "Manon", "Nanbudo Marseille", "Femme", 28, 58, "2e Dan", false, true, false, false, true, false],
  ["BERTRAND", "Julie", "Nanbudo Lyon", "Femme", 32, 56, "1er Dan", false, false, true, false, false, true],
  ["ROUX", "Clara", "Nanbudo Toulouse", "Femme", 26, 66, "1er Dan", true, false, false, true, false, false],
  ["GIRARD", "Philippe", "Nanbudo Paris", "Homme", 44, 78, "2e Dan", true, false, false, true, false, false],
  ["ANDRE", "Laurent", "Nanbudo Marseille", "Homme", 48, 81, "3e Dan", false, true, false, false, true, false],
  ["MERCIER", "Stéphane", "Nanbudo Lyon", "Homme", 52, 83, "2e Dan", false, false, true, false, false, true],
  ["BONNET", "Sophie", "Nanbudo Marseille", "Femme", 43, 60, "2e Dan", true, false, false, true, false, false],
  ["FRANCOIS", "Nathalie", "Nanbudo Paris", "Femme", 49, 63, "3e Dan", false, true, false, false, true, false],
  ["MARTINEZ", "Isabelle", "Nanbudo Toulouse", "Femme", 51, 61, "2e Dan", false, false, true, false, false, true],
];

export function buildCompetitionTestCompetitors(currentYear, idPrefix = Date.now()) {
  return COMPETITION_TEST_COMPETITORS.map(
    (
      [
        nom,
        prenom,
        club,
        sexe,
        age,
        poids,
        grade,
        kata0,
        kata1,
        kata2,
        randori,
        juRandori1,
        juRandori2,
      ],
      index
    ) => ({
      id: `${idPrefix}-test-${index}`,
      nom,
      prenom,
      club,
      sexe,
      dateNaissance: `${currentYear - age}-01-01`,
      age,
      poids,
      grade,
      epreuves: {
        kata0,
        kata1,
        kata2,
        randori,
        juRandori1,
        juRandori2,
      },
      testData: true,
    })
  );
}
