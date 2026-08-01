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

const TIE_BREAK_ATTACKS = [
  {
    key: "tsuki",
    label: "Tsuki",
  },
  {
    key: "maeGeri",
    label: "Mae Geri",
  },
  {
    key: "mawashiGeri",
    label: "Mawashi Geri",
  },
];

function ArbitrationManager({
  competition,
  onUpdateCompetition,
}) {
  const pools = competition.pools || [];
  const competitors = competition.competitors || [];
  const categories = competition.categories || [];

  const notationSheetRef = useRef(null);

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

  function scrollToNotationSheet() {
    setTimeout(() => {
      notationSheetRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
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

  const poolMatches = selectedPool?.matches || [];

  const finalMatches =
    selectedPool?.finalMatches || [];

  const passages = selectedPool?.passages || [];

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

  const selectedPassage = passages.find((passage) =>
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
      sameId(passage.id, selectedFinalPassageId)
    );

  function resetSelections() {
    setSelectedMatchId("");
    setSelectedMatchType("");
    setSelectedPassageId("");
    setSelectedFinalPassageId("");
  }

  /*
   * =========================================================
   * COMBAT — RENCONTRE DIRECTE
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
        ((sameId(match.akaId, competitorAId) &&
          sameId(match.shiroId, competitorBId)) ||
          (sameId(match.akaId, competitorBId) &&
            sameId(match.shiroId, competitorAId)))
    );
  }

  /*
   * =========================================================
   * COMBAT — DÉPARTAGES ENREGISTRÉS
   * =========================================================
   */

  function getSavedPoolTieBreak(
    pool,
    competitorAId,
    competitorBId
  ) {
    const tieBreaks = pool?.combatTieBreaks || [];

    return tieBreaks.find((item) => {
      const ids = item.competitorIds || [];

      return (
        ids.length === 2 &&
        ids.some((id) =>
          sameId(id, competitorAId)
        ) &&
        ids.some((id) =>
          sameId(id, competitorBId)
        )
      );
    });
  }

  function getSavedPoolTieBreakWinner(
    pool,
    competitorAId,
    competitorBId
  ) {
    const tieBreak = getSavedPoolTieBreak(
      pool,
      competitorAId,
      competitorBId
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

  /*
   * =========================================================
   * JU RANDORI — CLASSEMENT RÉGLEMENTAIRE
   * =========================================================
   *
   * 1. Nombre de victoires
   * 2. Moins de points négatifs
   * 3. Rencontre directe
   * 4. Départage réglementaire enregistré
   *
   * PAS de différence de score.
   * PAS de score marqué pour départager.
   */

  function calculateCombatRanking(pool) {
    if (!pool) {
      return [];
    }

    const competitorIds = pool.competitorIds || [];
    const matches = pool.matches || [];

    const ranking = competitorIds.map(
      (competitorId) => ({
        competitorId,

        victories: 0,
        defeats: 0,
        draws: 0,

        scoreFor: 0,
        scoreAgainst: 0,

        difference: 0,

        negativePoints: 0,

        matchesPlayed: 0,
      })
    );

    function findRow(id) {
      return ranking.find((row) =>
        sameId(row.competitorId, id)
      );
    }

    matches.forEach((match) => {
      if (match.statut !== "Terminé") {
        return;
      }

      const aka = findRow(match.akaId);
      const shiro = findRow(match.shiroId);

      if (!aka || !shiro) {
        return;
      }

      const akaScore = Number(match.akaScore) || 0;
      const shiroScore =
        Number(match.shiroScore) || 0;

      aka.matchesPlayed += 1;
      shiro.matchesPlayed += 1;

      aka.scoreFor += akaScore;
      aka.scoreAgainst += shiroScore;

      shiro.scoreFor += shiroScore;
      shiro.scoreAgainst += akaScore;

      aka.negativePoints +=
        Number(match.pointsNegatifsAka) || 0;

      shiro.negativePoints +=
        Number(match.pointsNegatifsShiro) || 0;

      if (sameId(match.winnerId, match.akaId)) {
        aka.victories += 1;
        shiro.defeats += 1;
      } else if (
        sameId(match.winnerId, match.shiroId)
      ) {
        shiro.victories += 1;
        aka.defeats += 1;
      } else {
        aka.draws += 1;
        shiro.draws += 1;
      }
    });

    ranking.forEach((row) => {
      row.difference =
        row.scoreFor - row.scoreAgainst;
    });

    ranking.sort((a, b) => {
      /*
       * 1. VICTOIRES
       */

      if (b.victories !== a.victories) {
        return b.victories - a.victories;
      }

      /*
       * 2. POINTS NÉGATIFS
       */

      if (a.negativePoints !== b.negativePoints) {
        return a.negativePoints - b.negativePoints;
      }

      /*
       * 3. RENCONTRE DIRECTE
       */

      const directMatch = getDirectMatch(
        matches,
        a.competitorId,
        b.competitorId
      );

      if (
        directMatch &&
        sameId(
          directMatch.winnerId,
          a.competitorId
        )
      ) {
        return -1;
      }

      if (
        directMatch &&
        sameId(
          directMatch.winnerId,
          b.competitorId
        )
      ) {
        return 1;
      }

      /*
       * 4. DÉPARTAGE
       */

      const tieBreakWinner =
        getSavedPoolTieBreakWinner(
          pool,
          a.competitorId,
          b.competitorId
        );

      if (
        tieBreakWinner &&
        sameId(tieBreakWinner, a.competitorId)
      ) {
        return -1;
      }

      if (
        tieBreakWinner &&
        sameId(tieBreakWinner, b.competitorId)
      ) {
        return 1;
      }

      return 0;
    });

    return ranking;
  }

  function combatQualificationsFinished(pool) {
    if (!pool) {
      return false;
    }

    const matches = pool.matches || [];

    return (
      matches.length > 0 &&
      matches.every(
        (match) => match.statut === "Terminé"
      )
    );
  }

  /*
   * =========================================================
   * COMBAT — DÉTECTION ÉGALITÉS
   * =========================================================
   */

  function competitorsNeedTieBreak(
    pool,
    competitorA,
    competitorB
  ) {
    if (!competitorA || !competitorB) {
      return false;
    }

    if (
      competitorA.victories !== competitorB.victories
    ) {
      return false;
    }

    if (
      competitorA.negativePoints !==
      competitorB.negativePoints
    ) {
      return false;
    }

    const savedWinner = getSavedPoolTieBreakWinner(
      pool,
      competitorA.competitorId,
      competitorB.competitorId
    );

    if (savedWinner) {
      return false;
    }

    const directMatch = getDirectMatch(
      pool.matches || [],
      competitorA.competitorId,
      competitorB.competitorId
    );

    if (
      directMatch?.winnerId &&
      (sameId(
        directMatch.winnerId,
        competitorA.competitorId
      ) ||
        sameId(
          directMatch.winnerId,
          competitorB.competitorId
        ))
    ) {
      return false;
    }

    return true;
  }

  function getCombatTieBreaksNeeded(pool) {
    if (!combatQualificationsFinished(pool)) {
      return [];
    }

    const ranking = calculateCombatRanking(pool);

    const ties = [];

    for (let i = 0; i < ranking.length; i++) {
      for (let j = i + 1; j < ranking.length; j++) {
        const a = ranking[i];
        const b = ranking[j];

        if (competitorsNeedTieBreak(pool, a, b)) {
          ties.push({
            competitorAId: a.competitorId,
            competitorBId: b.competitorId,
            victories: a.victories,
            negativePoints: a.negativePoints,
          });
        }
      }
    }

    return ties;
  }

  /*
   * =========================================================
   * COMBAT — CRÉER UN DÉPARTAGE
   * =========================================================
   */

  function startCombatTieBreak(
    competitorAId,
    competitorBId
  ) {
    if (!selectedPool) {
      return;
    }

    const existing = getSavedPoolTieBreak(
      selectedPool,
      competitorAId,
      competitorBId
    );

    if (existing) {
      return;
    }

    const now = Date.now();

    const newTieBreak = {
      id: `${now}-combat-tiebreak`,

      competitorIds: [competitorAId, competitorBId],

      competitorAId,
      competitorBId,

      attacks: TIE_BREAK_ATTACKS.map(
        (attack, index) => ({
          id: `${now}-attack-${index}`,

          key: attack.key,
          label: attack.label,

          winnerId: null,
        })
      ),

      scoreA: 0,
      scoreB: 0,

      winnerId: null,
      loserId: null,

      decisionType: null,

      statut: "En cours",
    };

    const updatedPools = pools.map((pool) =>
      sameId(pool.id, selectedPool.id)
        ? {
            ...pool,

            combatTieBreaks: [
              ...(pool.combatTieBreaks || []),
              newTieBreak,
            ],
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
   * COMBAT — VAINQUEUR D'UNE ATTAQUE
   * =========================================================
   */

  function setCombatTieBreakAttackWinner(
    tieBreakId,
    attackId,
    winnerId
  ) {
    if (!selectedPool) {
      return;
    }

    const updatedPools = pools.map((pool) => {
      if (!sameId(pool.id, selectedPool.id)) {
        return pool;
      }

      const updatedTieBreaks = (
        pool.combatTieBreaks || []
      ).map((tieBreak) => {
        if (!sameId(tieBreak.id, tieBreakId)) {
          return tieBreak;
        }

        const updatedAttacks = (
          tieBreak.attacks || []
        ).map((attack) =>
          sameId(attack.id, attackId)
            ? {
                ...attack,
                winnerId,
              }
            : attack
        );

        const scoreA = updatedAttacks.filter(
          (attack) =>
            sameId(
              attack.winnerId,
              tieBreak.competitorAId
            )
        ).length;

        const scoreB = updatedAttacks.filter(
          (attack) =>
            sameId(
              attack.winnerId,
              tieBreak.competitorBId
            )
        ).length;

        return {
          ...tieBreak,

          attacks: updatedAttacks,

          scoreA,
          scoreB,
        };
      });

      return {
        ...pool,
        combatTieBreaks: updatedTieBreaks,
      };
    });

    onUpdateCompetition({
      ...competition,
      pools: updatedPools,
    });
  }

  /*
   * =========================================================
   * COMBAT — VALIDER LES 3 ATTAQUES
   * =========================================================
   */

  function validateCombatTieBreakAttacks(
    tieBreakId
  ) {
    if (!selectedPool) {
      return;
    }

    const tieBreak = (
      selectedPool.combatTieBreaks || []
    ).find((item) => sameId(item.id, tieBreakId));

    if (!tieBreak) {
      return;
    }

    const attacks = tieBreak.attacks || [];

    if (
      attacks.length !== 3 ||
      attacks.some((attack) => !attack.winnerId)
    ) {
      alert(
        "Renseigne le résultat des 3 attaques : Tsuki, Mae Geri et Mawashi Geri."
      );

      return;
    }

    const scoreA = attacks.filter((attack) =>
      sameId(
        attack.winnerId,
        tieBreak.competitorAId
      )
    ).length;

    const scoreB = attacks.filter((attack) =>
      sameId(
        attack.winnerId,
        tieBreak.competitorBId
      )
    ).length;

    if (scoreA === scoreB) {
      const updatedPools = pools.map((pool) =>
        sameId(pool.id, selectedPool.id)
          ? {
              ...pool,

              combatTieBreaks: (
                pool.combatTieBreaks || []
              ).map((item) =>
                sameId(item.id, tieBreakId)
                  ? {
                      ...item,

                      scoreA,
                      scoreB,

                      decisionType: "drapeaux",

                      statut: "Drapeaux",
                    }
                  : item
              ),
            }
          : pool
      );

      onUpdateCompetition({
        ...competition,
        pools: updatedPools,
      });

      return;
    }

    const winnerId =
      scoreA > scoreB
        ? tieBreak.competitorAId
        : tieBreak.competitorBId;

    const loserId = sameId(
      winnerId,
      tieBreak.competitorAId
    )
      ? tieBreak.competitorBId
      : tieBreak.competitorAId;

    finishCombatTieBreak(
      tieBreakId,
      winnerId,
      loserId,
      "3-attaques",
      scoreA,
      scoreB
    );
  }

  /*
   * =========================================================
   * COMBAT — FINALISER DÉPARTAGE
   * =========================================================
   */

  function finishCombatTieBreak(
    tieBreakId,
    winnerId,
    loserId,
    decisionType,
    scoreA = null,
    scoreB = null
  ) {
    if (!selectedPool) {
      return;
    }

    const updatedPools = pools.map((pool) => {
      if (!sameId(pool.id, selectedPool.id)) {
        return pool;
      }

      return {
        ...pool,

        combatTieBreaks: (
          pool.combatTieBreaks || []
        ).map((tieBreak) =>
          sameId(tieBreak.id, tieBreakId)
            ? {
                ...tieBreak,

                scoreA: scoreA ?? tieBreak.scoreA,
                scoreB: scoreB ?? tieBreak.scoreB,

                winnerId,
                loserId,

                decisionType,

                statut: "Terminé",
              }
            : tieBreak
        ),
      };
    });

    onUpdateCompetition({
      ...competition,
      pools: updatedPools,
    });
  }

  /*
   * =========================================================
   * COMBAT — DRAPEAUX
   * =========================================================
   */

  function decideCombatTieBreakByFlags(
    tieBreak,
    winnerId
  ) {
    const loserId = sameId(
      winnerId,
      tieBreak.competitorAId
    )
      ? tieBreak.competitorBId
      : tieBreak.competitorAId;

    finishCombatTieBreak(
      tieBreak.id,
      winnerId,
      loserId,
      "drapeaux"
    );
  }

  /*
   * =========================================================
   * COMBAT — PODIUM PHASE FINALE
   * =========================================================
   */

  function calculateCombatPodium(
    finalMatchesList
  ) {
    const finale = finalMatchesList.find(
      (match) => match.type === "finale"
    );

    const petiteFinale = finalMatchesList.find(
      (match) => match.type === "petite-finale"
    );

    if (
      !finale ||
      !petiteFinale ||
      finale.statut !== "Terminé" ||
      petiteFinale.statut !== "Terminé" ||
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
      thirdId: petiteFinale.winnerId,
      fourthId,
    };
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
   * COMBAT — ENREGISTREMENT
   * =========================================================
   */
function updateMatchStatus(
  match,
  matchType,
  newStatus
) {
  if (!selectedPool) return;

  const updatedPools = pools.map((pool) => {
    if (!sameId(pool.id, selectedPool.id)) {
      return pool;
    }

    const key =
      matchType === "final"
        ? "finalMatches"
        : "matches";

    return {
      ...pool,

      [key]: pool[key].map((m) =>
        sameId(m.id, match.id)
          ? {
              ...m,
              statut: newStatus,
            }
          : m
      ),
    };
  });

  onUpdateCompetition({
    ...competition,
    pools: updatedPools,
  });
}  function saveOfficialMatch(result) {
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

      /*
       * 7 ASSAUTS
       */

      assauts: result.assauts || [],

      akaScore: result.scoreAka,
      shiroScore: result.scoreShiro,

      scoreBrutAka: result.scoreBrutAka,
      scoreBrutShiro: result.scoreBrutShiro,

      /*
       * PÉNALITÉS
       */

      penalitesAka: result.penalitesAka,
      penalitesShiro: result.penalitesShiro,

      pointsNegatifsAka:
        result.pointsNegatifsAka,

      pointsNegatifsShiro:
        result.pointsNegatifsShiro,

      akaDisqualifie:
        result.akaDisqualifie,

      shiroDisqualifie:
        result.shiroDisqualifie,

      /*
       * DÉPARTAGE DU COMBAT
       */

      departageActif: Boolean(
        result.departageActif
      ),

      assautsDepartage:
        result.assautsDepartage || [],

      scoreDepartageAka:
        result.scoreDepartageAka ?? null,

      scoreDepartageShiro:
        result.scoreDepartageShiro ?? null,

      /*
       * RÉSULTAT OFFICIEL
       */

      winnerId,

      decisionType:
        result.decisionType || "score",

      decisionDrapeaux:
        result.decisionDrapeaux || null,

      statut: "Terminé",
    };

    const updatedPools = pools.map((pool) => {
      if (!sameId(pool.id, selectedPool.id)) {
        return pool;
      }

      /*
       * PHASE FINALE
       */

      if (selectedMatchType === "final") {
        const updatedFinalMatches = (
          pool.finalMatches || []
        ).map((match) =>
          sameId(match.id, selectedMatch.id)
            ? savedMatch
            : match
        );

        const podium = calculateCombatPodium(
          updatedFinalMatches
        );

        return {
          ...pool,

          finalMatches: updatedFinalMatches,

          podium,

          statut: podium
            ? "Terminée"
            : "Phase finale",
        };
      }

      /*
       * RENCONTRE DE POULE
       */

      const updatedPoolMatches = (
        pool.matches || []
      ).map((match) =>
        sameId(match.id, selectedMatch.id)
          ? savedMatch
          : match
      );

      return {
        ...pool,

        matches: updatedPoolMatches,

        /*
         * Une modification d'un combat
         * invalide les éventuels départages
         * de classement précédents.
         */

        combatTieBreaks: [],
      };
    });

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

  function getKataPassage(competitorId, numero) {
    return passages.find(
      (passage) =>
        sameId(passage.competitorId, competitorId) &&
        Number(passage.numero) === Number(numero)
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
    if (!selectedPool || !selectedPassage) {
      return;
    }

    const updatedPassages = (
      selectedPool.passages || []
    ).map((passage) => {
      if (
        !sameId(passage.id, selectedPassage.id)
      ) {
        return passage;
      }

      return {
        ...passage,

        notes: result.notes || [],

        notesRetenues:
          result.notesRetenues || [],

        noteMinRetiree: result.noteMin,
        noteMaxRetiree: result.noteMax,

        score: Number(result.score) || 0,

        statut: "Terminé",
      };
    });

    const updatedPools = pools.map((pool) =>
      sameId(pool.id, selectedPool.id)
        ? {
            ...pool,
            passages: updatedPassages,
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

    return (selectedPool.competitorIds || [])
      .map((competitorId) => {
        const passage1 = getKataPassage(
          competitorId,
          1
        );

        const passage2 = getKataPassage(
          competitorId,
          2
        );

        const passage1Finished =
          passage1?.statut === "Terminé";

        const passage2Finished =
          passage2?.statut === "Terminé";

        const score1 = passage1Finished
          ? Number(passage1.score) || 0
          : null;

        const score2 = passage2Finished
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

          total: (score1 || 0) + (score2 || 0),
        };
      })
      .sort((a, b) => {
        if (
          b.passagesTermines !== a.passagesTermines
        ) {
          return (
            b.passagesTermines - a.passagesTermines
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

    return competitorIds.every((competitorId) => {
      const passage1 = getKataPassage(
        competitorId,
        1
      );

      const passage2 = getKataPassage(
        competitorId,
        2
      );

      return (
        passage1?.statut === "Terminé" &&
        passage2?.statut === "Terminé"
      );
    });
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

      notes: [null, null, null, null, null],

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
      alert("Choisis un mode de clôture.");
      return;
    }

    const ranking = calculateKataRanking();

    if (selectedClosingMode === "direct") {
      const podium = {
        firstId: ranking[0]?.competitorId || null,
        secondId: ranking[1]?.competitorId || null,
        thirdId: ranking[2]?.competitorId || null,
        fourthId: ranking[3]?.competitorId || null,
      };

      const updatedPools = pools.map((pool) =>
        sameId(pool.id, selectedPool.id)
          ? {
              ...pool,

              closingMode: "direct",

              rankingLocked: ranking,

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

    if (selectedClosingMode === "finals") {
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
          competitorId: ranking[0].competitorId,
        }),

        createEmptyKataPassage({
          id: `${now}-kata-final-2`,
          type: "finale",
          label: "Finale",
          competitorId: ranking[1].competitorId,
        }),

        createEmptyKataPassage({
          id: `${now}-kata-bronze-1`,
          type: "petite-finale",
          label: "Petite finale",
          competitorId: ranking[2].competitorId,
        }),

        createEmptyKataPassage({
          id: `${now}-kata-bronze-2`,
          type: "petite-finale",
          label: "Petite finale",
          competitorId: ranking[3].competitorId,
        }),
      ];

      const updatedPools = pools.map((pool) =>
        sameId(pool.id, selectedPool.id)
          ? {
              ...pool,

              closingMode: "finals",

              rankingLocked: ranking,

              finalPassages: newFinalPassages,

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

  function selectKataFinalPassage(passage) {
    if (!passage) {
      return;
    }

    setSelectedFinalPassageId(passage.id);

    setSelectedPassageId("");
    setSelectedMatchId("");
    setSelectedMatchType("");

    scrollToNotationSheet();
  }

  function getKataFinalGroup(pool, finalType) {
    return (pool.finalPassages || []).filter(
      (passage) => passage.type === finalType
    );
  }

  function getKataFinalStatus(pool, finalType) {
    const savedResult =
      pool.kataFinalResults?.[finalType];

    if (savedResult?.winnerId) {
      return {
        status: "resolved",
        ...savedResult,
      };
    }

    const group = getKataFinalGroup(
      pool,
      finalType
    );

    if (group.length !== 2) {
      return {
        status: "waiting",
      };
    }

    const allFinished = group.every(
      (passage) => passage.statut === "Terminé"
    );

    if (!allFinished) {
      return {
        status: "waiting",
      };
    }

    const scoreA = Number(group[0].score) || 0;
    const scoreB = Number(group[1].score) || 0;

    if (scoreA > scoreB) {
      return {
        status: "score",

        winnerId: group[0].competitorId,
        loserId: group[1].competitorId,

        scoreA,
        scoreB,
      };
    }

    if (scoreB > scoreA) {
      return {
        status: "score",

        winnerId: group[1].competitorId,
        loserId: group[0].competitorId,

        scoreA,
        scoreB,
      };
    }

    const tieBreak =
      pool.kataTieBreaks?.[finalType];

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

        winnerId: tieBreak.winnerId,
        loserId: tieBreak.loserId,

        decisionType: tieBreak.decisionType,
      };
    }

    const tiePassages = tieBreak.passages || [];

    if (tiePassages.length !== 2) {
      return {
        status: "tie",
        competitors: group,
      };
    }

    const tieFinished = tiePassages.every(
      (passage) => passage.statut === "Terminé"
    );

    if (!tieFinished) {
      return {
        status: "tiebreak",
        passages: tiePassages,
      };
    }

    const tieScoreA =
      Number(tiePassages[0].score) || 0;

    const tieScoreB =
      Number(tiePassages[1].score) || 0;

    if (tieScoreA > tieScoreB) {
      return {
        status: "tiebreak-score",

        winnerId: tiePassages[0].competitorId,
        loserId: tiePassages[1].competitorId,

        scoreA: tieScoreA,
        scoreB: tieScoreB,
      };
    }

    if (tieScoreB > tieScoreA) {
      return {
        status: "tiebreak-score",

        winnerId: tiePassages[1].competitorId,
        loserId: tiePassages[0].competitorId,

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

  function resolveKataFinalResults(pool) {
    const types = ["finale", "petite-finale"];

    const currentResults = {
      ...(pool.kataFinalResults || {}),
    };

    types.forEach((finalType) => {
      if (currentResults[finalType]?.winnerId) {
        return;
      }

      const status = getKataFinalStatus(
        {
          ...pool,
          kataFinalResults: currentResults,
        },
        finalType
      );

      if (status.status === "score") {
        currentResults[finalType] = {
          winnerId: status.winnerId,
          loserId: status.loserId,
          decisionType: "score",
        };
      }

      if (status.status === "tiebreak-score") {
        currentResults[finalType] = {
          winnerId: status.winnerId,
          loserId: status.loserId,
          decisionType: "kata-impose",
        };
      }

      if (
        status.status === "resolved" &&
        status.winnerId
      ) {
        currentResults[finalType] = {
          winnerId: status.winnerId,
          loserId: status.loserId,
          decisionType:
            status.decisionType || "drapeaux",
        };
      }
    });

    const finale = currentResults.finale;

    const bronze =
      currentResults["petite-finale"];

    const podium =
      finale?.winnerId &&
      finale?.loserId &&
      bronze?.winnerId &&
      bronze?.loserId
        ? {
            firstId: finale.winnerId,
            secondId: finale.loserId,
            thirdId: bronze.winnerId,
            fourthId: bronze.loserId,
          }
        : null;

    return {
      kataFinalResults: currentResults,

      podium,

      statut: podium
        ? "Terminée"
        : "Phase finale",
    };
  }

  function saveKataFinalPassage(result) {
    if (!selectedPool || !selectedFinalPassage) {
      return;
    }

    const isTieBreak =
      selectedFinalPassage.phase === "departage";

    let updatedPool = {
      ...selectedPool,
    };

    if (!isTieBreak) {
      const updatedFinalPassages = (
        selectedPool.finalPassages || []
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

          notes: result.notes || [],

          notesRetenues:
            result.notesRetenues || [],

          noteMinRetiree: result.noteMin,
          noteMaxRetiree: result.noteMax,

          score: Number(result.score) || 0,

          statut: "Terminé",
        };
      });

      updatedPool = {
        ...updatedPool,

        finalPassages: updatedFinalPassages,
      };
    }

    if (isTieBreak) {
      const finalType =
        selectedFinalPassage.finalType;

      const currentTieBreak =
        selectedPool.kataTieBreaks?.[finalType];

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

          notes: result.notes || [],

          notesRetenues:
            result.notesRetenues || [],

          noteMinRetiree: result.noteMin,
          noteMaxRetiree: result.noteMax,

          score: Number(result.score) || 0,

          statut: "Terminé",
        };
      });

      updatedPool = {
        ...updatedPool,

        kataTieBreaks: {
          ...(selectedPool.kataTieBreaks || {}),

          [finalType]: {
            ...currentTieBreak,
            passages: updatedTiePassages,
          },
        },
      };
    }

    const resolution =
      resolveKataFinalResults(updatedPool);

    updatedPool = {
      ...updatedPool,
      ...resolution,
    };

    const updatedPools = pools.map((pool) =>
      sameId(pool.id, selectedPool.id)
        ? updatedPool
        : pool
    );

    onUpdateCompetition({
      ...competition,
      pools: updatedPools,
    });

    setSelectedFinalPassageId("");
  }

  function startKataTieBreak(finalType) {
    if (!selectedPool) {
      return;
    }

    const group = getKataFinalGroup(
      selectedPool,
      finalType
    );

    if (group.length !== 2) {
      return;
    }

    const scoreA = Number(group[0].score);
    const scoreB = Number(group[1].score);

    if (scoreA !== scoreB) {
      return;
    }

    const now = Date.now();

    const tiePassages = group.map(
      (passage, index) =>
        createEmptyKataPassage({
          id: `${now}-${finalType}-departage-${
            index + 1
          }`,

          type: "departage",

          label: "Kata imposé",

          competitorId: passage.competitorId,

          phase: "departage",
        })
    );

    tiePassages.forEach((passage) => {
      passage.finalType = finalType;
    });

    const updatedPools = pools.map((pool) =>
      sameId(pool.id, selectedPool.id)
        ? {
            ...pool,

            kataTieBreaks: {
              ...(pool.kataTieBreaks || {}),

              [finalType]: {
                passages: tiePassages,

                winnerId: null,
                loserId: null,

                decisionType: null,
              },
            },

            podium: null,

            statut: "Phase finale",
          }
        : pool
    );

    onUpdateCompetition({
      ...competition,
      pools: updatedPools,
    });
  }

  function decideKataByFlags(
    finalType,
    winnerId
  ) {
    if (!selectedPool) {
      return;
    }

    const tieBreak =
      selectedPool.kataTieBreaks?.[finalType];

    if (!tieBreak) {
      return;
    }

    const competitorIds = (
      tieBreak.passages || []
    ).map((passage) => passage.competitorId);

    const loserId =
      competitorIds.find(
        (id) => !sameId(id, winnerId)
      ) || null;

    if (!loserId) {
      return;
    }

    let updatedPool = {
      ...selectedPool,

      kataTieBreaks: {
        ...(selectedPool.kataTieBreaks || {}),

        [finalType]: {
          ...tieBreak,

          winnerId,
          loserId,

          decisionType: "drapeaux",
        },
      },

      kataFinalResults: {
        ...(selectedPool.kataFinalResults || {}),

        [finalType]: {
          winnerId,
          loserId,

          decisionType: "drapeaux",
        },
      },
    };

    const resolution =
      resolveKataFinalResults(updatedPool);

    updatedPool = {
      ...updatedPool,
      ...resolution,
    };

    const updatedPools = pools.map((pool) =>
      sameId(pool.id, selectedPool.id)
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

 function renderMatch(match, label, matchType) {
  const aka = getCompetitor(match.akaId);
  const shiro = getCompetitor(match.shiroId);

  const winner = match.winnerId
    ? getCompetitor(match.winnerId)
    : null;

  const statusIcon =
    match.statut === "Terminé"
      ? "🟢"
      : match.statut === "En cours"
      ? "🔴"
      : match.statut === "Appelé"
      ? "🟡"
      : "⚪";

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
          Combat {match.numero || ""}
        </h3>

        <p>
          {statusIcon} {match.statut}
        </p>

        <h3>
          🔴 AKA —{" "}
          {aka
            ? `${aka.nom} ${aka.prenom}`
            : "Inconnu"}
        </h3>

        <p>VS</p>

        <h3>
          ⚪ SHIRO —{" "}
          {shiro
            ? `${shiro.nom} ${shiro.prenom}`
            : "Inconnu"}
        </h3>

        {match.statut === "Terminé" && (
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

            <p>
              PN AKA :{" "}
              {Number(match.pointsNegatifsAka) || 0}
              {" · "}
              PN SHIRO :{" "}
              {Number(match.pointsNegatifsShiro) || 0}
            </p>
          </div>
        )}
      </div>

     <div className="competition-actions">

  {match.statut === "À jouer" && (
    <button
      className="manage-button"
      type="button"
      onClick={() =>
        updateMatchStatus(
          match,
          matchType,
          "Appelé"
        )
      }
    >
      📢 Appeler
    </button>
  )}

  {match.statut === "Appelé" && (
    <button
      className="primary"
      type="button"
      onClick={() =>
        updateMatchStatus(
          match,
          matchType,
          "En cours"
        )
      }
    >
      ▶ Démarrer
    </button>
  )}

  {(match.statut === "En cours" ||
    match.statut === "Terminé") && (
    <button
      className="manage-button"
      type="button"
      onClick={() =>
        selectMatch(match, matchType)
      }
    >
      {match.statut === "Terminé"
        ? "Modifier"
        : "Arbitrer"}
    </button>
  )}

</div>        {match.statut === "Terminé"
          ? "Modifier"
          : "Arbitrer"}
      </button>
    </article>
  );
}
  /*
   * =========================================================
   * AFFICHAGE DÉPARTAGE COMBAT
   * =========================================================
   */

  function renderCombatTieBreak(tieBreak) {
    const competitorA = getCompetitor(
      tieBreak.competitorAId
    );

    const competitorB = getCompetitor(
      tieBreak.competitorBId
    );

    const winner = tieBreak.winnerId
      ? getCompetitor(tieBreak.winnerId)
      : null;

    return (
      <article
        className={`competition ${
          tieBreak.statut === "Terminé"
            ? "competition-terminee"
            : ""
        }`}
        key={tieBreak.id}
      >
        <div>
          <p className="surtitle">
            DÉPARTAGE
          </p>

          <h3>
            {competitorA
              ? `${competitorA.nom} ${competitorA.prenom}`
              : "Compétiteur"}
          </h3>

          <p>contre</p>

          <h3>
            {competitorB
              ? `${competitorB.nom} ${competitorB.prenom}`
              : "Compétiteur"}
          </h3>

          {tieBreak.statut === "Terminé" ? (
            <div className="beta-note">
              <strong>
                ✅ Départage terminé
              </strong>

              <p>
                Vainqueur :{" "}
                {winner
                  ? `${winner.nom} ${winner.prenom}`
                  : "—"}
              </p>

              <p>
                Décision :{" "}
                {tieBreak.decisionType === "drapeaux"
                  ? "Drapeaux"
                  : "3 attaques supplémentaires"}
              </p>
            </div>
          ) : (
            <>
              <div className="beta-note">
                <strong>
                  3 attaques supplémentaires
                </strong>

                <p>
                  Tsuki · Mae Geri · Mawashi Geri
                </p>
              </div>

              {(tieBreak.attacks || []).map(
                (attack) => (
                  <div
                    className="competition-form"
                    key={attack.id}
                  >
                    <h3>{attack.label}</h3>

                    <div className="competition-actions">
                      <button
                        type="button"
                        className={
                          sameId(
                            attack.winnerId,
                            tieBreak.competitorAId
                          )
                            ? "primary"
                            : "manage-button"
                        }
                        onClick={() =>
                          setCombatTieBreakAttackWinner(
                            tieBreak.id,
                            attack.id,
                            tieBreak.competitorAId
                          )
                        }
                      >
                        {competitorA
                          ? `${competitorA.nom} ${competitorA.prenom}`
                          : "A"}
                      </button>

                      <button
                        type="button"
                        className={
                          sameId(
                            attack.winnerId,
                            tieBreak.competitorBId
                          )
                            ? "primary"
                            : "manage-button"
                        }
                        onClick={() =>
                          setCombatTieBreakAttackWinner(
                            tieBreak.id,
                            attack.id,
                            tieBreak.competitorBId
                          )
                        }
                      >
                        {competitorB
                          ? `${competitorB.nom} ${competitorB.prenom}`
                          : "B"}
                      </button>
                    </div>
                  </div>
                )
              )}

              <div className="beta-note">
                <strong>Score départage</strong>

                <p>
                  {competitorA?.nom || "A"}
                  {" : "}
                  {tieBreak.scoreA || 0}
                  {" — "}
                  {competitorB?.nom || "B"}
                  {" : "}
                  {tieBreak.scoreB || 0}
                </p>
              </div>

              {tieBreak.statut !== "Drapeaux" && (
                <button
                  type="button"
                  className="primary"
                  onClick={() =>
                    validateCombatTieBreakAttacks(
                      tieBreak.id
                    )
                  }
                >
                  Valider les 3 attaques
                </button>
              )}

              {tieBreak.statut === "Drapeaux" && (
                <div className="competition-form">
                  <p className="surtitle">
                    ÉGALITÉ
                  </p>

                  <h3>
                    Décision aux drapeaux
                  </h3>

                  <div className="competition-actions">
                    <button
                      type="button"
                      className="manage-button"
                      onClick={() =>
                        decideCombatTieBreakByFlags(
                          tieBreak,
                          tieBreak.competitorAId
                        )
                      }
                    >
                      🏁{" "}
                      {competitorA
                        ? `${competitorA.nom} ${competitorA.prenom}`
                        : "A"}
                    </button>

                    <button
                      type="button"
                      className="manage-button"
                      onClick={() =>
                        decideCombatTieBreakByFlags(
                          tieBreak,
                          tieBreak.competitorBId
                        )
                      }
                    >
                      🏁{" "}
                      {competitorB
                        ? `${competitorB.nom} ${competitorB.prenom}`
                        : "B"}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </article>
    );
  }

  /*
   * =========================================================
   * AFFICHAGE KATA QUALIFICATIONS
   * =========================================================
   */

  function renderKataCompetitor(competitorId) {
    const competitor = getCompetitor(competitorId);

    if (!competitor) {
      return null;
    }

    const passage1 = getKataPassage(
      competitorId,
      1
    );

    const passage2 = getKataPassage(
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
          <p className="surtitle">KATA</p>

          <h3>
            {competitor.nom} {competitor.prenom}
          </h3>

          <p>
            {competitor.club ||
              "Club non renseigné"}
          </p>

          <div className="competitor-events">
            <span>
              Passage 1 :{" "}
              {passage1Finished
                ? Number(passage1.score).toFixed(1)
                : "À noter"}
            </span>

            <span>
              Passage 2 :{" "}
              {passage2Finished
                ? Number(passage2.score).toFixed(1)
                : "À noter"}
            </span>

            {passage1Finished &&
              passage2Finished && (
                <span>
                  Total : {total.toFixed(1)}
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
                selectKataPassage(passage1)
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
                selectKataPassage(passage2)
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
   * AFFICHAGE KATA FINALES
   * =========================================================
   */

  function renderKataFinalGroup(
    finalType,
    title
  ) {
    const groupPassages = finalPassages.filter(
      (passage) => passage.type === finalType
    );

    if (groupPassages.length === 0) {
      return null;
    }

    const status = getKataFinalStatus(
      selectedPool,
      finalType
    );

    const tieBreak =
      selectedPool.kataTieBreaks?.[finalType];

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
          {groupPassages.map((passage) => {
            const competitor = getCompetitor(
              passage.competitorId
            );

            if (!competitor) {
              return null;
            }

            return (
              <article
                className={`competition ${
                  passage.statut === "Terminé"
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
                    {competitor.prenom}
                  </h3>

                  <p>
                    {competitor.club ||
                      "Club non renseigné"}
                  </p>

                  {passage.statut === "Terminé" && (
                    <div className="beta-note">
                      <strong>
                        Note :{" "}
                        {Number(
                          passage.score
                        ).toFixed(1)}
                      </strong>
                    </div>
                  )}
                </div>

                <button
                  className="manage-button"
                  type="button"
                  onClick={() =>
                    selectKataFinalPassage(passage)
                  }
                >
                  {passage.statut === "Terminé"
                    ? "Modifier la note"
                    : "Noter le Kata"}
                </button>
              </article>
            );
          })}
        </div>

        {status.status === "tie" && (
          <div className="competition-form">
            <p className="surtitle">
              ÉGALITÉ
            </p>

            <h3>
              Kata imposé de départage
            </h3>

            <p>
              Les deux compétiteurs ont obtenu la
              même note.
            </p>

            <button
              type="button"
              className="primary"
              onClick={() =>
                startKataTieBreak(finalType)
              }
            >
              Lancer le Kata imposé
            </button>
          </div>
        )}

        {tieBreak &&
          (status.status === "tiebreak" ||
            status.status === "flags" ||
            status.status === "tiebreak-score" ||
            status.status === "resolved") && (
            <div className="competition-form">
              <p className="surtitle">
                DÉPARTAGE
              </p>

              <h3>Kata imposé</h3>

              <div className="competition-list">
                {(tieBreak.passages || []).map(
                  (passage) => {
                    const competitor = getCompetitor(
                      passage.competitorId
                    );

                    if (!competitor) {
                      return null;
                    }

                    return (
                      <article
                        className={`competition ${
                          passage.statut === "Terminé"
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
                            {competitor.nom}{" "}
                            {competitor.prenom}
                          </h3>

                          {passage.statut ===
                            "Terminé" && (
                            <p>
                              Note :{" "}
                              <strong>
                                {Number(
                                  passage.score
                                ).toFixed(1)}
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
                  }
                )}
              </div>
            </div>
          )}

        {status.status === "flags" && (
          <div className="competition-form">
            <p className="surtitle">
              ÉGALITÉ PERSISTANTE
            </p>

            <h3>
              Décision aux drapeaux
            </h3>

            <div className="competition-actions">
              {status.passages.map((passage) => {
                const competitor = getCompetitor(
                  passage.competitorId
                );

                if (!competitor) {
                  return null;
                }

                return (
                  <button
                    type="button"
                    className="manage-button"
                    key={passage.competitorId}
                    onClick={() =>
                      decideKataByFlags(
                        finalType,
                        passage.competitorId
                      )
                    }
                  >
                    🏁 {competitor.nom}{" "}
                    {competitor.prenom}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {(status.status === "score" ||
          status.status === "tiebreak-score" ||
          status.status === "resolved") &&
          status.winnerId && (
            <div className="beta-note">
              <strong>
                🏆 Vainqueur :{" "}
                {getCompetitor(status.winnerId)?.nom ||
                  ""}
                {" "}
                {getCompetitor(status.winnerId)
                  ?.prenom || ""}
              </strong>
            </div>
          )}
      </section>
    );
  }

  /*
   * =========================================================
   * DONNÉES AFFICHAGE
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
    selectedPool && !kataMode
      ? calculateCombatRanking(selectedPool)
      : [];

  const combatQualificationsAreFinished =
    selectedPool && !kataMode
      ? combatQualificationsFinished(selectedPool)
      : false;

  const combatTieBreaksNeeded =
    selectedPool &&
    !kataMode &&
    combatQualificationsAreFinished
      ? getCombatTieBreaksNeeded(selectedPool)
      : [];

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
            Saisie des résultats selon l'épreuve
            sélectionnée.
          </p>
        </div>
      </div>

      {pools.length === 0 ? (
        <div className="empty-state">
          <h3>
            Aucune poule disponible
          </h3>

          <p>
            Génère d'abord les poules avant de
            commencer l'arbitrage.
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

                  setSelectedClosingMode("");
                }}
              >
                <option value="">
                  Sélectionner
                </option>

                {pools.map((pool) => {
                  const category = getCategory(
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
                      {getEventLabel(eventType)}
                      {" — "}
                      {pool.nom}
                    </option>
                  );
                })}
              </select>
            </label>
          </div>

          {/* ===============================
              KATA
          =============================== */}

          {selectedPool && kataMode && (
            <>
              <section className="category-section">
                <div className="category-section-header">
                  <div>
                    <p className="surtitle">
                      {getEventLabel(selectedEvent)}
                    </p>

                    <h3>{selectedPool.nom}</h3>

                    <p>
                      Chaque compétiteur effectue deux
                      passages.
                    </p>
                  </div>
                </div>

                <div className="competition-list">
                  {(
                    selectedPool.competitorIds || []
                  ).map(renderKataCompetitor)}
                </div>
              </section>

              <section className="category-section">
                <div className="category-section-header">
                  <div>
                    <p className="surtitle">
                      CLASSEMENT
                    </p>

                    <h3>
                      Classement Kata
                    </h3>
                  </div>
                </div>

                <div className="pool-ranking">
                  <div className="ranking-table">
                    <div className="ranking-header">
                      <span>Place</span>
                      <span>Compétiteur</span>
                      <span>P1</span>
                      <span>P2</span>
                      <span>Total</span>
                    </div>

                    {kataRanking.map(
                      (item, index) => {
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
                            key={item.competitorId}
                          >
                            <strong>
                              {index + 1}
                            </strong>

                            <strong>
                              {competitor.nom}{" "}
                              {competitor.prenom}
                            </strong>

                            <span>
                              {item.passage1 !== null
                                ? Number(
                                    item.passage1
                                  ).toFixed(1)
                                : "—"}
                            </span>

                            <span>
                              {item.passage2 !== null
                                ? Number(
                                    item.passage2
                                  ).toFixed(1)
                                : "—"}
                            </span>

                            <strong>
                              {item.passagesTermines === 2
                                ? item.total.toFixed(1)
                                : "—"}
                            </strong>
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>
              </section>

              {qualificationsFinished &&
                !selectedPool.closingMode &&
                finalPassages.length === 0 && (
                  <div className="competition-form">
                    <p className="surtitle">
                      CLÔTURE
                    </p>

                    <h3>
                      Clôture de la catégorie
                    </h3>

                    <label>
                      Mode de clôture

                      <select
                        value={selectedClosingMode}
                        onChange={(event) =>
                          setSelectedClosingMode(
                            event.target.value
                          )
                        }
                      >
                        <option value="">
                          Choisir
                        </option>

                        <option value="direct">
                          Classement direct
                        </option>

                        <option value="finals">
                          Finale + petite finale
                        </option>
                      </select>
                    </label>

                    <button
                      className="primary"
                      type="button"
                      onClick={validateKataClosing}
                    >
                      Valider la clôture
                    </button>
                  </div>
                )}

              {selectedPool.closingMode ===
                "finals" &&
                finalPassages.length > 0 && (
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
            </>
          )}

          {/* ===============================
              COMBAT
          =============================== */}

          {selectedPool && !kataMode && (
            <>
              <section className="category-section">
                <div className="category-section-header">
                  <div>
                    <p className="surtitle">
                      RENCONTRES DE POULE
                    </p>

                    <h3>{selectedPool.nom}</h3>
                  </div>

                  <span className="status">
                    {
                      poolMatches.filter(
                        (match) =>
                          match.statut === "Terminé"
                      ).length
                    }
                    /
                    {poolMatches.length} terminées
                  </span>
                </div>

                <div className="competition-list">
                  {poolMatches.map(
                    (match, index) =>
                      renderMatch(
                        match,
                        `RENCONTRE ${index + 1}`,
                        "pool"
                      )
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
                      {combatQualificationsAreFinished
                        ? "Classement des qualifications"
                        : "Classement provisoire"}
                    </h3>
                  </div>
                </div>

                <div className="pool-ranking">
                  <div className="ranking-table">
                    <div className="ranking-header">
                      <span>Place</span>
                      <span>Compétiteur</span>
                      <span>V</span>
                      <span>D</span>
                      <span>N</span>
                      <span>PN</span>
                    </div>

                    {combatRanking.map(
                      (item, index) => {
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
                            key={item.competitorId}
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
              </section>

              {/* ==========================
                  DÉPARTAGES À CRÉER
              ========================== */}

              {combatQualificationsAreFinished &&
                combatTieBreaksNeeded.length > 0 && (
                  <section className="category-section">
                    <div className="category-section-header">
                      <div>
                        <p className="surtitle">
                          ÉGALITÉS
                        </p>

                        <h3>
                          Départages réglementaires
                        </h3>

                        <p>
                          Le classement doit être
                          départagé avant la clôture.
                        </p>
                      </div>
                    </div>

                    <div className="competition-list">
                      {combatTieBreaksNeeded.map(
                        (tie, index) => {
                          const competitorA =
                            getCompetitor(
                              tie.competitorAId
                            );

                          const competitorB =
                            getCompetitor(
                              tie.competitorBId
                            );

                          const existing =
                            getSavedPoolTieBreak(
                              selectedPool,
                              tie.competitorAId,
                              tie.competitorBId
                            );

                          if (existing) {
                            return null;
                          }

                          return (
                            <article
                              className="competition"
                              key={`${tie.competitorAId}-${tie.competitorBId}-${index}`}
                            >
                              <div>
                                <p className="surtitle">
                                  DÉPARTAGE REQUIS
                                </p>

                                <h3>
                                  {competitorA
                                    ? `${competitorA.nom} ${competitorA.prenom}`
                                    : "Compétiteur"}
                                </h3>

                                <p>contre</p>

                                <h3>
                                  {competitorB
                                    ? `${competitorB.nom} ${competitorB.prenom}`
                                    : "Compétiteur"}
                                </h3>

                                <div className="beta-note">
                                  <strong>
                                    3 attaques
                                    supplémentaires
                                  </strong>

                                  <p>
                                    Tsuki · Mae Geri ·
                                    Mawashi Geri
                                  </p>

                                  <p>
                                    Si l'égalité
                                    persiste : décision
                                    aux drapeaux.
                                  </p>
                                </div>
                              </div>

                              <button
                                type="button"
                                className="primary"
                                onClick={() =>
                                  startCombatTieBreak(
                                    tie.competitorAId,
                                    tie.competitorBId
                                  )
                                }
                              >
                                Commencer le départage
                              </button>
                            </article>
                          );
                        }
                      )}
                    </div>
                  </section>
                )}

              {/* ==========================
                  DÉPARTAGES EXISTANTS
              ========================== */}

              {(selectedPool.combatTieBreaks || [])
                .length > 0 && (
                <section className="category-section">
                  <div className="category-section-header">
                    <div>
                      <p className="surtitle">
                        DÉPARTAGES
                      </p>

                      <h3>
                        Arbitrage des égalités
                      </h3>
                    </div>
                  </div>

                  <div className="competition-list">
                    {(
                      selectedPool.combatTieBreaks ||
                      []
                    ).map(renderCombatTieBreak)}
                  </div>
                </section>
              )}

              {/* ==========================
                  PHASE FINALE
              ========================== */}

              {finalMatches.length > 0 && (
                <section className="category-section">
                  <div className="category-section-header">
                    <div>
                      <p className="surtitle">
                        PHASE FINALE
                      </p>

                      <h3>
                        Finale et petite finale
                      </h3>
                    </div>
                  </div>

                  <div className="competition-list">
                    {finalMatches.map((match) =>
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
            </>
          )}

          {/* ===============================
              PODIUM
          =============================== */}

          {selectedPool?.podium && (
            <section className="category-section">
              <div className="pool-ranking">
                <p className="surtitle">
                  RÉSULTAT
                </p>

                <h3>Podium final</h3>

                <p>
                  🥇{" "}
                  {getCompetitor(
                    selectedPool.podium.firstId
                  )?.nom || "—"}{" "}
                  {getCompetitor(
                    selectedPool.podium.firstId
                  )?.prenom || ""}
                </p>

                <p>
                  🥈{" "}
                  {getCompetitor(
                    selectedPool.podium.secondId
                  )?.nom || "—"}{" "}
                  {getCompetitor(
                    selectedPool.podium.secondId
                  )?.prenom || ""}
                </p>

                <p>
                  🥉{" "}
                  {getCompetitor(
                    selectedPool.podium.thirdId
                  )?.nom || "—"}{" "}
                  {getCompetitor(
                    selectedPool.podium.thirdId
                  )?.prenom || ""}
                </p>

                {selectedPool.podium.fourthId && (
                  <p>
                    4e{" "}
                    {getCompetitor(
                      selectedPool.podium.fourthId
                    )?.nom || "—"}{" "}
                    {getCompetitor(
                      selectedPool.podium.fourthId
                    )?.prenom || ""}
                  </p>
                )}
              </div>
            </section>
          )}

          {/* ===============================
              FEUILLE DE NOTATION
          =============================== */}

          {(selectedMatch ||
            selectedPassage ||
            selectedFinalPassage) && (
            <div
              ref={notationSheetRef}
              className="notation-sheet-anchor"
            >
              {selectedMatch && !kataMode && (
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

                    shiro: getCompetitor(
                      selectedMatch.shiroId
                    ),
                  }}
                  onSave={saveOfficialMatch}
                />
              )}

              {selectedPassage && kataMode && (
                <MatchManager
                  key={selectedPassage.id}
                  type="kata"
                  competitor={getCompetitor(
                    selectedPassage.competitorId
                  )}
                  passage={selectedPassage.numero}
                  initialResult={
                    selectedPassage.statut === "Terminé"
                      ? {
                          notes:
                            selectedPassage.notes,

                          score:
                            selectedPassage.score,
                        }
                      : null
                  }
                  onSave={saveKataPassage}
                />
              )}

              {selectedFinalPassage &&
                kataMode && (
                  <MatchManager
                    key={selectedFinalPassage.id}
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
                    onSave={saveKataFinalPassage}
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
