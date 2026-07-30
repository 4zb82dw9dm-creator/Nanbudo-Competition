import { useRef, useState } from "react";
import MatchManager from "./MatchManager";

const EVENT_LABELS = {
  kata0: "Kata 0 — Shihotai",
  kata1: "Kata 1",
  kata2: "Kata 2",
  randori: "Randori",
  juRandori1: "Ju Randori 1",
  juRandori2: "Ju Randori 2",
};

function ArbitrationManager({
  competition,
  onUpdateCompetition,
}) {
  const pools = competition.pools || [];
  const competitors = competition.competitors || [];
  const categories = competition.categories || [];

  /*
   * =========================================================
   * DÉFILEMENT AUTOMATIQUE
   * =========================================================
   */

  const notationSheetRef = useRef(null);

  function scrollToNotationSheet() {
    setTimeout(() => {
      notationSheetRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  }

  /*
   * =========================================================
   * SÉLECTIONS
   * =========================================================
   */

  const [selectedPoolId, setSelectedPoolId] =
    useState("");

  const [selectedMatchId, setSelectedMatchId] =
    useState("");

  const [selectedMatchType, setSelectedMatchType] =
    useState("");

  const [selectedPassageId, setSelectedPassageId] =
    useState("");

  const [
    selectedFinalPassageId,
    setSelectedFinalPassageId,
  ] = useState("");

  const [
    selectedClosingMode,
    setSelectedClosingMode,
  ] = useState("");

  /*
   * =========================================================
   * OUTILS
   * =========================================================
   */

  function sameId(a, b) {
    return String(a) === String(b);
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

  function isKataEvent(eventType) {
    return ["kata0", "kata1", "kata2"].includes(
      eventType
    );
  }

  const selectedPool = pools.find((pool) =>
    sameId(pool.id, selectedPoolId)
  );

  const selectedCategory = selectedPool
    ? getCategory(selectedPool.categoryId)
    : null;

  const selectedEvent =
    selectedCategory?.epreuve ||
    selectedPool?.epreuve ||
    "";

  const kataMode = isKataEvent(selectedEvent);

  const poolMatches =
    selectedPool?.matches || [];

  const finalMatches =
    selectedPool?.finalMatches || [];

  const passages =
    selectedPool?.passages || [];

  const finalPassages =
    selectedPool?.finalPassages || [];

  const kataTieBreaks =
    selectedPool?.kataTieBreaks || {};

  const selectedMatch =
    selectedMatchType === "final"
      ? finalMatches.find((match) =>
          sameId(match.id, selectedMatchId)
        )
      : poolMatches.find((match) =>
          sameId(match.id, selectedMatchId)
        );

  const selectedPassage = passages.find(
    (passage) =>
      sameId(passage.id, selectedPassageId)
  );

  const allFinalKataPassages = [
    ...finalPassages,
    ...(kataTieBreaks.finale?.passages || []),
    ...(kataTieBreaks["petite-finale"]?.passages ||
      []),
  ];

  const selectedFinalPassage =
    allFinalKataPassages.find((passage) =>
      sameId(
        passage.id,
        selectedFinalPassageId
      )
    );

  function resetSelections() {
    setSelectedMatchId("");
    setSelectedMatchType("");
    setSelectedPassageId("");
    setSelectedFinalPassageId("");
  }

  /*
   * =========================================================
   * COMBAT — SÉLECTION
   * =========================================================
   */

  function selectMatch(match, type) {
    setSelectedMatchId(match.id);
    setSelectedMatchType(type);

    setSelectedPassageId("");
    setSelectedFinalPassageId("");

    scrollToNotationSheet();
  }

  /*
   * =========================================================
   * COMBAT — FIN DES RENCONTRES DE POULE
   * =========================================================
   */

  function combatQualificationsFinished() {
    if (!selectedPool) {
      return false;
    }

    const matches =
      selectedPool.matches || [];

    if (matches.length === 0) {
      return false;
    }

    return matches.every(
      (match) => match.statut === "Terminé"
    );
  }

  /*
   * =========================================================
   * COMBAT — CLASSEMENT DE POULE
   * =========================================================
   */

  function calculateCombatRanking() {
    if (!selectedPool) {
      return [];
    }

    const competitorIds =
      selectedPool.competitorIds || [];

    const ranking = competitorIds.map(
      (competitorId) => ({
        competitorId,

        combats: 0,
        victoires: 0,
        defaites: 0,

        pointsPour: 0,
        pointsContre: 0,

        difference: 0,
      })
    );

    const findRow = (id) =>
      ranking.find((row) =>
        sameId(row.competitorId, id)
      );

    (selectedPool.matches || []).forEach(
      (match) => {
        if (match.statut !== "Terminé") {
          return;
        }

        const akaRow =
          findRow(match.akaId);

        const shiroRow =
          findRow(match.shiroId);

        if (!akaRow || !shiroRow) {
          return;
        }

        const akaScore =
          Number(match.akaScore) || 0;

        const shiroScore =
          Number(match.shiroScore) || 0;

        akaRow.combats += 1;
        shiroRow.combats += 1;

        akaRow.pointsPour += akaScore;
        akaRow.pointsContre += shiroScore;

        shiroRow.pointsPour += shiroScore;
        shiroRow.pointsContre += akaScore;

        if (
          match.winnerId &&
          sameId(
            match.winnerId,
            match.akaId
          )
        ) {
          akaRow.victoires += 1;
          shiroRow.defaites += 1;
        }

        if (
          match.winnerId &&
          sameId(
            match.winnerId,
            match.shiroId
          )
        ) {
          shiroRow.victoires += 1;
          akaRow.defaites += 1;
        }
      }
    );

    ranking.forEach((row) => {
      row.difference =
        row.pointsPour -
        row.pointsContre;
    });

    return ranking.sort((a, b) => {
      /*
       * 1. Nombre de victoires
       */

      if (b.victoires !== a.victoires) {
        return b.victoires - a.victoires;
      }

      /*
       * 2. Différence de points
       */

      if (b.difference !== a.difference) {
        return b.difference - a.difference;
      }

      /*
       * 3. Points marqués
       */

      if (b.pointsPour !== a.pointsPour) {
        return b.pointsPour - a.pointsPour;
      }

      /*
       * 4. Ordre stable par nom
       */

      const competitorA =
        getCompetitor(a.competitorId);

      const competitorB =
        getCompetitor(b.competitorId);

      const nameA =
        `${competitorA?.nom || ""} ${
          competitorA?.prenom || ""
        }`.trim();

      const nameB =
        `${competitorB?.nom || ""} ${
          competitorB?.prenom || ""
        }`.trim();

      return nameA.localeCompare(nameB);
    });
  }

  /*
   * =========================================================
   * COMBAT — CRÉATION D'UN COMBAT DE FINALE
   * =========================================================
   */

  function createFinalCombat({
    id,
    type,
    label,
    akaId,
    shiroId,
  }) {
    return {
      id,
      type,
      label,

      akaId,
      shiroId,

      assauts: [],

      akaScore: null,
      shiroScore: null,

      scoreBrutAka: null,
      scoreBrutShiro: null,

      penalitesAka: {
        keikoku: 0,
        fujubun: 0,
        chui: 0,
        hansokuChui: 0,
        shikaku: false,
      },

      penalitesShiro: {
        keikoku: 0,
        fujubun: 0,
        chui: 0,
        hansokuChui: 0,
        shikaku: false,
      },

      pointsNegatifsAka: 0,
      pointsNegatifsShiro: 0,

      akaDisqualifie: false,
      shiroDisqualifie: false,

      winnerId: null,

      decisionType: null,
      decisionDrapeaux: null,

      statut: "À arbitrer",
    };
  }

  /*
   * =========================================================
   * COMBAT — CLÔTURE
   * =========================================================
   */

  function validateCombatClosing() {
    if (!selectedPool) {
      return;
    }

    if (!combatQualificationsFinished()) {
      alert(
        "Toutes les rencontres de poule doivent être terminées avant de clôturer la catégorie."
      );

      return;
    }

    if (!selectedClosingMode) {
      alert("Choisis un mode de clôture.");

      return;
    }

    const ranking =
      calculateCombatRanking();

    /*
     * CLASSEMENT DIRECT
     */

    if (selectedClosingMode === "direct") {
      const podium = {
        firstId:
          ranking[0]?.competitorId || null,

        secondId:
          ranking[1]?.competitorId || null,

        thirdId:
          ranking[2]?.competitorId || null,

        fourthId:
          ranking[3]?.competitorId || null,
      };

      const updatedPools = pools.map(
        (pool) =>
          sameId(pool.id, selectedPool.id)
            ? {
                ...pool,

                closingMode: "direct",

                rankingLocked: ranking,

                finalMatches: [],

                podium,

                statut: "Terminée",
              }
            : pool
      );

      onUpdateCompetition({
        ...competition,
        pools: updatedPools,
      });

      setSelectedClosingMode("");
      resetSelections();

      return;
    }

    /*
     * FINALE + PETITE FINALE
     */

    if (selectedClosingMode === "finals") {
      if (ranking.length < 4) {
        alert(
          "Il faut au moins 4 compétiteurs pour organiser une finale et une petite finale."
        );

        return;
      }

      const now = Date.now();

      const newFinalMatches = [
        createFinalCombat({
          id: `${now}-combat-finale`,

          type: "finale",

          label: "FINALE",

          akaId:
            ranking[0].competitorId,

          shiroId:
            ranking[1].competitorId,
        }),

        createFinalCombat({
          id: `${now}-combat-petite-finale`,

          type: "petite-finale",

          label: "PETITE FINALE",

          akaId:
            ranking[2].competitorId,

          shiroId:
            ranking[3].competitorId,
        }),
      ];

      const updatedPools = pools.map(
        (pool) =>
          sameId(pool.id, selectedPool.id)
            ? {
                ...pool,

                closingMode: "finals",

                rankingLocked: ranking,

                finalMatches:
                  newFinalMatches,

                podium: null,

                statut: "Phase finale",
              }
            : pool
      );

      onUpdateCompetition({
        ...competition,
        pools: updatedPools,
      });

      setSelectedClosingMode("");
      resetSelections();
    }
  }

  /*
   * =========================================================
   * COMBAT — PODIUM
   * =========================================================
   */

  function calculateCombatPodium(
    finalMatchesList
  ) {
    const finale = finalMatchesList.find(
      (match) => match.type === "finale"
    );

    const petiteFinale =
      finalMatchesList.find(
        (match) =>
          match.type === "petite-finale"
      );

    if (
      !finale ||
      !petiteFinale ||
      finale.statut !== "Terminé" ||
      petiteFinale.statut !== "Terminé"
    ) {
      return null;
    }

    if (
      !finale.winnerId ||
      !petiteFinale.winnerId
    ) {
      return null;
    }

    const secondId = sameId(
      finale.winnerId,
      finale.akaId
    )
      ? finale.shiroId
      : finale.akaId;

    const fourthId = sameId(
      petiteFinale.winnerId,
      petiteFinale.akaId
    )
      ? petiteFinale.shiroId
      : petiteFinale.akaId;

    return {
      firstId: finale.winnerId,
      secondId,

      thirdId:
        petiteFinale.winnerId,

      fourthId,
    };
  }

  /*
   * =========================================================
   * COMBAT — ENREGISTREMENT
   * =========================================================
   */

  function saveOfficialMatch(result) {
    if (!selectedPool || !selectedMatch) {
      return;
    }

    const winnerId =
      result.vainqueur === "aka"
        ? selectedMatch.akaId
        : result.vainqueur === "shiro"
        ? selectedMatch.shiroId
        : null;

    if (!winnerId) {
      alert(
        "Impossible d'enregistrer ce combat sans vainqueur."
      );

      return;
    }

    const savedMatch = {
      ...selectedMatch,

      assauts: result.assauts,

      akaScore: result.scoreAka,
      shiroScore: result.scoreShiro,

      scoreBrutAka: result.scoreBrutAka,
      scoreBrutShiro: result.scoreBrutShiro,

      penalitesAka:
        result.penalitesAka,

      penalitesShiro:
        result.penalitesShiro,

      pointsNegatifsAka:
        result.pointsNegatifsAka,

      pointsNegatifsShiro:
        result.pointsNegatifsShiro,

      akaDisqualifie:
        result.akaDisqualifie,

      shiroDisqualifie:
        result.shiroDisqualifie,

      winnerId,

      decisionType:
        result.decisionType || "score",

      decisionDrapeaux:
        result.decisionDrapeaux || null,

      statut: "Terminé",
    };

    const updatedPools = pools.map(
      (pool) => {
        if (
          !sameId(
            pool.id,
            selectedPool.id
          )
        ) {
          return pool;
        }

        /*
         * COMBAT DE PHASE FINALE
         */

        if (
          selectedMatchType === "final"
        ) {
          const updatedFinalMatches = (
            pool.finalMatches || []
          ).map((match) =>
            sameId(
              match.id,
              selectedMatch.id
            )
              ? savedMatch
              : match
          );

          const podium =
            calculateCombatPodium(
              updatedFinalMatches
            );

          return {
            ...pool,

            finalMatches:
              updatedFinalMatches,

            podium,

            statut: podium
              ? "Terminée"
              : "Phase finale",
          };
        }

        /*
         * COMBAT DE POULE
         */

        return {
          ...pool,

          matches: (
            pool.matches || []
          ).map((match) =>
            sameId(
              match.id,
              selectedMatch.id
            )
              ? savedMatch
              : match
          ),
        };
      }
    );

    onUpdateCompetition({
      ...competition,
      pools: updatedPools,
    });

    setSelectedMatchId("");
    setSelectedMatchType("");
  }

  /*
   * =========================================================
   * KATA — QUALIFICATIONS
   * =========================================================
   */

  function getKataPassage(
    competitorId,
    numero
  ) {
    return passages.find(
      (passage) =>
        sameId(
          passage.competitorId,
          competitorId
        ) &&
        Number(passage.numero) ===
          Number(numero)
    );
  }

  function selectKataPassage(passage) {
    if (!passage) {
      return;
    }

    setSelectedPassageId(passage.id);

    setSelectedFinalPassageId("");
    setSelectedMatchId("");
    setSelectedMatchType("");

    scrollToNotationSheet();
  }

  function saveKataPassage(result) {
    if (
      !selectedPool ||
      !selectedPassage
    ) {
      return;
    }

    const updatedPassages = (
      selectedPool.passages || []
    ).map((passage) => {
      if (
        !sameId(
          passage.id,
          selectedPassage.id
        )
      ) {
        return passage;
      }

      return {
        ...passage,

        notes:
          result.notes || [],

        notesRetenues:
          result.notesRetenues || [],

        noteMinRetiree:
          result.noteMin,

        noteMaxRetiree:
          result.noteMax,

        score:
          Number(result.score) || 0,

        statut: "Terminé",
      };
    });

    const updatedPools = pools.map(
      (pool) =>
        sameId(
          pool.id,
          selectedPool.id
        )
          ? {
              ...pool,
              passages:
                updatedPassages,
            }
          : pool
    );

    onUpdateCompetition({
      ...competition,
      pools: updatedPools,
    });

    setSelectedPassageId("");
  }

  /*
   * =========================================================
   * KATA — CLASSEMENT
   * =========================================================
   */

  function calculateKataRanking() {
    if (!selectedPool) {
      return [];
    }

    return (
      selectedPool.competitorIds || []
    )
      .map((competitorId) => {
        const passage1 =
          getKataPassage(
            competitorId,
            1
          );

        const passage2 =
          getKataPassage(
            competitorId,
            2
          );

        const passage1Finished =
          passage1?.statut === "Terminé";

        const passage2Finished =
          passage2?.statut === "Terminé";

        const score1 =
          passage1Finished
            ? Number(passage1.score) || 0
            : null;

        const score2 =
          passage2Finished
            ? Number(passage2.score) || 0
            : null;

        const passagesTermines =
          Number(passage1Finished) +
          Number(passage2Finished);

        return {
          competitorId,

          passage1: score1,
          passage2: score2,

          passagesTermines,

          total:
            (score1 || 0) +
            (score2 || 0),
        };
      })
      .sort((a, b) => {
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

        const bestA = Math.max(
          a.passage1 || 0,
          a.passage2 || 0
        );

        const bestB = Math.max(
          b.passage1 || 0,
          b.passage2 || 0
        );

        return bestB - bestA;
      });
  }

  function kataQualificationsFinished() {
    if (!selectedPool) {
      return false;
    }

    const competitorIds =
      selectedPool.competitorIds || [];

    if (competitorIds.length === 0) {
      return false;
    }

    return competitorIds.every(
      (competitorId) => {
        const passage1 =
          getKataPassage(
            competitorId,
            1
          );

        const passage2 =
          getKataPassage(
            competitorId,
            2
          );

        return (
          passage1?.statut ===
            "Terminé" &&
          passage2?.statut ===
            "Terminé"
        );
      }
    );
  }

  /*
   * =========================================================
   * KATA — CRÉATION PASSAGE
   * =========================================================
   */

  function createEmptyKataPassage({
    id,
    type,
    label,
    competitorId,
    phase = "finale",
  }) {
    return {
      id,
      type,
      label,
      competitorId,
      phase,

      notes: [
        null,
        null,
        null,
        null,
        null,
      ],

      notesRetenues: [],

      noteMinRetiree: null,
      noteMaxRetiree: null,

      score: null,

      statut: "À noter",
    };
  }

  /*
   * =========================================================
   * KATA — CLÔTURE
   * =========================================================
   */

  function validateKataClosing() {
    if (!selectedPool) {
      return;
    }

    if (!kataQualificationsFinished()) {
      alert(
        "Les deux passages de tous les compétiteurs doivent être terminés."
      );

      return;
    }

    if (!selectedClosingMode) {
      alert(
        "Choisis un mode de clôture."
      );

      return;
    }

    const ranking =
      calculateKataRanking();

    /*
     * CLASSEMENT DIRECT
     */

    if (
      selectedClosingMode === "direct"
    ) {
      const podium = {
        firstId:
          ranking[0]?.competitorId ||
          null,

        secondId:
          ranking[1]?.competitorId ||
          null,

        thirdId:
          ranking[2]?.competitorId ||
          null,

        fourthId:
          ranking[3]?.competitorId ||
          null,
      };

      const updatedPools = pools.map(
        (pool) =>
          sameId(
            pool.id,
            selectedPool.id
          )
            ? {
                ...pool,

                closingMode: "direct",

                rankingLocked:
                  ranking,

                finalPassages: [],
                finalMatches: [],

                kataTieBreaks: {},

                podium,

                statut: "Terminée",
              }
            : pool
      );

      onUpdateCompetition({
        ...competition,
        pools: updatedPools,
      });

      setSelectedClosingMode("");

      return;
    }

    /*
     * FINALE + PETITE FINALE
     */

    if (
      selectedClosingMode === "finals"
    ) {
      if (ranking.length < 4) {
        alert(
          "Il faut au moins 4 compétiteurs pour organiser une finale et une petite finale."
        );

        return;
      }

      const now = Date.now();

      const newFinalPassages = [
        createEmptyKataPassage({
          id: `${now}-kata-final-1`,

          type: "finale",

          label: "Finale",

          competitorId:
            ranking[0].competitorId,
        }),

        createEmptyKataPassage({
          id: `${now}-kata-final-2`,

          type: "finale",

          label: "Finale",

          competitorId:
            ranking[1].competitorId,
        }),

        createEmptyKataPassage({
          id: `${now}-kata-bronze-1`,

          type: "petite-finale",

          label: "Petite finale",

          competitorId:
            ranking[2].competitorId,
        }),

        createEmptyKataPassage({
          id: `${now}-kata-bronze-2`,

          type: "petite-finale",

          label: "Petite finale",

          competitorId:
            ranking[3].competitorId,
        }),
      ];

      const updatedPools = pools.map(
        (pool) =>
          sameId(
            pool.id,
            selectedPool.id
          )
            ? {
                ...pool,

                closingMode: "finals",

                rankingLocked:
                  ranking,

                finalPassages:
                  newFinalPassages,

                finalMatches: [],

                kataFinalResults: {
                  finale: null,
                  "petite-finale": null,
                },

                kataTieBreaks: {},

                podium: null,

                statut: "Phase finale",
              }
            : pool
      );

      onUpdateCompetition({
        ...competition,
        pools: updatedPools,
      });

      setSelectedClosingMode("");
    }
  }

  /*
   * =========================================================
   * KATA — PHASE FINALE
   * =========================================================
   */

  function selectKataFinalPassage(
    passage
  ) {
    if (!passage) {
      return;
    }

    setSelectedFinalPassageId(
      passage.id
    );

    setSelectedPassageId("");
    setSelectedMatchId("");
    setSelectedMatchType("");

    scrollToNotationSheet();
  }

  function getKataFinalGroup(
    pool,
    finalType
  ) {
    return (
      pool.finalPassages || []
    ).filter(
      (passage) =>
        passage.type === finalType
    );
  }

  /*
   * =========================================================
   * KATA — STATUT D'UNE FINALE
   * =========================================================
   */

  function getKataFinalStatus(
    pool,
    finalType
  ) {
    const savedResult =
      pool.kataFinalResults?.[
        finalType
      ];

    if (savedResult?.winnerId) {
      return {
        status: "resolved",
        ...savedResult,
      };
    }

    const group =
      getKataFinalGroup(
        pool,
        finalType
      );

    if (group.length !== 2) {
      return {
        status: "waiting",
      };
    }

    const allFinished =
      group.every(
        (passage) =>
          passage.statut ===
          "Terminé"
      );

    if (!allFinished) {
      return {
        status: "waiting",
      };
    }

    const scoreA =
      Number(group[0].score) || 0;

    const scoreB =
      Number(group[1].score) || 0;

    if (scoreA > scoreB) {
      return {
        status: "score",

        winnerId:
          group[0].competitorId,

        loserId:
          group[1].competitorId,

        scoreA,
        scoreB,
      };
    }

    if (scoreB > scoreA) {
      return {
        status: "score",

        winnerId:
          group[1].competitorId,

        loserId:
          group[0].competitorId,

        scoreA,
        scoreB,
      };
    }

    const tieBreak =
      pool.kataTieBreaks?.[
        finalType
      ];

    if (!tieBreak) {
      return {
        status: "tie",
        competitors: group,
        scoreA,
        scoreB,
      };
    }

    if (tieBreak.winnerId) {
      return {
        status: "resolved",

        winnerId:
          tieBreak.winnerId,

        loserId:
          tieBreak.loserId,

        decisionType:
          tieBreak.decisionType,
      };
    }

    const tiePassages =
      tieBreak.passages || [];

    if (tiePassages.length !== 2) {
      return {
        status: "tie",
        competitors: group,
      };
    }

    const tieFinished =
      tiePassages.every(
        (passage) =>
          passage.statut ===
          "Terminé"
      );

    if (!tieFinished) {
      return {
        status: "tiebreak",
        passages: tiePassages,
      };
    }

    const tieScoreA =
      Number(
        tiePassages[0].score
      ) || 0;

    const tieScoreB =
      Number(
        tiePassages[1].score
      ) || 0;

    if (tieScoreA > tieScoreB) {
      return {
        status: "tiebreak-score",

        winnerId:
          tiePassages[0]
            .competitorId,

        loserId:
          tiePassages[1]
            .competitorId,

        scoreA: tieScoreA,
        scoreB: tieScoreB,
      };
    }

    if (tieScoreB > tieScoreA) {
      return {
        status: "tiebreak-score",

        winnerId:
          tiePassages[1]
            .competitorId,

        loserId:
          tiePassages[0]
            .competitorId,

        scoreA: tieScoreA,
        scoreB: tieScoreB,
      };
    }

    return {
      status: "flags",

      passages: tiePassages,

      scoreA: tieScoreA,
      scoreB: tieScoreB,
    };
  }

  /*
   * =========================================================
   * KATA — RÉSOLUTION DES FINALES
   * =========================================================
   */

  function resolveKataFinalResults(
    pool
  ) {
    const types = [
      "finale",
      "petite-finale",
    ];

    const currentResults = {
      ...(pool.kataFinalResults ||
        {}),
    };

    types.forEach((finalType) => {
      if (
        currentResults[finalType]
          ?.winnerId
      ) {
        return;
      }

      const status =
        getKataFinalStatus(
          {
            ...pool,

            kataFinalResults:
              currentResults,
          },

          finalType
        );

      if (
        status.status === "score"
      ) {
        currentResults[finalType] = {
          winnerId:
            status.winnerId,

          loserId:
            status.loserId,

          decisionType: "score",
        };
      }

      if (
        status.status ===
        "tiebreak-score"
      ) {
        currentResults[finalType] = {
          winnerId:
            status.winnerId,

          loserId:
            status.loserId,

          decisionType:
            "kata-impose",
        };
      }

      if (
        status.status ===
          "resolved" &&
        status.winnerId
      ) {
        currentResults[finalType] = {
          winnerId:
            status.winnerId,

          loserId:
            status.loserId,

          decisionType:
            status.decisionType ||
            "drapeaux",
        };
      }
    });

    const finale =
      currentResults.finale;

    const bronze =
      currentResults[
        "petite-finale"
      ];

    const podium =
      finale?.winnerId &&
      finale?.loserId &&
      bronze?.winnerId &&
      bronze?.loserId
        ? {
            firstId:
              finale.winnerId,

            secondId:
              finale.loserId,

            thirdId:
              bronze.winnerId,

            fourthId:
              bronze.loserId,
          }
        : null;

    return {
      kataFinalResults:
        currentResults,

      podium,

      statut: podium
        ? "Terminée"
        : "Phase finale",
    };
  }

  /*
   * =========================================================
   * KATA — SAUVEGARDE FINALE
   * =========================================================
   */

  function saveKataFinalPassage(
    result
  ) {
    if (
      !selectedPool ||
      !selectedFinalPassage
    ) {
      return;
    }

    const isTieBreak =
      selectedFinalPassage.phase ===
      "departage";

    let updatedPool = {
      ...selectedPool,
    };

    /*
     * PASSAGE NORMAL
     */

    if (!isTieBreak) {
      const updatedFinalPassages = (
        selectedPool.finalPassages ||
        []
      ).map((passage) => {
        if (
          !sameId(
            passage.id,
            selectedFinalPassage.id
          )
        ) {
          return passage;
        }

        return {
          ...passage,

          notes:
            result.notes || [],

          notesRetenues:
            result.notesRetenues || [],

          noteMinRetiree:
            result.noteMin,

          noteMaxRetiree:
            result.noteMax,

          score:
            Number(result.score) || 0,

          statut: "Terminé",
        };
      });

      updatedPool = {
        ...updatedPool,

        finalPassages:
          updatedFinalPassages,
      };
    }

    /*
     * KATA IMPOSÉ
     */

    if (isTieBreak) {
      const finalType =
        selectedFinalPassage.finalType;

      const currentTieBreak =
        selectedPool.kataTieBreaks?.[
          finalType
        ];

      if (!currentTieBreak) {
        return;
      }

      const updatedTiePassages = (
        currentTieBreak.passages || []
      ).map((passage) => {
        if (
          !sameId(
            passage.id,
            selectedFinalPassage.id
          )
        ) {
          return passage;
        }

        return {
          ...passage,

          notes:
            result.notes || [],

          notesRetenues:
            result.notesRetenues || [],

          noteMinRetiree:
            result.noteMin,

          noteMaxRetiree:
            result.noteMax,

          score:
            Number(result.score) || 0,

          statut: "Terminé",
        };
      });

      updatedPool = {
        ...updatedPool,

        kataTieBreaks: {
          ...(selectedPool.kataTieBreaks ||
            {}),

          [finalType]: {
            ...currentTieBreak,

            passages:
              updatedTiePassages,
          },
        },
      };
    }

    const resolution =
      resolveKataFinalResults(
        updatedPool
      );

    updatedPool = {
      ...updatedPool,
      ...resolution,
    };

    const updatedPools = pools.map(
      (pool) =>
        sameId(
          pool.id,
          selectedPool.id
        )
          ? updatedPool
          : pool
    );

    onUpdateCompetition({
      ...competition,
      pools: updatedPools,
    });

    setSelectedFinalPassageId("");
  }

  /*
   * =========================================================
   * KATA — LANCER LE DÉPARTAGE
   * =========================================================
   */

  function startKataTieBreak(
    finalType
  ) {
    if (!selectedPool) {
      return;
    }

    const group =
      getKataFinalGroup(
        selectedPool,
        finalType
      );

    if (group.length !== 2) {
      return;
    }

    const scoreA =
      Number(group[0].score);

    const scoreB =
      Number(group[1].score);

    if (scoreA !== scoreB) {
      return;
    }

    const now = Date.now();

    const tiePassages =
      group.map(
        (passage, index) =>
          createEmptyKataPassage({
            id: `${now}-${finalType}-departage-${
              index + 1
            }`,

            type: "departage",

            label: "Kata imposé",

            competitorId:
              passage.competitorId,

            phase: "departage",
          })
      );

    tiePassages.forEach(
      (passage) => {
        passage.finalType =
          finalType;
      }
    );

    const updatedPools = pools.map(
      (pool) =>
        sameId(
          pool.id,
          selectedPool.id
        )
          ? {
              ...pool,

              kataTieBreaks: {
                ...(pool.kataTieBreaks ||
                  {}),

                [finalType]: {
                  passages:
                    tiePassages,

                  winnerId: null,
                  loserId: null,

                  decisionType: null,
                },
              },

              podium: null,

              statut:
                "Phase finale",
            }
          : pool
    );

    onUpdateCompetition({
      ...competition,
      pools: updatedPools,
    });
  }

  /*
   * =========================================================
   * KATA — DRAPEAUX
   * =========================================================
   */

  function decideKataByFlags(
    finalType,
    winnerId
  ) {
    if (!selectedPool) {
      return;
    }

    const tieBreak =
      selectedPool.kataTieBreaks?.[
        finalType
      ];

    if (!tieBreak) {
      return;
    }

    const competitorIds = (
      tieBreak.passages || []
    ).map(
      (passage) =>
        passage.competitorId
    );

    const loserId =
      competitorIds.find(
        (id) =>
          !sameId(id, winnerId)
      ) || null;

    if (!loserId) {
      return;
    }

    let updatedPool = {
      ...selectedPool,

      kataTieBreaks: {
        ...(selectedPool.kataTieBreaks ||
          {}),

        [finalType]: {
          ...tieBreak,

          winnerId,
          loserId,

          decisionType:
            "drapeaux",
        },
      },

      kataFinalResults: {
        ...(selectedPool.kataFinalResults ||
          {}),

        [finalType]: {
          winnerId,
          loserId,

          decisionType:
            "drapeaux",
        },
      },
    };

    const resolution =
      resolveKataFinalResults(
        updatedPool
      );

    updatedPool = {
      ...updatedPool,
      ...resolution,
    };

    const updatedPools = pools.map(
      (pool) =>
        sameId(
          pool.id,
          selectedPool.id
        )
          ? updatedPool
          : pool
    );

    onUpdateCompetition({
      ...competition,
      pools: updatedPools,
    });
  }

  /*
   * =========================================================
   * AFFICHAGE COMBAT
   * =========================================================
   */

  function renderMatch(
    match,
    label,
    matchType
  ) {
    const aka =
      getCompetitor(match.akaId);

    const shiro =
      getCompetitor(match.shiroId);

    const winner =
      match.winnerId
        ? getCompetitor(
            match.winnerId
          )
        : null;

    return (
      <article
        className={`competition ${
          match.statut === "Terminé"
            ? "competition-terminee"
            : ""
        }`}
        key={match.id}
      >
        <div>
          <p className="surtitle">
            {label}
          </p>

          <h3>
            AKA —{" "}
            {aka
              ? `${aka.nom} ${aka.prenom}`
              : "Inconnu"}
          </h3>

          <p>contre</p>

          <h3>
            SHIRO —{" "}
            {shiro
              ? `${shiro.nom} ${shiro.prenom}`
              : "Inconnu"}
          </h3>

          {match.statut ===
            "Terminé" && (
            <div className="beta-note">
              <strong>
                {match.akaScore}
                {" — "}
                {match.shiroScore}
              </strong>

              <p>
                {winner
                  ? `Vainqueur : ${winner.nom} ${winner.prenom}`
                  : "Résultat incomplet"}
              </p>

              {match.decisionType ===
                "drapeaux" && (
                <p>
                  🏁 Décision aux
                  drapeaux
                </p>
              )}

              {match.decisionType ===
                "disqualification" && (
                <p>
                  ⛔ Victoire par
                  disqualification
                </p>
              )}
            </div>
          )}
        </div>

        <button
          className="manage-button"
          type="button"
          onClick={() =>
            selectMatch(
              match,
              matchType
            )
          }
        >
          {match.statut === "Terminé"
            ? "Modifier"
            : "Arbitrer"}
        </button>
      </article>
    );
  }

  /*
   * =========================================================
   * AFFICHAGE KATA — COMPÉTITEUR
   * =========================================================
   */

  function renderKataCompetitor(
    competitorId
  ) {
    const competitor =
      getCompetitor(competitorId);

    if (!competitor) {
      return null;
    }

    const passage1 =
      getKataPassage(
        competitorId,
        1
      );

    const passage2 =
      getKataPassage(
        competitorId,
        2
      );

    const passage1Finished =
      passage1?.statut === "Terminé";

    const passage2Finished =
      passage2?.statut === "Terminé";

    const total =
      (passage1Finished
        ? Number(passage1.score) || 0
        : 0) +
      (passage2Finished
        ? Number(passage2.score) || 0
        : 0);

    return (
      <article
        className="competition"
        key={competitorId}
      >
        <div>
          <p className="surtitle">
            KATA
          </p>

          <h3>
            {competitor.nom}{" "}
            {competitor.prenom}
          </h3>

          <p>
            {competitor.club ||
              "Club non renseigné"}
          </p>

          <div className="competitor-events">
            <span>
              Passage 1 :{" "}
              {passage1Finished
                ? Number(
                    passage1.score
                  ).toFixed(1)
                : "À noter"}
            </span>

            <span>
              Passage 2 :{" "}
              {passage2Finished
                ? Number(
                    passage2.score
                  ).toFixed(1)
                : "À noter"}
            </span>

            {passage1Finished &&
              passage2Finished && (
                <span>
                  Total :{" "}
                  {total.toFixed(1)}
                </span>
              )}
          </div>
        </div>

        <div className="competition-actions">
          {passage1 && (
            <button
              className="manage-button"
              type="button"
              onClick={() =>
                selectKataPassage(
                  passage1
                )
              }
            >
              {passage1Finished
                ? "Modifier passage 1"
                : "Noter passage 1"}
            </button>
          )}

          {passage2 && (
            <button
              className="manage-button"
              type="button"
              onClick={() =>
                selectKataPassage(
                  passage2
                )
              }
            >
              {passage2Finished
                ? "Modifier passage 2"
                : "Noter passage 2"}
            </button>
          )}
        </div>
      </article>
    );
  }

  /*
   * =========================================================
   * AFFICHAGE KATA — FINALE
   * =========================================================
   */

  function renderKataFinalGroup(
    finalType,
    title
  ) {
    const groupPassages =
      finalPassages.filter(
        (passage) =>
          passage.type === finalType
      );

    if (
      groupPassages.length === 0
    ) {
      return null;
    }

    const status =
      getKataFinalStatus(
        selectedPool,
        finalType
      );

    const tieBreak =
      selectedPool.kataTieBreaks?.[
        finalType
      ];

    return (
      <section className="category-section">
        <div className="category-section-header">
          <div>
            <p className="surtitle">
              PHASE FINALE KATA
            </p>

            <h3>{title}</h3>
          </div>
        </div>

        <div className="competition-list">
          {groupPassages.map(
            (passage) => {
              const competitor =
                getCompetitor(
                  passage.competitorId
                );

              if (!competitor) {
                return null;
              }

              return (
                <article
                  className={`competition ${
                    passage.statut ===
                    "Terminé"
                      ? "competition-terminee"
                      : ""
                  }`}
                  key={passage.id}
                >
                  <div>
                    <p className="surtitle">
                      {passage.label}
                    </p>

                    <h3>
                      {competitor.nom}{" "}
                      {
                        competitor.prenom
                      }
                    </h3>

                    <p>
                      {competitor.club ||
                        "Club non renseigné"}
                    </p>

                    {passage.statut ===
                      "Terminé" && (
                      <div className="beta-note">
                        <strong>
                          Note :{" "}
                          {Number(
                            passage.score
                          ).toFixed(
                            1
                          )}
                        </strong>
                      </div>
                    )}
                  </div>

                  <button
                    className="manage-button"
                    type="button"
                    onClick={() =>
                      selectKataFinalPassage(
                        passage
                      )
                    }
                  >
                    {passage.statut ===
                    "Terminé"
                      ? "Modifier la note"
                      : "Noter le Kata"}
                  </button>
                </article>
              );
            }
          )}
        </div>

        {status.status ===
          "tie" && (
          <div className="competition-form">
            <p className="surtitle">
              ÉGALITÉ
            </p>

            <h3>
              Kata imposé de départage
            </h3>

            <p>
              Les deux compétiteurs ont
              obtenu la même note.
            </p>

            <p>
              Ils doivent effectuer un
              nouveau Kata imposé par
              l'équipe d'arbitrage.
            </p>

            <button
              type="button"
              className="primary"
              onClick={() =>
                startKataTieBreak(
                  finalType
                )
              }
            >
              Lancer le Kata imposé
            </button>
          </div>
        )}

        {tieBreak &&
          (status.status ===
            "tiebreak" ||
            status.status ===
              "flags" ||
            status.status ===
              "tiebreak-score" ||
            status.status ===
              "resolved") && (
            <div className="competition-form">
              <p className="surtitle">
                DÉPARTAGE
              </p>

              <h3>
                Kata imposé
              </h3>

              <div className="competition-list">
                {(
                  tieBreak.passages || []
                ).map((passage) => {
                  const competitor =
                    getCompetitor(
                      passage.competitorId
                    );

                  if (!competitor) {
                    return null;
                  }

                  return (
                    <article
                      className={`competition ${
                        passage.statut ===
                        "Terminé"
                          ? "competition-terminee"
                          : ""
                      }`}
                      key={passage.id}
                    >
                      <div>
                        <p className="surtitle">
                          KATA IMPOSÉ
                        </p>

                        <h3>
                          {
                            competitor.nom
                          }{" "}
                          {
                            competitor.prenom
                          }
                        </h3>

                        {passage.statut ===
                          "Terminé" && (
                          <p>
                            Note :{" "}
                            <strong>
                              {Number(
                                passage.score
                              ).toFixed(
                                1
                              )}
                            </strong>
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        className="manage-button"
                        onClick={() =>
                          selectKataFinalPassage(
                            passage
                          )
                        }
                      >
                        {passage.statut ===
                        "Terminé"
                          ? "Modifier la note"
                          : "Noter le Kata imposé"}
                      </button>
                    </article>
                  );
                })}
              </div>
            </div>
          )}

        {status.status ===
          "flags" && (
          <div className="competition-form">
            <p className="surtitle">
              ÉGALITÉ PERSISTANTE
            </p>

            <h3>
              Décision aux drapeaux
            </h3>

            <p>
              Les compétiteurs sont
              encore à égalité après le
              Kata imposé.
            </p>

            <p>
              L'équipe d'arbitrage doit
              maintenant désigner le
              vainqueur aux drapeaux.
            </p>

            <div className="competition-actions">
              {status.passages.map(
                (passage) => {
                  const competitor =
                    getCompetitor(
                      passage.competitorId
                    );

                  if (!competitor) {
                    return null;
                  }

                  return (
                    <button
                      type="button"
                      className="manage-button"
                      key={
                        passage.competitorId
                      }
                      onClick={() =>
                        decideKataByFlags(
                          finalType,
                          passage.competitorId
                        )
                      }
                    >
                      🏁{" "}
                      {competitor.nom}{" "}
                      {
                        competitor.prenom
                      }
                    </button>
                  );
                }
              )}
            </div>
          </div>
        )}

        {(status.status ===
          "score" ||
          status.status ===
            "tiebreak-score" ||
          status.status ===
            "resolved") &&
          status.winnerId && (
            <div className="beta-note">
              <strong>
                🏆 Vainqueur :{" "}
                {getCompetitor(
                  status.winnerId
                )?.nom || ""}
                {" "}
                {getCompetitor(
                  status.winnerId
                )?.prenom || ""}
              </strong>

              {status.status ===
                "score" && (
                <p>
                  Victoire à la note de
                  finale.
                </p>
              )}

              {status.status ===
                "tiebreak-score" && (
                <p>
                  Victoire après Kata
                  imposé.
                </p>
              )}

              {status.decisionType ===
                "drapeaux" && (
                <p>
                  🏁 Victoire par
                  décision aux drapeaux.
                </p>
              )}
            </div>
          )}
      </section>
    );
  }

  /*
   * =========================================================
   * CALCULS POUR L'AFFICHAGE
   * =========================================================
   */

  const kataRanking =
    kataMode && selectedPool
      ? calculateKataRanking()
      : [];

  const qualificationsFinished =
    kataMode && selectedPool
      ? kataQualificationsFinished()
      : false;

  const combatRanking =
    !kataMode && selectedPool
      ? calculateCombatRanking()
      : [];

  const combatFinished =
    !kataMode && selectedPool
      ? combatQualificationsFinished()
      : false;

  /*
   * =========================================================
   * AFFICHAGE PRINCIPAL
   * =========================================================
   */

  return (
    <div className="arbitration-manager">
      <div className="manager-header">
        <div>
          <p className="surtitle">
            ARBITRAGE
          </p>

          <h2>Arbitrage</h2>

          <p>
            Saisie des résultats selon
            l'épreuve sélectionnée.
          </p>
        </div>
      </div>

      {pools.length === 0 ? (
        <div className="empty-state">
          <h3>
            Aucune poule disponible
          </h3>

          <p>
            Génère d'abord les poules
            avant de commencer
            l'arbitrage.
          </p>
        </div>
      ) : (
        <>
          <div className="competition-form">
            <label>
              Poule / catégorie

              <select
                value={selectedPoolId}
                onChange={(event) => {
                  setSelectedPoolId(
                    event.target.value
                  );

                  resetSelections();

                  setSelectedClosingMode(
                    ""
                  );
                }}
              >
                <option value="">
                  Sélectionner
                </option>

                {pools.map((pool) => {
                  const category =
                    getCategory(
                      pool.categoryId
                    );

                  const eventType =
                    category?.epreuve ||
                    pool.epreuve;

                  return (
                    <option
                      key={pool.id}
                      value={pool.id}
                    >
                      {getEventLabel(
                        eventType
                      )}
                      {" — "}
                      {pool.nom}
                    </option>
                  );
                })}
              </select>
            </label>
          </div>

          {/* =========================================
              KATA
          ========================================= */}

          {selectedPool &&
            kataMode && (
              <>
                <section className="category-section">
                  <div className="category-section-header">
                    <div>
                      <p className="surtitle">
                        {getEventLabel(
                          selectedEvent
                        )}
                      </p>

                      <h3>
                        {selectedPool.nom}
                      </h3>

                      <p>
                        Chaque compétiteur
                        effectue deux
                        passages.
                      </p>
                    </div>
                  </div>

                  <div className="competition-list">
                    {(
                      selectedPool.competitorIds ||
                      []
                    ).map(
                      renderKataCompetitor
                    )}
                  </div>
                </section>

                <section className="category-section">
                  <div className="category-section-header">
                    <div>
                      <p className="surtitle">
                        CLASSEMENT
                      </p>

                      <h3>
                        {selectedPool
                          .rankingLocked
                          ?.length
                          ? "Classement des qualifications"
                          : "Classement provisoire"}
                      </h3>
                    </div>
                  </div>

                  <div className="pool-ranking">
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

                      {kataRanking.map(
                        (
                          item,
                          index
                        ) => {
                          const competitor =
                            getCompetitor(
                              item.competitorId
                            );

                          if (
                            !competitor
                          ) {
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
                                {index +
                                  1}
                              </strong>

                              <strong>
                                {
                                  competitor.nom
                                }{" "}
                                {
                                  competitor.prenom
                                }
                              </strong>

                              <span>
                                {item.passage1 !==
                                null
                                  ? Number(
                                      item.passage1
                                    ).toFixed(
                                      1
                                    )
                                  : "—"}
                              </span>

                              <span>
                                {item.passage2 !==
                                null
                                  ? Number(
                                      item.passage2
                                    ).toFixed(
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
                </section>

                {/* CLÔTURE KATA */}

                {qualificationsFinished &&
                  !selectedPool.closingMode &&
                  finalPassages.length ===
                    0 && (
                    <div className="competition-form">
                      <p className="surtitle">
                        CLÔTURE
                      </p>

                      <h3>
                        Clôture de la
                        catégorie
                      </h3>

                      <p>
                        Les deux passages
                        de tous les
                        compétiteurs sont
                        terminés.
                      </p>

                      <label>
                        Mode de clôture

                        <select
                          value={
                            selectedClosingMode
                          }
                          onChange={(
                            event
                          ) =>
                            setSelectedClosingMode(
                              event
                                .target
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
                        onClick={
                          validateKataClosing
                        }
                      >
                        Valider la
                        clôture
                      </button>
                    </div>
                  )}

                {/* FINALES KATA */}

                {selectedPool.closingMode ===
                  "finals" &&
                  finalPassages.length >
                    0 && (
                    <>
                      {renderKataFinalGroup(
                        "finale",
                        "Finale"
                      )}

                      {renderKataFinalGroup(
                        "petite-finale",
                        "Petite finale"
                      )}
                    </>
                  )}

                {/* PODIUM KATA */}

                {selectedPool.podium && (
                  <section className="category-section">
                    <div className="pool-ranking">
                      <p className="surtitle">
                        RÉSULTAT
                      </p>

                      <h3>
                        Podium final
                      </h3>

                      <p>
                        🥇{" "}
                        {getCompetitor(
                          selectedPool
                            .podium
                            .firstId
                        )?.nom ||
                          "—"}{" "}
                        {getCompetitor(
                          selectedPool
                            .podium
                            .firstId
                        )?.prenom ||
                          ""}
                      </p>

                      <p>
                        🥈{" "}
                        {getCompetitor(
                          selectedPool
                            .podium
                            .secondId
                        )?.nom ||
                          "—"}{" "}
                        {getCompetitor(
                          selectedPool
                            .podium
                            .secondId
                        )?.prenom ||
                          ""}
                      </p>

                      <p>
                        🥉{" "}
                        {getCompetitor(
                          selectedPool
                            .podium
                            .thirdId
                        )?.nom ||
                          "—"}{" "}
                        {getCompetitor(
                          selectedPool
                            .podium
                            .thirdId
                        )?.prenom ||
                          ""}
                      </p>
                    </div>
                  </section>
                )}
              </>
            )}

          {/* =========================================
              JU RANDORI / COMBAT
          ========================================= */}

          {selectedPool &&
            !kataMode && (
              <>
                <section className="category-section">
                  <div className="category-section-header">
                    <div>
                      <p className="surtitle">
                        RENCONTRES DE
                        POULE
                      </p>

                      <h3>
                        {selectedPool.nom}
                      </h3>
                    </div>

                    <span className="status">
                      {
                        poolMatches.filter(
                          (match) =>
                            match.statut ===
                            "Terminé"
                        ).length
                      }
                      /
                      {
                        poolMatches.length
                      }{" "}
                      terminées
                    </span>
                  </div>

                  <div className="competition-list">
                    {poolMatches.map(
                      (
                        match,
                        index
                      ) =>
                        renderMatch(
                          match,
                          `RENCONTRE ${
                            index + 1
                          }`,
                          "pool"
                        )
                    )}
                  </div>
                </section>

                {/* CLASSEMENT COMBAT */}

                <section className="category-section">
                  <div className="category-section-header">
                    <div>
                      <p className="surtitle">
                        CLASSEMENT
                      </p>

                      <h3>
                        {selectedPool
                          .rankingLocked
                          ?.length
                          ? "Classement des qualifications"
                          : "Classement provisoire"}
                      </h3>
                    </div>
                  </div>

                  <div className="pool-ranking">
                    <div className="ranking-table">
                      <div className="ranking-header">
                        <span>
                          Place
                        </span>

                        <span>
                          Compétiteur
                        </span>

                        <span>
                          V
                        </span>

                        <span>
                          +/-
                        </span>

                        <span>
                          Points
                        </span>
                      </div>

                      {combatRanking.map(
                        (
                          item,
                          index
                        ) => {
                          const competitor =
                            getCompetitor(
                              item.competitorId
                            );

                          if (
                            !competitor
                          ) {
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
                                {index +
                                  1}
                              </strong>

                              <strong>
                                {
                                  competitor.nom
                                }{" "}
                                {
                                  competitor.prenom
                                }
                              </strong>

                              <span>
                                {
                                  item.victoires
                                }
                              </span>

                              <span>
                                {item.difference >
                                0
                                  ? "+"
                                  : ""}
                                {
                                  item.difference
                                }
                              </span>

                              <span>
                                {
                                  item.pointsPour
                                }
                              </span>
                            </div>
                          );
                        }
                      )}
                    </div>
                  </div>
                </section>

                {/* =====================================
                    CLÔTURE COMBAT
                ===================================== */}

                {combatFinished &&
                  !selectedPool.closingMode &&
                  finalMatches.length ===
                    0 && (
                    <div className="competition-form">
                      <p className="surtitle">
                        CLÔTURE
                      </p>

                      <h3>
                        Clôture de la
                        catégorie
                      </h3>

                      <p>
                        Toutes les
                        rencontres de
                        poule sont
                        terminées.
                      </p>

                      <p>
                        Tu peux maintenant
                        valider le
                        classement ou
                        organiser une
                        finale et une
                        petite finale.
                      </p>

                      <label>
                        Mode de clôture

                        <select
                          value={
                            selectedClosingMode
                          }
                          onChange={(
                            event
                          ) =>
                            setSelectedClosingMode(
                              event
                                .target
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
                        onClick={
                          validateCombatClosing
                        }
                      >
                        Valider la
                        clôture
                      </button>
                    </div>
                  )}

                {/* =====================================
                    PHASE FINALE COMBAT
                ===================================== */}

                {finalMatches.length >
                  0 && (
                  <section className="category-section">
                    <div className="category-section-header">
                      <div>
                        <p className="surtitle">
                          PHASE FINALE
                        </p>

                        <h3>
                          Finale et petite
                          finale
                        </h3>

                        <p>
                          Les deux premiers
                          du classement
                          disputent la
                          finale. Les
                          troisième et
                          quatrième
                          disputent la
                          petite finale.
                        </p>
                      </div>
                    </div>

                    <div className="competition-list">
                      {finalMatches.map(
                        (match) =>
                          renderMatch(
                            match,
                            match.label ||
                              "PHASE FINALE",
                            "final"
                          )
                      )}
                    </div>
                  </section>
                )}

                {/* PODIUM COMBAT */}

                {selectedPool.podium && (
                  <section className="category-section">
                    <div className="pool-ranking">
                      <p className="surtitle">
                        RÉSULTAT
                      </p>

                      <h3>
                        Podium final
                      </h3>

                      <p>
                        🥇{" "}
                        {getCompetitor(
                          selectedPool
                            .podium
                            .firstId
                        )?.nom ||
                          "—"}{" "}
                        {getCompetitor(
                          selectedPool
                            .podium
                            .firstId
                        )?.prenom ||
                          ""}
                      </p>

                      <p>
                        🥈{" "}
                        {getCompetitor(
                          selectedPool
                            .podium
                            .secondId
                        )?.nom ||
                          "—"}{" "}
                        {getCompetitor(
                          selectedPool
                            .podium
                            .secondId
                        )?.prenom ||
                          ""}
                      </p>

                      <p>
                        🥉{" "}
                        {getCompetitor(
                          selectedPool
                            .podium
                            .thirdId
                        )?.nom ||
                          "—"}{" "}
                        {getCompetitor(
                          selectedPool
                            .podium
                            .thirdId
                        )?.prenom ||
                          ""}
                      </p>

                      {selectedPool.podium
                        .fourthId && (
                        <p>
                          4e{" "}
                          {getCompetitor(
                            selectedPool
                              .podium
                              .fourthId
                          )?.nom ||
                            "—"}{" "}
                          {getCompetitor(
                            selectedPool
                              .podium
                              .fourthId
                          )?.prenom ||
                            ""}
                        </p>
                      )}
                    </div>
                  </section>
                )}
              </>
            )}

          {/* =========================================
              FEUILLE DE NOTATION
          ========================================= */}

          {(selectedMatch ||
            selectedPassage ||
            selectedFinalPassage) && (
            <div
              ref={notationSheetRef}
              className="notation-sheet-anchor"
            >
              {/* COMBAT */}

              {selectedMatch &&
                !kataMode && (
                  <MatchManager
                    key={`${selectedMatchType}-${selectedMatch.id}`}
                    type="ju-randori"
                    eventType={getEventLabel(
                      selectedEvent
                    )}
                    match={{
                      ...selectedMatch,

                      aka: getCompetitor(
                        selectedMatch.akaId
                      ),

                      shiro:
                        getCompetitor(
                          selectedMatch.shiroId
                        ),
                    }}
                    onSave={
                      saveOfficialMatch
                    }
                  />
                )}

              {/* KATA QUALIFICATION */}

              {selectedPassage &&
                kataMode && (
                  <MatchManager
                    key={
                      selectedPassage.id
                    }
                    type="kata"
                    competitor={getCompetitor(
                      selectedPassage.competitorId
                    )}
                    passage={
                      selectedPassage.numero
                    }
                    initialResult={
                      selectedPassage.statut ===
                      "Terminé"
                        ? {
                            notes:
                              selectedPassage.notes,

                            score:
                              selectedPassage.score,
                          }
                        : null
                    }
                    onSave={
                      saveKataPassage
                    }
                  />
                )}

              {/* KATA FINALE / DÉPARTAGE */}

              {selectedFinalPassage &&
                kataMode && (
                  <MatchManager
                    key={
                      selectedFinalPassage.id
                    }
                    type="kata"
                    kataStage={
                      selectedFinalPassage.phase ===
                      "departage"
                        ? "tie-break"
                        : selectedFinalPassage.type
                    }
                    competitor={getCompetitor(
                      selectedFinalPassage.competitorId
                    )}
                    passage={
                      selectedFinalPassage.phase ===
                      "departage"
                        ? "Kata imposé"
                        : null
                    }
                    initialResult={
                      selectedFinalPassage.statut ===
                      "Terminé"
                        ? {
                            notes:
                              selectedFinalPassage.notes,

                            score:
                              selectedFinalPassage.score,
                          }
                        : null
                    }
                    onSave={
                      saveKataFinalPassage
                    }
                  />
                )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default ArbitrationManager;
