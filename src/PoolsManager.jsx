import { useState } from "react";

const EVENT_LABELS = {
  kata0: "Kata 0 — Shihotai",
  kata1: "Kata 1",
  kata2: "Kata 2",
  randori: "Randori",
  juRandori1: "Ju Randori 1",
  juRandori2: "Ju Randori 2",
};

const AGE_CLASS_ORDER = {
  Enfant: 1,
  Junior: 2,
  Senior: 3,
  Vétéran: 4,
};

function PoolsManager({
  competition,
  onUpdateCompetition,
}) {
  const categories = competition.categories || [];
  const competitors = competition.competitors || [];
  const pools = competition.pools || [];

  const [selectedCategoryId, setSelectedCategoryId] =
    useState("");

  /*
   * =========================================================
   * OUTILS
   * =========================================================
   */

  function sameId(a, b) {
    return String(a) === String(b);
  }

  function makeId(prefix = "id") {
    if (
      typeof crypto !== "undefined" &&
      typeof crypto.randomUUID === "function"
    ) {
      return `${prefix}-${crypto.randomUUID()}`;
    }

    return `${prefix}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}`;
  }

  function getCompetitor(id) {
    return competitors.find((competitor) =>
      sameId(competitor.id, id)
    );
  }

  function getCategory(id) {
    return categories.find((category) =>
      sameId(category.id, id)
    );
  }

  function getEventLabel(eventType) {
    return (
      EVENT_LABELS[eventType] ||
      eventType ||
      "Épreuve"
    );
  }

  function isKata(eventType) {
    return ["kata0", "kata1", "kata2"].includes(
      eventType
    );
  }

  function isJuRandori(eventType) {
    return (
      eventType === "juRandori1" ||
      eventType === "juRandori2"
    );
  }

  function normalizeSex(sex) {
    const value = String(sex || "")
      .trim()
      .toLowerCase();

    if (
      value === "homme" ||
      value === "h" ||
      value === "masculin" ||
      value === "m"
    ) {
      return "Homme";
    }

    if (
      value === "femme" ||
      value === "f" ||
      value === "féminin" ||
      value === "feminin"
    ) {
      return "Femme";
    }

    return sex || "Non renseigné";
  }

  function getAge(competitor) {
    if (
      competitor.age !== "" &&
      competitor.age !== undefined &&
      competitor.age !== null
    ) {
      const age = Number(competitor.age);

      if (Number.isFinite(age)) {
        return age;
      }
    }

    if (!competitor.dateNaissance) {
      return null;
    }

    const birthDate = new Date(
      competitor.dateNaissance
    );

    if (Number.isNaN(birthDate.getTime())) {
      return null;
    }

    const referenceDate = competition.date
      ? new Date(competition.date)
      : new Date();

    if (
      Number.isNaN(
        referenceDate.getTime()
      )
    ) {
      return null;
    }

    let age =
      referenceDate.getFullYear() -
      birthDate.getFullYear();

    const monthDifference =
      referenceDate.getMonth() -
      birthDate.getMonth();

    if (
      monthDifference < 0 ||
      (monthDifference === 0 &&
        referenceDate.getDate() <
          birthDate.getDate())
    ) {
      age -= 1;
    }

    return age >= 0 ? age : null;
  }

  function getAgeClass(age) {
    if (age === null) {
      return null;
    }

    if (age < 14) {
      return "Enfant";
    }

    if (age <= 17) {
      return "Junior";
    }

    if (age <= 39) {
      return "Senior";
    }

    return "Vétéran";
  }

  function getCombatFamily(age) {
    if (age === null) {
      return null;
    }

    return age < 10
      ? "randori"
      : "juRandori";
  }

  function poolExistsForCategory(categoryId) {
    return pools.some((pool) =>
      sameId(pool.categoryId, categoryId)
    );
  }

  /*
   * =========================================================
   * VALIDATION D'UNE CATÉGORIE AVANT CRÉATION DE LA POULE
   * =========================================================
   */

  function validateCategoryForPool(category) {
    const competitorIds =
      category.competitorIds || [];

    if (competitorIds.length < 2) {
      return {
        valid: false,
        message:
          "Il faut au moins 2 compétiteurs pour créer une poule.",
      };
    }

    const categoryCompetitors =
      competitorIds
        .map((id) => getCompetitor(id))
        .filter(Boolean);

    if (
      categoryCompetitors.length !==
      competitorIds.length
    ) {
      return {
        valid: false,
        message:
          "Un ou plusieurs compétiteurs de cette catégorie sont introuvables. Vérifie la liste des participants.",
      };
    }

    const ageClasses = [
      ...new Set(
        categoryCompetitors
          .map((competitor) =>
            getAgeClass(
              getAge(competitor)
            )
          )
          .filter(Boolean)
      ),
    ];

    if (ageClasses.length > 1) {
      return {
        valid: false,
        message:
          "Cette catégorie mélange plusieurs classes d'âge. Enfant, Junior, Senior et Vétéran doivent rester séparés.",
      };
    }

    const sexes = [
      ...new Set(
        categoryCompetitors
          .map((competitor) =>
            normalizeSex(
              competitor.sexe
            )
          )
          .filter(
            (sex) =>
              sex === "Homme" ||
              sex === "Femme"
          )
      ),
    ];

    /*
     * Une catégorie mixte peut avoir été créée
     * manuellement avec dérogation Commission.
     *
     * On ne la bloque donc pas ici.
     */

    if (
      sexes.length > 1 &&
      !category.derogation
    ) {
      return {
        valid: false,
        message:
          "Cette catégorie mélange masculin et féminin sans dérogation enregistrée.",
      };
    }

    if (
      category.epreuve === "randori"
    ) {
      const invalid = categoryCompetitors.some(
        (competitor) => {
          const age =
            getAge(competitor);

          return (
            age === null ||
            getCombatFamily(age) !==
              "randori"
          );
        }
      );

      if (invalid) {
        return {
          valid: false,
          message:
            "Randori est réservé aux compétiteurs de moins de 10 ans. Vérifie l'âge des participants.",
        };
      }
    }

    if (
      isJuRandori(
        category.epreuve
      )
    ) {
      const invalid = categoryCompetitors.some(
        (competitor) => {
          const age =
            getAge(competitor);

          return (
            age === null ||
            getCombatFamily(age) !==
              "juRandori"
          );
        }
      );

      if (invalid) {
        return {
          valid: false,
          message:
            "Ju Randori est réservé aux compétiteurs de 10 ans et plus. Vérifie l'âge des participants.",
        };
      }
    }

    return {
      valid: true,
      competitors:
        categoryCompetitors,
    };
  }

  /*
   * =========================================================
   * COMBAT — RENCONTRES
   * =========================================================
   */

 function generateMatches(competitorIds) {
  if (competitorIds.length < 2) {
    return [];
  }

  const players = [...competitorIds];

  const ghost = "__BYE__";

  if (players.length % 2 !== 0) {
    players.push(ghost);
  }

  const rounds = [];
  const rotation = [...players];

  const roundsCount = rotation.length - 1;

  for (let round = 0; round < roundsCount; round++) {
    const currentRound = [];

    for (let i = 0; i < rotation.length / 2; i++) {
      const a = rotation[i];
      const b = rotation[rotation.length - 1 - i];

      if (a !== ghost && b !== ghost) {
        currentRound.push({
          id: makeId("match"),

          akaId: a,
          shiroId: b,

          akaScore: null,
          shiroScore: null,

          pointsNegatifsAka: 0,
          pointsNegatifsShiro: 0,

          winnerId: null,

          statut: "À jouer",
        });
      }
    }

    rounds.push(...currentRound);

    const fixed = rotation[0];

    const moving = rotation.slice(1);

    moving.unshift(moving.pop());

    rotation.splice(
      0,
      rotation.length,
      fixed,
      ...moving
    );
  }

  return rounds;
}  /*
   * =========================================================
   * COMBAT — CLASSEMENT
   * =========================================================
   *
   * 1. Nombre de victoires
   * 2. Moins de points négatifs
   * 3. Rencontre directe
   * 4. Départage réglementaire enregistré
   *
   * La différence de score et le score marqué
   * ne servent PAS à inventer un départage.
   * =========================================================
   */

  function getDirectMatch(
    matches,
    competitorAId,
    competitorBId
  ) {
    return matches.find(
      (match) =>
        match.statut === "Terminé" &&
        ((sameId(
          match.akaId,
          competitorAId
        ) &&
          sameId(
            match.shiroId,
            competitorBId
          )) ||
          (sameId(
            match.akaId,
            competitorBId
          ) &&
            sameId(
              match.shiroId,
              competitorAId
            )))
    );
  }

  function getSavedPoolTieBreakWinner(
    pool,
    competitorAId,
    competitorBId
  ) {
    const tieBreaks =
      pool.combatTieBreaks || [];

    const tieBreak = tieBreaks.find(
      (item) => {
        const ids =
          item.competitorIds || [];

        return (
          ids.length === 2 &&
          ids.some((id) =>
            sameId(
              id,
              competitorAId
            )
          ) &&
          ids.some((id) =>
            sameId(
              id,
              competitorBId
            )
          )
        );
      }
    );

    if (
      !tieBreak ||
      tieBreak.statut !== "Terminé" ||
      !tieBreak.winnerId
    ) {
      return null;
    }

    return tieBreak.winnerId;
  }

  function calculateCombatRanking(pool) {
    const competitorIds =
      pool.competitorIds || [];

    const matches =
      pool.matches || [];

    const ranking =
      competitorIds.map((id) => ({
        competitorId: id,

        victories: 0,
        defeats: 0,
        draws: 0,

        scoreFor: 0,
        scoreAgainst: 0,

        difference: 0,

        negativePoints: 0,
      }));

    matches.forEach((match) => {
      if (
        match.statut !== "Terminé"
      ) {
        return;
      }

      const aka = ranking.find(
        (item) =>
          sameId(
            item.competitorId,
            match.akaId
          )
      );

      const shiro = ranking.find(
        (item) =>
          sameId(
            item.competitorId,
            match.shiroId
          )
      );

      if (!aka || !shiro) {
        return;
      }

      const akaScore =
        Number(match.akaScore) || 0;

      const shiroScore =
        Number(match.shiroScore) || 0;

      aka.scoreFor += akaScore;
      aka.scoreAgainst +=
        shiroScore;

      shiro.scoreFor +=
        shiroScore;
      shiro.scoreAgainst +=
        akaScore;

      aka.negativePoints +=
        Number(
          match.pointsNegatifsAka
        ) || 0;

      shiro.negativePoints +=
        Number(
          match.pointsNegatifsShiro
        ) || 0;

      if (
        sameId(
          match.winnerId,
          match.akaId
        )
      ) {
        aka.victories += 1;
        shiro.defeats += 1;
      } else if (
        sameId(
          match.winnerId,
          match.shiroId
        )
      ) {
        shiro.victories += 1;
        aka.defeats += 1;
      } else {
        aka.draws += 1;
        shiro.draws += 1;
      }
    });

    ranking.forEach((item) => {
      item.difference =
        item.scoreFor -
        item.scoreAgainst;
    });

    ranking.sort((a, b) => {
      if (
        b.victories !==
        a.victories
      ) {
        return (
          b.victories -
          a.victories
        );
      }

      if (
        a.negativePoints !==
        b.negativePoints
      ) {
        return (
          a.negativePoints -
          b.negativePoints
        );
      }

      const confrontation =
        getDirectMatch(
          matches,
          a.competitorId,
          b.competitorId
        );

      if (
        confrontation &&
        sameId(
          confrontation.winnerId,
          a.competitorId
        )
      ) {
        return -1;
      }

      if (
        confrontation &&
        sameId(
          confrontation.winnerId,
          b.competitorId
        )
      ) {
        return 1;
      }

      const tieBreakWinner =
        getSavedPoolTieBreakWinner(
          pool,
          a.competitorId,
          b.competitorId
        );

      if (
        tieBreakWinner &&
        sameId(
          tieBreakWinner,
          a.competitorId
        )
      ) {
        return -1;
      }

      if (
        tieBreakWinner &&
        sameId(
          tieBreakWinner,
          b.competitorId
        )
      ) {
        return 1;
      }

      return 0;
    });

    return ranking;
  }

  /*
   * =========================================================
   * DÉTECTION DES ÉGALITÉS
   * =========================================================
   */

  function competitorsNeedTieBreak(
    pool,
    competitorA,
    competitorB
  ) {
    if (
      !competitorA ||
      !competitorB
    ) {
      return false;
    }

    if (
      competitorA.victories !==
      competitorB.victories
    ) {
      return false;
    }

    if (
      competitorA.negativePoints !==
      competitorB.negativePoints
    ) {
      return false;
    }

    const savedWinner =
      getSavedPoolTieBreakWinner(
        pool,
        competitorA.competitorId,
        competitorB.competitorId
      );

    if (savedWinner) {
      return false;
    }

    const confrontation =
      getDirectMatch(
        pool.matches || [],
        competitorA.competitorId,
        competitorB.competitorId
      );

    if (
      confrontation?.winnerId &&
      (sameId(
        confrontation.winnerId,
        competitorA.competitorId
      ) ||
        sameId(
          confrontation.winnerId,
          competitorB.competitorId
        ))
    ) {
      return false;
    }

    return true;
  }

  function getCombatTieBreaksNeeded(pool) {
    if (
      !combatPoolIsFinished(pool)
    ) {
      return [];
    }

    const ranking =
      calculateCombatRanking(pool);

    const ties = [];

    for (
      let i = 0;
      i < ranking.length;
      i++
    ) {
      for (
        let j = i + 1;
        j < ranking.length;
        j++
      ) {
        const a = ranking[i];
        const b = ranking[j];

        if (
          competitorsNeedTieBreak(
            pool,
            a,
            b
          )
        ) {
          ties.push({
            competitorAId:
              a.competitorId,

            competitorBId:
              b.competitorId,

            victories:
              a.victories,

            negativePoints:
              a.negativePoints,
          });
        }
      }
    }

    return ties;
  }

  function combatRankingIsResolved(pool) {
    return (
      getCombatTieBreaksNeeded(pool)
        .length === 0
    );
  }

  function combatPoolIsFinished(pool) {
    const matches =
      pool.matches || [];

    return (
      matches.length > 0 &&
      matches.every(
        (match) =>
          match.statut ===
          "Terminé"
      )
    );
  }

  /*
   * =========================================================
   * KATA
   * =========================================================
   */

  function generateKataPassages(competitorIds) {
  const passages = [];

  const firstRound = [...competitorIds];

  const offset = Math.floor(
    competitorIds.length / 2
  );

  const secondRound =
    competitorIds.map((_, index) => {
      return competitorIds[
        (index + offset) %
          competitorIds.length
      ];
    });

  firstRound.forEach((competitorId) => {
    passages.push({
      id: makeId("kata-passage-1"),

      competitorId,

      numero: 1,

      notes: [
        null,
        null,
        null,
        null,
        null,
      ],

      noteMinRetiree: null,
      noteMaxRetiree: null,

      score: null,

      statut: "À noter",
    });
  });

  secondRound.forEach((competitorId) => {
    passages.push({
      id: makeId("kata-passage-2"),

      competitorId,

      numero: 2,

      notes: [
        null,
        null,
        null,
        null,
        null,
      ],

      noteMinRetiree: null,
      noteMaxRetiree: null,

      score: null,

      statut: "À noter",
    });
  });

  return passages;
}
  function getKataPassage(
    pool,
    competitorId,
    numero
  ) {
    return (
      pool.passages || []
    ).find(
      (passage) =>
        sameId(
          passage.competitorId,
          competitorId
        ) &&
        Number(passage.numero) ===
          Number(numero)
    );
  }

  function calculateKataRanking(pool) {
    const competitorIds =
      pool.competitorIds || [];

    const ranking =
      competitorIds.map(
        (competitorId) => {
          const passage1 =
            getKataPassage(
              pool,
              competitorId,
              1
            );

          const passage2 =
            getKataPassage(
              pool,
              competitorId,
              2
            );

          const scorePassage1 =
            passage1?.statut ===
            "Terminé"
              ? Number(
                  passage1.score
                ) || 0
              : 0;

          const scorePassage2 =
            passage2?.statut ===
            "Terminé"
              ? Number(
                  passage2.score
                ) || 0
              : 0;

          const passagesTermines =
            Number(
              passage1?.statut ===
                "Terminé"
            ) +
            Number(
              passage2?.statut ===
                "Terminé"
            );

          return {
            competitorId,

            passage1:
              scorePassage1,

            passage2:
              scorePassage2,

            total:
              scorePassage1 +
              scorePassage2,

            passagesTermines,
          };
        }
      );

    ranking.sort((a, b) => {
      if (
        b.passagesTermines !==
        a.passagesTermines
      ) {
        return (
          b.passagesTermines -
          a.passagesTermines
        );
      }

      if (b.total !== a.total) {
        return b.total - a.total;
      }

      const bestA =
        Math.max(
          a.passage1,
          a.passage2
        );

      const bestB =
        Math.max(
          b.passage1,
          b.passage2
        );

      return bestB - bestA;
    });

    return ranking;
  }

  function kataPoolIsFinished(pool) {
    const passages =
      pool.passages || [];

    return (
      passages.length > 0 &&
      passages.every(
        (passage) =>
          passage.statut ===
          "Terminé"
      )
    );
  }

  /*
   * =========================================================
   * ÉTAT DE LA POULE
   * =========================================================
   */

  function poolIsFinished(pool) {
    const category =
      getCategory(
        pool.categoryId
      );

    const eventType =
      category?.epreuve ||
      pool.epreuve;

    if (isKata(eventType)) {
      return kataPoolIsFinished(
        pool
      );
    }

    return combatPoolIsFinished(
      pool
    );
  }

  /*
   * =========================================================
   * CRÉATION
   * =========================================================
   */

  function createPool() {
    if (!selectedCategoryId) {
      alert(
        "Sélectionne une catégorie."
      );
      return;
    }

    const category =
      getCategory(
        selectedCategoryId
      );

    if (!category) {
      alert(
        "Catégorie introuvable."
      );
      return;
    }

    if (
      poolExistsForCategory(
        category.id
      )
    ) {
      alert(
        "Une poule existe déjà pour cette catégorie."
      );
      return;
    }

    const validation =
      validateCategoryForPool(
        category
      );

    if (!validation.valid) {
      alert(validation.message);
      return;
    }

    const competitorIds =
      category.competitorIds || [];

    const kata =
      isKata(
        category.epreuve
      );

    const newPool = {
      id: makeId("pool"),

      categoryId:
        category.id,

      epreuve:
        category.epreuve,

      epreuveLabel:
        getEventLabel(
          category.epreuve
        ),

      type: kata
        ? "kata"
        : "combat",

      nom: `Poule - ${category.nom}`,

      competitorIds: [
        ...competitorIds,
      ],

      ageClass:
        category.ageClass ||
        getAgeClass(
          getAge(
            validation.competitors[0]
          )
        ),

      sexe:
        category.sexe ||
        normalizeSex(
          validation.competitors[0]
            ?.sexe
        ),

      matches: kata
        ? []
        : generateMatches(
            competitorIds
          ),

      passages: kata
        ? generateKataPassages(
            competitorIds
          )
        : [],

      combatTieBreaks: [],

      statut: "Prête",

      closingMode: "",

      rankingLocked: [],

      finalMatches: [],

      finalPassages: [],

      podium: null,
    };

    onUpdateCompetition({
      ...competition,

      pools: [
        ...pools,
        newPool,
      ],
    });

    setSelectedCategoryId("");
  }

  function deletePool(id) {
    const pool =
      pools.find((item) =>
        sameId(item.id, id)
      );

    if (!pool) {
      return;
    }

    const hasResults =
      (pool.matches || []).some(
        (match) =>
          match.statut ===
          "Terminé"
      ) ||
      (pool.passages || []).some(
        (passage) =>
          passage.statut ===
          "Terminé"
      ) ||
      (pool.finalMatches || []).some(
        (match) =>
          match.statut ===
          "Terminé"
      ) ||
      (pool.finalPassages || []).some(
        (passage) =>
          passage.statut ===
          "Terminé"
      ) ||
      (pool.combatTieBreaks || [])
        .length > 0;

    const message = hasResults
      ? "Cette poule contient déjà des résultats ou des données d'arbitrage. La supprimer effacera toutes ces données. Confirmer la suppression ?"
      : "Supprimer cette poule et toutes ses données ?";

    const confirmed =
      window.confirm(message);

    if (!confirmed) {
      return;
    }

    onUpdateCompetition({
      ...competition,

      pools: pools.filter(
        (poolItem) =>
          !sameId(
            poolItem.id,
            id
          )
      ),
    });
  }

  /*
   * =========================================================
   * CLÔTURE
   * =========================================================
   */

  function chooseClosingMode(
    poolId,
    mode
  ) {
    const pool =
      pools.find((item) =>
        sameId(
          item.id,
          poolId
        )
      );

    if (!pool) {
      return;
    }

    if (
      (pool.finalMatches || [])
        .length > 0 ||
      (pool.finalPassages || [])
        .length > 0
    ) {
      alert(
        "La phase finale a déjà été générée."
      );
      return;
    }

    const category =
      getCategory(
        pool.categoryId
      );

    const eventType =
      category?.epreuve ||
      pool.epreuve;

    if (
      !isKata(eventType) &&
      combatPoolIsFinished(pool) &&
      !combatRankingIsResolved(pool)
    ) {
      alert(
        "Le classement comporte encore une égalité. Effectue d'abord le départage réglementaire dans l'arbitrage."
      );

      return;
    }

    const updatedPools =
      pools.map((item) =>
        sameId(
          item.id,
          poolId
        )
          ? {
              ...item,
              closingMode: mode,
            }
          : item
      );

    onUpdateCompetition({
      ...competition,
      pools: updatedPools,
    });
  }

  function validateClosing(pool) {
    if (!poolIsFinished(pool)) {
      const category =
        getCategory(
          pool.categoryId
        );

      if (
        isKata(
          category?.epreuve ||
            pool.epreuve
        )
      ) {
        alert(
          "Les deux passages de tous les compétiteurs doivent être notés."
        );
      } else {
        alert(
          "Toutes les rencontres de la poule doivent être terminées."
        );
      }

      return;
    }

    const category =
      getCategory(
        pool.categoryId
      );

    const eventType =
      category?.epreuve ||
      pool.epreuve;

    const kata =
      isKata(eventType);

    if (
      !kata &&
      !combatRankingIsResolved(
        pool
      )
    ) {
      alert(
        "Impossible de clôturer cette poule : un départage réglementaire est nécessaire. Va dans Arbitrage pour effectuer le départage avant de valider le classement."
      );

      return;
    }

    if (!pool.closingMode) {
      alert(
        "Choisis un mode de clôture."
      );
      return;
    }

    const ranking = kata
      ? calculateKataRanking(
          pool
        )
      : calculateCombatRanking(
          pool
        );

    /*
     * =====================================================
     * CLASSEMENT DIRECT
     * =====================================================
     */

    if (
      pool.closingMode ===
      "direct"
    ) {
      const podium = {
        firstId:
          ranking[0]
            ?.competitorId ||
          null,

        secondId:
          ranking[1]
            ?.competitorId ||
          null,

        thirdId:
          ranking[2]
            ?.competitorId ||
          null,

        fourthId:
          ranking[3]
            ?.competitorId ||
          null,
      };

      const updatedPools =
        pools.map((item) =>
          sameId(
            item.id,
            pool.id
          )
            ? {
                ...item,

                rankingLocked:
                  ranking,

                podium,

                statut:
                  "Terminée",
              }
            : item
        );

      onUpdateCompetition({
        ...competition,
        pools: updatedPools,
      });

      return;
    }

    /*
     * =====================================================
     * PHASE FINALE
     * =====================================================
     */

    if (
      pool.closingMode ===
      "finals"
    ) {
      if (ranking.length < 4) {
        alert(
          "Il faut au moins 4 compétiteurs pour organiser une finale et une petite finale."
        );

        return;
      }

      /*
       * ===================================================
       * KATA
       * ===================================================
       */

      if (kata) {
        const finalPassages = [
          {
            id: makeId(
              "kata-final-1"
            ),

            type: "finale",

            label: "Finale",

            competitorId:
              ranking[0]
                .competitorId,

            notes: [
              null,
              null,
              null,
              null,
              null,
            ],

            noteMinRetiree: null,
            noteMaxRetiree: null,

            score: null,

            statut: "À noter",
          },

          {
            id: makeId(
              "kata-final-2"
            ),

            type: "finale",

            label: "Finale",

            competitorId:
              ranking[1]
                .competitorId,

            notes: [
              null,
              null,
              null,
              null,
              null,
            ],

            noteMinRetiree: null,
            noteMaxRetiree: null,

            score: null,

            statut: "À noter",
          },

          {
            id: makeId(
              "kata-bronze-1"
            ),

            type:
              "petite-finale",

            label:
              "Petite finale",

            competitorId:
              ranking[2]
                .competitorId,

            notes: [
              null,
              null,
              null,
              null,
              null,
            ],

            noteMinRetiree: null,
            noteMaxRetiree: null,

            score: null,

            statut: "À noter",
          },

          {
            id: makeId(
              "kata-bronze-2"
            ),

            type:
              "petite-finale",

            label:
              "Petite finale",

            competitorId:
              ranking[3]
                .competitorId,

            notes: [
              null,
              null,
              null,
              null,
              null,
            ],

            noteMinRetiree: null,
            noteMaxRetiree: null,

            score: null,

            statut: "À noter",
          },
        ];

        const updatedPools =
          pools.map((item) =>
            sameId(
              item.id,
              pool.id
            )
              ? {
                  ...item,

                  rankingLocked:
                    ranking,

                  finalPassages,

                  finalMatches: [],

                  podium: null,

                  statut:
                    "Phase finale",
                }
              : item
          );

        onUpdateCompetition({
          ...competition,
          pools: updatedPools,
        });

        return;
      }

      /*
       * ===================================================
       * COMBAT
       * ===================================================
       */

      const finalMatches = [
        {
          id: makeId(
            "combat-final"
          ),

          type: "finale",

          label: "Finale",

          akaId:
            ranking[0]
              .competitorId,

          shiroId:
            ranking[1]
              .competitorId,

          akaScore: null,
          shiroScore: null,

          pointsNegatifsAka: 0,
          pointsNegatifsShiro: 0,

          winnerId: null,

          statut: "À jouer",
        },

        {
          id: makeId(
            "combat-bronze"
          ),

          type:
            "petite-finale",

          label:
            "Petite finale",

          akaId:
            ranking[2]
              .competitorId,

          shiroId:
            ranking[3]
              .competitorId,

          akaScore: null,
          shiroScore: null,

          pointsNegatifsAka: 0,
          pointsNegatifsShiro: 0,

          winnerId: null,

          statut: "À jouer",
        },
      ];

      const updatedPools =
        pools.map((item) =>
          sameId(
            item.id,
            pool.id
          )
            ? {
                ...item,

                rankingLocked:
                  ranking,

                finalMatches,

                finalPassages: [],

                podium: null,

                statut:
                  "Phase finale",
              }
            : item
        );

      onUpdateCompetition({
        ...competition,
        pools: updatedPools,
      });
    }
  }

  /*
   * =========================================================
   * CATÉGORIES DISPONIBLES
   * =========================================================
   */

  const availableCategories =
    categories
      .filter(
        (category) =>
          !poolExistsForCategory(
            category.id
          )
      )
      .sort((a, b) => {
        const orderA =
          AGE_CLASS_ORDER[
            a.ageClass
          ] || 99;

        const orderB =
          AGE_CLASS_ORDER[
            b.ageClass
          ] || 99;

        if (orderA !== orderB) {
          return orderA - orderB;
        }

        return String(
          a.nom || ""
        ).localeCompare(
          String(b.nom || ""),
          "fr"
        );
      });

  /*
   * =========================================================
   * AFFICHAGE
   * =========================================================
   */

  return (
    <div className="pools-manager">
      <div className="manager-header">
        <div>
          <p className="surtitle">
            ORGANISATION
          </p>

          <h2>Poules</h2>

          <p>
            Organisation des épreuves
            à partir des catégories
            créées.
          </p>
        </div>

        <div className="category-total">
          <strong>
            {pools.length}
          </strong>

          <span>
            poule
            {pools.length > 1
              ? "s"
              : ""}
          </span>
        </div>
      </div>

      <div className="beta-note">
        <strong>
          Organisation des poules
        </strong>

        <p>
          Une poule reprend exactement les
          compétiteurs de la catégorie validée.
          Les classes Enfant, Junior, Senior et
          Vétéran restent séparées. Randori est
          réservé aux moins de 10 ans et Ju Randori
          aux compétiteurs de 10 ans et plus.
        </p>
      </div>

      {categories.length === 0 ? (
        <div className="empty-state">
          <h3>
            Aucune catégorie disponible
          </h3>

          <p>
            Crée d'abord les catégories
            avant de générer les poules.
          </p>
        </div>
      ) : (
        <div className="competition-form">
          <h3>
            Créer une poule
          </h3>

          {availableCategories.length ===
          0 ? (
            <div className="beta-note">
              <strong>
                Toutes les catégories
                sont organisées
              </strong>

              <p>
                Une poule a déjà été
                générée pour chaque
                catégorie.
              </p>
            </div>
          ) : (
            <>
              <label>
                Catégorie

                <select
                  value={
                    selectedCategoryId
                  }
                  onChange={(event) =>
                    setSelectedCategoryId(
                      event.target.value
                    )
                  }
                >
                  <option value="">
                    Sélectionner une catégorie
                  </option>

                  {availableCategories.map(
                    (category) => (
                      <option
                        key={category.id}
                        value={category.id}
                      >
                        {getEventLabel(
                          category.epreuve
                        )}
                        {" — "}
                        {category.nom}
                        {category.ageClass
                          ? ` — ${category.ageClass}`
                          : ""}
                        {category.sexe
                          ? ` — ${category.sexe}`
                          : ""}
                        {" — "}
                        {category
                          .competitorIds
                          ?.length ||
                          0}{" "}
                        compétiteurs
                      </option>
                    )
                  )}
                </select>
              </label>

              <button
                className="primary"
                type="button"
                onClick={
                  createPool
                }
              >
                Générer la poule
              </button>
            </>
          )}
        </div>
      )}

      <section className="category-section">
        <div className="category-section-header">
          <div>
            <p className="surtitle">
              ÉPREUVES
            </p>

            <h3>
              Poules générées
            </h3>
          </div>
        </div>

        {pools.length === 0 ? (
          <div className="empty-state">
            <h3>
              Aucune poule
            </h3>

            <p>
              Sélectionne une catégorie
              pour commencer.
            </p>
          </div>
        ) : (
          <div className="competition-list">
            {pools.map((pool) => {
              const category =
                getCategory(
                  pool.categoryId
                );

              const eventType =
                category?.epreuve ||
                pool.epreuve;

              const kata =
                isKata(eventType);

              const ranking = kata
                ? calculateKataRanking(
                    pool
                  )
                : calculateCombatRanking(
                    pool
                  );

              const finished =
                poolIsFinished(
                  pool
                );

              const tieBreaksNeeded =
                !kata && finished
                  ? getCombatTieBreaksNeeded(
                      pool
                    )
                  : [];

              const rankingResolved =
                kata ||
                !finished ||
                tieBreaksNeeded.length ===
                  0;

              return (
                <article
                  className="competition"
                  key={pool.id}
                >
                  <div>
                    <p className="surtitle">
                      {getEventLabel(
                        eventType
                      )}
                    </p>

                    <h3>
                      {pool.nom}
                    </h3>

                    <p>
                      {pool
                        .competitorIds
                        ?.length ||
                        0}{" "}
                      compétiteur
                      {(pool
                        .competitorIds
                        ?.length ||
                        0) > 1
                        ? "s"
                        : ""}

                      {(category?.ageClass ||
                        pool.ageClass)
                        ? ` · ${
                            category?.ageClass ||
                            pool.ageClass
                          }`
                        : ""}

                      {(category?.sexe ||
                        pool.sexe)
                        ? ` · ${
                            category?.sexe ||
                            pool.sexe
                          }`
                        : ""}
                    </p>

                    <div className="competitor-events">
                      {pool.competitorIds?.map(
                        (id) => {
                          const competitor =
                            getCompetitor(
                              id
                            );

                          if (!competitor) {
                            return null;
                          }

                          const age =
                            getAge(
                              competitor
                            );

                          return (
                            <span key={id}>
                              {competitor.nom}{" "}
                              {competitor.prenom}
                              {age !== null
                                ? ` · ${age} ans`
                                : ""}
                            </span>
                          );
                        }
                      )}
                    </div>

                    {/* ======================
                        KATA
                    ====================== */}

                    {kata && (
                      <>
                        <div className="beta-note">
                          <strong>
                            Déroulement Kata
                          </strong>

                          <p>
                            Chaque compétiteur
                            effectue deux passages.
                            Chaque passage est noté
                            par 5 juges. La note la
                            plus haute et la plus
                            basse sont retirées.
                          </p>
                        </div>

                        <div className="pool-matches">
                          <h3>
                            Passages
                          </h3>

                          {pool.competitorIds?.map(
                            (competitorId) => {
                              const competitor =
                                getCompetitor(
                                  competitorId
                                );

                              if (!competitor) {
                                return null;
                              }

                              const passage1 =
                                getKataPassage(
                                  pool,
                                  competitorId,
                                  1
                                );

                              const passage2 =
                                getKataPassage(
                                  pool,
                                  competitorId,
                                  2
                                );

                              return (
                                <div
                                  className="pool-match"
                                  key={
                                    competitorId
                                  }
                                >
                                  <strong>
                                    {competitor.nom}{" "}
                                    {competitor.prenom}
                                  </strong>

                                  <span>
                                    Passage 1
                                    {" — "}
                                    {passage1?.statut ||
                                      "À noter"}

                                    {passage1?.statut ===
                                      "Terminé" &&
                                      ` — ${Number(
                                        passage1.score
                                      ).toFixed(
                                        1
                                      )}`}
                                  </span>

                                  <span>
                                    Passage 2
                                    {" — "}
                                    {passage2?.statut ||
                                      "À noter"}

                                    {passage2?.statut ===
                                      "Terminé" &&
                                      ` — ${Number(
                                        passage2.score
                                      ).toFixed(
                                        1
                                      )}`}
                                  </span>
                                </div>
                              );
                            }
                          )}
                        </div>

                        <div className="pool-ranking">
                          <h3>
                            Classement Kata
                          </h3>

                          <div className="ranking-table">
                            <div className="ranking-header">
                              <span>
                                Place
                              </span>

                              <span>
                                Compétiteur
                              </span>

                              <span>P1</span>
                              <span>P2</span>

                              <span>
                                Total
                              </span>
                            </div>

                            {ranking.map(
                              (
                                item,
                                index
                              ) => {
                                const competitor =
                                  getCompetitor(
                                    item.competitorId
                                  );

                                if (!competitor) {
                                  return null;
                                }

                                return (
                                  <div
                                    className="ranking-row"
                                    key={
                                      item.competitorId
                                    }
                                  >
                                    <strong>
                                      {index + 1}
                                    </strong>

                                    <strong>
                                      {competitor.nom}{" "}
                                      {competitor.prenom}
                                    </strong>

                                    <span>
                                      {getKataPassage(
                                        pool,
                                        item.competitorId,
                                        1
                                      )?.statut ===
                                      "Terminé"
                                        ? item.passage1.toFixed(
                                            1
                                          )
                                        : "—"}
                                    </span>

                                    <span>
                                      {getKataPassage(
                                        pool,
                                        item.competitorId,
                                        2
                                      )?.statut ===
                                      "Terminé"
                                        ? item.passage2.toFixed(
                                            1
                                          )
                                        : "—"}
                                    </span>

                                    <strong>
                                      {item.passagesTermines ===
                                      2
                                        ? item.total.toFixed(
                                            1
                                          )
                                        : "—"}
                                    </strong>
                                  </div>
                                );
                              }
                            )}
                          </div>
                        </div>
                      </>
                    )}

                    {/* ======================
                        COMBAT
                    ====================== */}

                    {!kata && (
                      <>
                        <div className="pool-matches">
                          <h3>
                            Rencontres
                          </h3>

                          {(pool.matches ||
                            []).map(
                            (
                              match,
                              index
                            ) => {
                              const aka =
                                getCompetitor(
                                  match.akaId
                                );

                              const shiro =
                                getCompetitor(
                                  match.shiroId
                                );

                              const winner =
                                match.winnerId
                                  ? getCompetitor(
                                      match.winnerId
                                    )
                                  : null;

                              return (
                                <div
                                  className="pool-match"
                                  key={
                                    match.id
                                  }
                                >
                                  <strong>
                                    Rencontre{" "}
                                    {index + 1}
                                  </strong>

                                  <span>
                                    🔴 AKA —{" "}
                                    {aka
                                      ? `${aka.nom} ${aka.prenom}`
                                      : "Inconnu"}
                                  </span>

                                  <span className="match-vs">
                                    VS
                                  </span>

                                  <span>
                                    ⚪ SHIRO —{" "}
                                    {shiro
                                      ? `${shiro.nom} ${shiro.prenom}`
                                      : "Inconnu"}
                                  </span>

                                  {match.statut ===
                                    "Terminé" && (
                                    <span>
                                      {match.akaScore ??
                                        0}
                                      {" — "}
                                      {match.shiroScore ??
                                        0}
                                      {" · "}
                                      {winner
                                        ? `Vainqueur : ${winner.nom} ${winner.prenom}`
                                        : "Égalité"}
                                    </span>
                                  )}

                                  <span>
                                    {match.statut}
                                  </span>
                                </div>
                              );
                            }
                          )}
                        </div>

                        <div className="pool-ranking">
                          <h3>
                            Classement
                          </h3>

                          <div className="ranking-table">
                            <div className="ranking-header">
                              <span>
                                Place
                              </span>

                              <span>
                                Compétiteur
                              </span>

                              <span>V</span>
                              <span>D</span>
                              <span>N</span>
                              <span>PN</span>
                            </div>

                            {ranking.map(
                              (
                                item,
                                index
                              ) => {
                                const competitor =
                                  getCompetitor(
                                    item.competitorId
                                  );

                                if (!competitor) {
                                  return null;
                                }

                                return (
                                  <div
                                    className="ranking-row"
                                    key={
                                      item.competitorId
                                    }
                                  >
                                    <strong>
                                      {index + 1}
                                    </strong>

                                    <strong>
                                      {competitor.nom}{" "}
                                      {competitor.prenom}
                                    </strong>

                                    <span>
                                      {item.victories}
                                    </span>

                                    <span>
                                      {item.defeats}
                                    </span>

                                    <span>
                                      {item.draws}
                                    </span>

                                    <span>
                                      {item.negativePoints}
                                    </span>
                                  </div>
                                );
                              }
                            )}
                          </div>
                        </div>

                        {finished &&
                          !rankingResolved && (
                            <div className="competition-form">
                              <p className="surtitle">
                                ÉGALITÉ
                              </p>

                              <h3>
                                Départage requis
                              </h3>

                              <p>
                                Le classement
                                ne peut pas encore
                                être validé.
                              </p>

                              <p>
                                Les points négatifs
                                et la rencontre
                                directe ne permettent
                                pas de départager les
                                compétiteurs concernés.
                              </p>

                              {tieBreaksNeeded.map(
                                (
                                  tie,
                                  index
                                ) => {
                                  const competitorA =
                                    getCompetitor(
                                      tie.competitorAId
                                    );

                                  const competitorB =
                                    getCompetitor(
                                      tie.competitorBId
                                    );

                                  return (
                                    <div
                                      className="beta-note"
                                      key={`${tie.competitorAId}-${tie.competitorBId}-${index}`}
                                    >
                                      <strong>
                                        Départage à
                                        effectuer
                                      </strong>

                                      <p>
                                        {competitorA
                                          ? `${competitorA.nom} ${competitorA.prenom}`
                                          : "Compétiteur"}
                                        {" — "}
                                        {competitorB
                                          ? `${competitorB.nom} ${competitorB.prenom}`
                                          : "Compétiteur"}
                                      </p>

                                      <p>
                                        3 attaques
                                        supplémentaires :
                                        Tsuki, Mae Geri
                                        et Mawashi Geri.
                                      </p>

                                      <p>
                                        Si l'égalité
                                        persiste :
                                        décision aux
                                        drapeaux.
                                      </p>
                                    </div>
                                  );
                                }
                              )}

                              <div className="beta-note">
                                <strong>
                                  Arbitrage
                                  nécessaire
                                </strong>

                                <p>
                                  Effectue le
                                  départage depuis
                                  l'écran Arbitrage
                                  avant de clôturer
                                  cette poule.
                                </p>
                              </div>
                            </div>
                          )}
                      </>
                    )}

                    {/* ======================
                        CLÔTURE
                    ====================== */}

                    {finished &&
                      rankingResolved &&
                      pool.statut !==
                        "Terminée" &&
                      (pool.finalMatches
                        ?.length ||
                        0) === 0 &&
                      (pool.finalPassages
                        ?.length ||
                        0) === 0 && (
                        <div className="competition-form">
                          <h3>
                            Clôture de la
                            catégorie
                          </h3>

                          <label>
                            Mode de clôture

                            <select
                              value={
                                pool.closingMode ||
                                ""
                              }
                              onChange={(
                                event
                              ) =>
                                chooseClosingMode(
                                  pool.id,
                                  event.target
                                    .value
                                )
                              }
                            >
                              <option value="">
                                Choisir
                              </option>

                              <option value="direct">
                                Classement
                                direct
                              </option>

                              <option value="finals">
                                Finale + petite
                                finale
                              </option>
                            </select>
                          </label>

                          <button
                            className="primary"
                            type="button"
                            onClick={() =>
                              validateClosing(
                                pool
                              )
                            }
                          >
                            Valider
                          </button>
                        </div>
                      )}

                    {/* ======================
                        PODIUM DIRECT
                    ====================== */}

                    {pool.closingMode ===
                      "direct" &&
                      pool.statut ===
                        "Terminée" &&
                      pool.podium && (
                        <div className="pool-ranking">
                          <h3>
                            Résultat final
                          </h3>

                          <p>
                            🥇{" "}
                            {getCompetitor(
                              pool.podium
                                .firstId
                            )?.nom ||
                              "—"}{" "}
                            {getCompetitor(
                              pool.podium
                                .firstId
                            )?.prenom ||
                              ""}
                          </p>

                          <p>
                            🥈{" "}
                            {getCompetitor(
                              pool.podium
                                .secondId
                            )?.nom ||
                              "—"}{" "}
                            {getCompetitor(
                              pool.podium
                                .secondId
                            )?.prenom ||
                              ""}
                          </p>

                          <p>
                            🥉{" "}
                            {getCompetitor(
                              pool.podium
                                .thirdId
                            )?.nom ||
                              "—"}{" "}
                            {getCompetitor(
                              pool.podium
                                .thirdId
                            )?.prenom ||
                              ""}
                          </p>

                          {pool.podium
                            .fourthId && (
                            <p>
                              4e{" "}
                              {getCompetitor(
                                pool.podium
                                  .fourthId
                              )?.nom ||
                                "—"}{" "}
                              {getCompetitor(
                                pool.podium
                                  .fourthId
                              )?.prenom ||
                                ""}
                            </p>
                          )}
                        </div>
                      )}

                    {/* ======================
                        PHASE FINALE KATA
                    ====================== */}

                    {kata &&
                      (pool.finalPassages
                        ?.length ||
                        0) > 0 && (
                        <div className="pool-ranking">
                          <h3>
                            Phase finale
                          </h3>

                          {pool.finalPassages.map(
                            (passage) => {
                              const competitor =
                                getCompetitor(
                                  passage.competitorId
                                );

                              return (
                                <div
                                  className="pool-match"
                                  key={
                                    passage.id
                                  }
                                >
                                  <strong>
                                    {passage.label}
                                  </strong>

                                  <span>
                                    {competitor
                                      ? `${competitor.nom} ${competitor.prenom}`
                                      : "Inconnu"}
                                  </span>

                                  <span>
                                    {passage.statut}
                                  </span>

                                  {passage.statut ===
                                    "Terminé" && (
                                    <strong>
                                      Score :{" "}
                                      {Number(
                                        passage.score
                                      ).toFixed(
                                        1
                                      )}
                                    </strong>
                                  )}
                                </div>
                              );
                            }
                          )}
                        </div>
                      )}

                    {/* ======================
                        PHASE FINALE COMBAT
                    ====================== */}

                    {!kata &&
                      (pool.finalMatches
                        ?.length ||
                        0) > 0 && (
                        <div className="pool-ranking">
                          <h3>
                            Phase finale
                          </h3>

                          {pool.finalMatches.map(
                            (match) => {
                              const aka =
                                getCompetitor(
                                  match.akaId
                                );

                              const shiro =
                                getCompetitor(
                                  match.shiroId
                                );

                              const winner =
                                match.winnerId
                                  ? getCompetitor(
                                      match.winnerId
                                    )
                                  : null;

                              return (
                                <div
                                  className="pool-match"
                                  key={
                                    match.id
                                  }
                                >
                                  <strong>
                                    {match.label}
                                  </strong>

                                  <span>
                                    🔴 AKA —{" "}
                                    {aka
                                      ? `${aka.nom} ${aka.prenom}`
                                      : "Inconnu"}
                                  </span>

                                  <span className="match-vs">
                                    VS
                                  </span>

                                  <span>
                                    ⚪ SHIRO —{" "}
                                    {shiro
                                      ? `${shiro.nom} ${shiro.prenom}`
                                      : "Inconnu"}
                                  </span>

                                  {match.statut ===
                                    "Terminé" && (
                                    <span>
                                      {match.akaScore ??
                                        0}
                                      {" — "}
                                      {match.shiroScore ??
                                        0}
                                      {" · "}
                                      {winner
                                        ? `Vainqueur : ${winner.nom} ${winner.prenom}`
                                        : "Égalité"}
                                    </span>
                                  )}

                                  <span>
                                    {match.statut}
                                  </span>
                                </div>
                              );
                            }
                          )}
                        </div>
                      )}
                  </div>

                  <div className="competition-actions">
                    <span className="status">
                      {pool.statut ||
                        "Prête"}
                    </span>

                    <button
                      className="delete-button"
                      type="button"
                      onClick={() =>
                        deletePool(
                          pool.id
                        )
                      }
                    >
                      Supprimer la poule
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default PoolsManager;
