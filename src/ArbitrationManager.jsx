import { useState } from "react";
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

  const [selectedPoolId, setSelectedPoolId] =
    useState("");

  const [selectedMatchId, setSelectedMatchId] =
    useState("");

  const [selectedMatchType, setSelectedMatchType] =
    useState("");

  const [
    selectedKataCompetitorId,
    setSelectedKataCompetitorId,
  ] = useState("");

  const [
    selectedKataPassage,
    setSelectedKataPassage,
  ] = useState(null);

  const [
    selectedKataFinalType,
    setSelectedKataFinalType,
  ] = useState("");

  const [
    selectedKataClosingMode,
    setSelectedKataClosingMode,
  ] = useState("");

  function getCompetitor(id) {
    return competitors.find(
      (competitor) =>
        String(competitor.id) === String(id)
    );
  }

  function getCategory(id) {
    return categories.find(
      (category) =>
        String(category.id) === String(id)
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
    return [
      "kata0",
      "kata1",
      "kata2",
    ].includes(eventType);
  }

  const selectedPool = pools.find(
    (pool) =>
      String(pool.id) === String(selectedPoolId)
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

  const selectedMatch =
    selectedMatchType === "final"
      ? finalMatches.find(
          (match) =>
            String(match.id) ===
            String(selectedMatchId)
        )
      : poolMatches.find(
          (match) =>
            String(match.id) ===
            String(selectedMatchId)
        );

  const selectedKataCompetitor =
    selectedKataCompetitorId
      ? getCompetitor(
          selectedKataCompetitorId
        )
      : null;

  function resetSelections() {
    setSelectedMatchId("");
    setSelectedMatchType("");

    setSelectedKataCompetitorId("");
    setSelectedKataPassage(null);
    setSelectedKataFinalType("");
  }

  /*
   * =========================================================
   * JU RANDORI
   * =========================================================
   */

  function selectMatch(match, type) {
    setSelectedMatchId(match.id);
    setSelectedMatchType(type);

    setSelectedKataCompetitorId("");
    setSelectedKataPassage(null);
    setSelectedKataFinalType("");
  }

  function calculatePodium(
    finalMatchesList
  ) {
    const finale =
      finalMatchesList.find(
        (match) =>
          match.type === "finale"
      );

    const petiteFinale =
      finalMatchesList.find(
        (match) =>
          match.type ===
          "petite-finale"
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

    const secondId =
      String(finale.winnerId) ===
      String(finale.akaId)
        ? finale.shiroId
        : finale.akaId;

    const fourthId =
      String(
        petiteFinale.winnerId
      ) ===
      String(petiteFinale.akaId)
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

  function saveOfficialMatch(result) {
    if (
      !selectedPool ||
      !selectedMatch
    ) {
      return;
    }

    const winnerId =
      result.vainqueur === "aka"
        ? selectedMatch.akaId
        : result.vainqueur ===
          "shiro"
        ? selectedMatch.shiroId
        : null;

    const savedMatch = {
      ...selectedMatch,

      assauts: result.assauts,

      akaScore: result.scoreAka,
      shiroScore:
        result.scoreShiro,

      scoreBrutAka:
        result.scoreBrutAka,

      scoreBrutShiro:
        result.scoreBrutShiro,

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

      statut: "Terminé",
    };

    const updatedPools =
      pools.map((pool) => {
        if (
          String(pool.id) !==
          String(selectedPool.id)
        ) {
          return pool;
        }

        if (
          selectedMatchType ===
          "final"
        ) {
          const updatedFinalMatches =
            (
              pool.finalMatches || []
            ).map((match) =>
              String(match.id) ===
              String(selectedMatch.id)
                ? savedMatch
                : match
            );

          const podium =
            calculatePodium(
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

        return {
          ...pool,

          matches: (
            pool.matches || []
          ).map((match) =>
            String(match.id) ===
            String(selectedMatch.id)
              ? savedMatch
              : match
          ),
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

  function getKataResult(
    competitorId,
    pool = selectedPool
  ) {
    return (
      pool?.kataResults ||
      []
    ).find(
      (item) =>
        String(item.competitorId) ===
        String(competitorId)
    );
  }

  function selectKataPassage(
    competitorId,
    passage
  ) {
    setSelectedKataCompetitorId(
      competitorId
    );

    setSelectedKataPassage(passage);

    setSelectedKataFinalType("");

    setSelectedMatchId("");
    setSelectedMatchType("");
  }

  function createKataResultData(result) {
    return {
      notes: result.notes || [],

      notesRetenues:
        result.notesRetenues || [],

      noteRetireeBasse:
        result.noteMin,

      noteRetireeHaute:
        result.noteMax,

      total:
        Number(result.score) || 0,

      statut: "Terminé",
    };
  }

  function saveKataPassage(result) {
    if (
      !selectedPool ||
      !selectedKataCompetitor ||
      !selectedKataPassage
    ) {
      return;
    }

    const currentKataResults =
      selectedPool.kataResults || [];

    const existingResult =
      currentKataResults.find(
        (item) =>
          String(
            item.competitorId
          ) ===
          String(
            selectedKataCompetitor.id
          )
      );

    const passageData =
      createKataResultData(result);

    let updatedKataResults;

    if (existingResult) {
      updatedKataResults =
        currentKataResults.map(
          (item) => {
            if (
              String(
                item.competitorId
              ) !==
              String(
                selectedKataCompetitor.id
              )
            ) {
              return item;
            }

            return {
              ...item,

              [`passage${selectedKataPassage}`]:
                passageData,
            };
          }
        );
    } else {
      updatedKataResults = [
        ...currentKataResults,

        {
          competitorId:
            selectedKataCompetitor.id,

          passage1:
            selectedKataPassage === 1
              ? passageData
              : null,

          passage2:
            selectedKataPassage === 2
              ? passageData
              : null,
        },
      ];
    }

    const updatedPools =
      pools.map((pool) =>
        String(pool.id) ===
        String(selectedPool.id)
          ? {
              ...pool,

              kataResults:
                updatedKataResults,
            }
          : pool
      );

    onUpdateCompetition({
      ...competition,
      pools: updatedPools,
    });

    setSelectedKataCompetitorId("");
    setSelectedKataPassage(null);
  }

  function calculateKataTotal(
    competitorId
  ) {
    const result =
      getKataResult(
        competitorId
      );

    const passage1 =
      Number(
        result?.passage1?.total
      ) || 0;

    const passage2 =
      Number(
        result?.passage2?.total
      ) || 0;

    return passage1 + passage2;
  }

  function calculateKataRanking() {
    if (!selectedPool) {
      return [];
    }

    return (
      selectedPool.competitorIds ||
      []
    )
      .map((competitorId) => ({
        competitorId,

        passage1:
          getKataResult(
            competitorId
          )?.passage1?.total ??
          null,

        passage2:
          getKataResult(
            competitorId
          )?.passage2?.total ??
          null,

        total:
          calculateKataTotal(
            competitorId
          ),
      }))
      .sort(
        (a, b) =>
          b.total - a.total
      );
  }

  function kataQualificationsFinished() {
    if (!selectedPool) {
      return false;
    }

    const competitorIds =
      selectedPool.competitorIds || [];

    if (
      competitorIds.length === 0
    ) {
      return false;
    }

    return competitorIds.every(
      (competitorId) => {
        const result =
          getKataResult(
            competitorId
          );

        return Boolean(
          result?.passage1 &&
          result?.passage2
        );
      }
    );
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

    if (
      !kataQualificationsFinished()
    ) {
      alert(
        "Les deux passages de tous les compétiteurs doivent être terminés."
      );
      return;
    }

    if (!selectedKataClosingMode) {
      alert(
        "Choisis un mode de clôture."
      );
      return;
    }

    const ranking =
      calculateKataRanking();

    if (
      selectedKataClosingMode ===
      "direct"
    ) {
      const podium = {
        firstId:
          ranking[0]
            ?.competitorId || null,

        secondId:
          ranking[1]
            ?.competitorId || null,

        thirdId:
          ranking[2]
            ?.competitorId || null,

        fourthId:
          ranking[3]
            ?.competitorId || null,
      };

      const updatedPools =
        pools.map((pool) =>
          String(pool.id) ===
          String(selectedPool.id)
            ? {
                ...pool,

                kataClosingMode:
                  "direct",

                kataRankingLocked:
                  ranking,

                podium,

                statut:
                  "Terminée",
              }
            : pool
        );

      onUpdateCompetition({
        ...competition,
        pools: updatedPools,
      });

      return;
    }

    if (
      selectedKataClosingMode ===
      "finals"
    ) {
      if (ranking.length < 4) {
        alert(
          "Il faut au moins 4 compétiteurs pour organiser une finale et une petite finale."
        );
        return;
      }

      const kataFinals = {
        finale: {
          label: "Finale",

          competitorIds: [
            ranking[0]
              .competitorId,

            ranking[1]
              .competitorId,
          ],

          results: [],
        },

        petiteFinale: {
          label:
            "Petite finale",

          competitorIds: [
            ranking[2]
              .competitorId,

            ranking[3]
              .competitorId,
          ],

          results: [],
        },
      };

      const updatedPools =
        pools.map((pool) =>
          String(pool.id) ===
          String(selectedPool.id)
            ? {
                ...pool,

                kataClosingMode:
                  "finals",

                kataRankingLocked:
                  ranking,

                kataFinals,

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
  }

  /*
   * =========================================================
   * KATA — FINALES
   * =========================================================
   */

  function getKataFinalResult(
    finalType,
    competitorId
  ) {
    return (
      selectedPool
        ?.kataFinals?.[
          finalType
        ]?.results || []
    ).find(
      (result) =>
        String(
          result.competitorId
        ) ===
        String(competitorId)
    );
  }

  function selectKataFinal(
    finalType,
    competitorId
  ) {
    setSelectedKataFinalType(
      finalType
    );

    setSelectedKataCompetitorId(
      competitorId
    );

    setSelectedKataPassage(null);

    setSelectedMatchId("");
    setSelectedMatchType("");
  }

  function calculateKataFinalPodium(
    kataFinals
  ) {
    const finale =
      kataFinals?.finale;

    const petiteFinale =
      kataFinals?.petiteFinale;

    if (
      !finale ||
      !petiteFinale
    ) {
      return null;
    }

    const finaleResults =
      finale.results || [];

    const bronzeResults =
      petiteFinale.results || [];

    if (
      finaleResults.length < 2 ||
      bronzeResults.length < 2
    ) {
      return null;
    }

    const finaleSorted = [
      ...finaleResults,
    ].sort(
      (a, b) =>
        Number(b.total) -
        Number(a.total)
    );

    const bronzeSorted = [
      ...bronzeResults,
    ].sort(
      (a, b) =>
        Number(b.total) -
        Number(a.total)
    );

    return {
      firstId:
        finaleSorted[0]
          .competitorId,

      secondId:
        finaleSorted[1]
          .competitorId,

      thirdId:
        bronzeSorted[0]
          .competitorId,

      fourthId:
        bronzeSorted[1]
          .competitorId,
    };
  }

  function saveKataFinal(result) {
    if (
      !selectedPool ||
      !selectedKataCompetitor ||
      !selectedKataFinalType
    ) {
      return;
    }

    const currentFinals =
      selectedPool.kataFinals;

    if (!currentFinals) {
      return;
    }

    const currentFinal =
      currentFinals[
        selectedKataFinalType
      ];

    if (!currentFinal) {
      return;
    }

    const resultData = {
      competitorId:
        selectedKataCompetitor.id,

      ...createKataResultData(
        result
      ),
    };

    const existing =
      (
        currentFinal.results ||
        []
      ).some(
        (item) =>
          String(
            item.competitorId
          ) ===
          String(
            selectedKataCompetitor.id
          )
      );

    const updatedResults =
      existing
        ? (
            currentFinal.results ||
            []
          ).map((item) =>
            String(
              item.competitorId
            ) ===
            String(
              selectedKataCompetitor.id
            )
              ? resultData
              : item
          )
        : [
            ...(
              currentFinal.results ||
              []
            ),
            resultData,
          ];

    const updatedKataFinals = {
      ...currentFinals,

      [selectedKataFinalType]:
        {
          ...currentFinal,

          results:
            updatedResults,
        },
    };

    const podium =
      calculateKataFinalPodium(
        updatedKataFinals
      );

    const updatedPools =
      pools.map((pool) =>
        String(pool.id) ===
        String(selectedPool.id)
          ? {
              ...pool,

              kataFinals:
                updatedKataFinals,

              podium,

              statut: podium
                ? "Terminée"
                : "Phase finale",
            }
          : pool
      );

    onUpdateCompetition({
      ...competition,
      pools: updatedPools,
    });

    setSelectedKataCompetitorId("");
    setSelectedKataFinalType("");
  }

  /*
   * =========================================================
   * AFFICHAGE JU RANDORI
   * =========================================================
   */

  function renderMatch(
    match,
    label,
    matchType
  ) {
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
      <article
        className={`competition ${
          match.statut ===
          "Terminé"
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
                {match.akaScore} —{" "}
                {match.shiroScore}
              </strong>

              <p>
                {winner
                  ? `Vainqueur : ${winner.nom} ${winner.prenom}`
                  : "Égalité"}
              </p>
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
          {match.statut ===
          "Terminé"
            ? "Modifier"
            : "Arbitrer"}
        </button>
      </article>
    );
  }

  /*
   * =========================================================
   * AFFICHAGE KATA
   * =========================================================
   */

  function renderKataCompetitor(
    competitorId
  ) {
    const competitor =
      getCompetitor(
        competitorId
      );

    if (!competitor) {
      return null;
    }

    const result =
      getKataResult(
        competitorId
      );

    const passage1 =
      result?.passage1;

    const passage2 =
      result?.passage2;

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
              {passage1
                ? Number(
                    passage1.total
                  ).toFixed(1)
                : "À noter"}
            </span>

            <span>
              Passage 2 :{" "}
              {passage2
                ? Number(
                    passage2.total
                  ).toFixed(1)
                : "À noter"}
            </span>

            {passage1 &&
              passage2 && (
                <span>
                  Total :{" "}
                  {(
                    Number(
                      passage1.total
                    ) +
                    Number(
                      passage2.total
                    )
                  ).toFixed(1)}
                </span>
              )}
          </div>
        </div>

        <div className="competition-actions">
          <button
            className="manage-button"
            type="button"
            onClick={() =>
              selectKataPassage(
                competitorId,
                1
              )
            }
          >
            {passage1
              ? "Modifier passage 1"
              : "Noter passage 1"}
          </button>

          <button
            className="manage-button"
            type="button"
            onClick={() =>
              selectKataPassage(
                competitorId,
                2
              )
            }
          >
            {passage2
              ? "Modifier passage 2"
              : "Noter passage 2"}
          </button>
        </div>
      </article>
    );
  }

  function renderKataFinal(
    finalType
  ) {
    const finalData =
      selectedPool
        ?.kataFinals?.[
          finalType
        ];

    if (!finalData) {
      return null;
    }

    return (
      <section className="category-section">
        <div className="category-section-header">
          <div>
            <p className="surtitle">
              PHASE FINALE KATA
            </p>

            <h3>
              {finalData.label}
            </h3>
          </div>
        </div>

        <div className="competition-list">
          {(
            finalData.competitorIds ||
            []
          ).map(
            (competitorId) => {
              const competitor =
                getCompetitor(
                  competitorId
                );

              if (!competitor) {
                return null;
              }

              const result =
                getKataFinalResult(
                  finalType,
                  competitorId
                );

              return (
                <article
                  className={`competition ${
                    result
                      ? "competition-terminee"
                      : ""
                  }`}
                  key={`${finalType}-${competitorId}`}
                >
                  <div>
                    <p className="surtitle">
                      {finalData.label}
                    </p>

                    <h3>
                      {competitor.nom}{" "}
                      {competitor.prenom}
                    </h3>

                    {result && (
                      <div className="beta-note">
                        <strong>
                          Note :{" "}
                          {Number(
                            result.total
                          ).toFixed(1)}
                        </strong>
                      </div>
                    )}
                  </div>

                  <button
                    className="manage-button"
                    type="button"
                    onClick={() =>
                      selectKataFinal(
                        finalType,
                        competitorId
                      )
                    }
                  >
                    {result
                      ? "Modifier la note"
                      : "Noter le Kata"}
                  </button>
                </article>
              );
            }
          )}
        </div>
      </section>
    );
  }

  const kataRanking =
    kataMode &&
    selectedPool
      ? calculateKataRanking()
      : [];

  const qualificationsFinished =
    kataMode &&
    selectedPool
      ? kataQualificationsFinished()
      : false;

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
                value={
                  selectedPoolId
                }
                onChange={(event) => {
                  setSelectedPoolId(
                    event.target.value
                  );

                  resetSelections();

                  setSelectedKataClosingMode(
                    ""
                  );
                }}
              >
                <option value="">
                  Sélectionner
                </option>

                {pools.map(
                  (pool) => {
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
                  }
                )}
              </select>
            </label>
          </div>

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
                          .kataRankingLocked
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
                          P1
                        </span>

                        <span>
                          P2
                        </span>

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
                                {index + 1}
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
                                {item.total.toFixed(
                                  1
                                )}
                              </strong>
                            </div>
                          );
                        }
                      )}
                    </div>
                  </div>
                </section>

                {qualificationsFinished &&
                  !selectedPool
                    .kataClosingMode && (
                    <div className="competition-form">
                      <h3>
                        Clôture de la
                        catégorie Kata
                      </h3>

                      <label>
                        Mode de clôture

                        <select
                          value={
                            selectedKataClosingMode
                          }
                          onChange={(
                            event
                          ) =>
                            setSelectedKataClosingMode(
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
                            Finale +
                            petite finale
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

                {selectedPool
                  .kataClosingMode ===
                  "finals" && (
                  <>
                    {renderKataFinal(
                      "finale"
                    )}

                    {renderKataFinal(
                      "petiteFinale"
                    )}
                  </>
                )}

                {selectedPool.podium && (
                  <section className="category-section">
                    <div className="pool-ranking">
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

          {selectedPool &&
            !kataMode && (
              <>
                <section className="category-section">
                  <div className="category-section-header">
                    <div>
                      <p className="surtitle">
                        RENCONTRES DE POULE
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

                {finalMatches.length >
                  0 && (
                  <section className="category-section">
                    <div className="category-section-header">
                      <div>
                        <p className="surtitle">
                          PHASE FINALE
                        </p>

                        <h3>
                          Finale et
                          petite finale
                        </h3>
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

                {selectedPool.podium && (
                  <section className="category-section">
                    <div className="pool-ranking">
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

          {selectedMatch &&
            !kataMode && (
              <MatchManager
                key={
                  selectedMatch.id
                }
                type="ju-randori"
                match={{
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

          {selectedKataCompetitor &&
            selectedKataPassage &&
            kataMode && (
              <MatchManager
                key={`${selectedKataCompetitor.id}-${selectedKataPassage}`}
                type="kata"
                match={{
                  competiteur:
                    selectedKataCompetitor,
                }}
                onSave={
                  saveKataPassage
                }
              />
            )}

          {selectedKataCompetitor &&
            selectedKataFinalType &&
            kataMode && (
              <MatchManager
                key={`final-${selectedKataFinalType}-${selectedKataCompetitor.id}`}
                type="kata"
                match={{
                  competiteur:
                    selectedKataCompetitor,
                }}
                onSave={
                  saveKataFinal
                }
              />
            )}
        </>
      )}
    </div>
  );
}

export default ArbitrationManager;
