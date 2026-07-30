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

    /*
     * =========================================
     * 7 ASSAUTS RÉGLEMENTAIRES
     * =========================================
     */

    assauts: result.assauts,

    akaScore: result.scoreAka,
    shiroScore: result.scoreShiro,

    scoreBrutAka: result.scoreBrutAka,
    scoreBrutShiro: result.scoreBrutShiro,

    /*
     * =========================================
     * PÉNALITÉS
     * =========================================
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
     * =========================================
     * DÉPARTAGE JU RANDORI
     *
     * Tsuki
     * Mae Geri
     * Mawashi Geri
     * =========================================
     */

    departageActif:
      Boolean(result.departageActif),

    assautsDepartage:
      result.assautsDepartage || [],

    scoreDepartageAka:
      result.scoreDepartageAka ?? null,

    scoreDepartageShiro:
      result.scoreDepartageShiro ?? null,

    /*
     * =========================================
     * RÉSULTAT OFFICIEL
     * =========================================
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
     * =========================================
     * PHASE FINALE
     * =========================================
     */

    if (selectedMatchType === "final") {
      const updatedFinalMatches = (
        pool.finalMatches || []
      ).map((match) =>
        sameId(match.id, selectedMatch.id)
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
     * =========================================
     * RENCONTRE DE POULE
     * =========================================
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
  });

  onUpdateCompetition({
    ...competition,
    pools: updatedPools,
  });

  /*
   * =========================================
   * FERMETURE DE LA FEUILLE
   * =========================================
   */

  setSelectedMatchId("");
  setSelectedMatchType("");
}
