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
  const competitors =
    competition.competitors || [];
  const categories =
    competition.categories || [];

  const [selectedPoolId, setSelectedPoolId] =
    useState("");

  const [selectedMatchId, setSelectedMatchId] =
    useState("");

  const [selectedMatchType, setSelectedMatchType] =
    useState("");

  const [
    selectedKataPassageId,
    setSelectedKataPassageId,
  ] = useState("");

  const [
    selectedKataPassageType,
    setSelectedKataPassageType,
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
      String(pool.id) ===
      String(selectedPoolId)
  );

  const selectedCategory = selectedPool
    ? getCategory(selectedPool.categoryId)
    : null;

  const selectedEvent =
    selectedCategory?.epreuve ||
    selectedPool?.epreuve ||
    "";

  const kataMode =
    isKataEvent(selectedEvent);

  const poolMatches =
    selectedPool?.matches || [];

  const finalMatches =
    selectedPool?.finalMatches || [];

  const kataPassages =
    selectedPool?.passages || [];

  const finalPassages =
    selectedPool?.finalPassages || [];

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

  const selectedKataPassage =
    selectedKataPassageType === "final"
      ? finalPassages.find(
          (passage) =>
            String(passage.id) ===
            String(selectedKataPassageId)
        )
      : kataPassages.find(
          (passage) =>
            String(passage.id) ===
            String(selectedKataPassageId)
        );

  const selectedKataCompetitor =
    selectedKataPassage
      ? getCompetitor(
          selectedKataPassage.competitorId
        )
      : null;

  function resetSelections() {
    setSelectedMatchId("");
    setSelectedMatchType("");

    setSelectedKataPassageId("");
    setSelectedKataPassageType("");
  }

  /*
   * =========================================================
   * JU RANDORI
   * =========================================================
   */

  function selectMatch(match, type) {
    setSelectedMatchId(match.id);
    setSelectedMatchType(type);

    setSelectedKataPassageId("");
    setSelectedKataPassageType("");
  }

  function calculateCombatPodium(
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

    const secondId =
      String(finale.winnerId) ===
      String(finale.akaId)
        ? finale.shiroId
        : finale.akaId;

    const fourthId =
      String(petiteFinale.winnerId) ===
      String(petiteFinale.akaId)
        ? petiteFinale.shiroId
        : petiteFinale.akaId;

    return {
      firstId: finale.winnerId,
      secondId,
      thirdId: petiteFinale.winnerId,
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
        : result.vainqueur === "shiro"
        ? selectedMatch.shiroId
        : null;

    const savedMatch = {
      ...selectedMatch,

      assauts: result.assauts,

      akaScore: result.scoreAka,
      shiroScore: result.scoreShiro,

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

    const updatedPools = pools.map(
      (pool) => {
        if (
          String(pool.id) !==
          String(selectedPool.id)
        ) {
          return pool;
        }

        if (
          selectedMatchType === "final"
        ) {
          const updatedFinalMatches = (
            pool.finalMatches || []
          ).map((match) =>
            String(match.id) ===
            String(selectedMatch.id)
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
   * KATA
   * =========================================================
   */

  function selectKataPassage(
    passage,
    type = "qualification"
  ) {
    setSelectedKataPassageId(
      passage.id
    );

    setSelectedKataPassageType(
      type
    );

    setSelectedMatchId("");
    setSelectedMatchType("");
  }

  function makeSavedKataPassage(
    passage,
    result
  ) {
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
  }

  function calculateKataFinalPodium(
    passages
  ) {
    const finale = passages.filter(
      (passage) =>
        passage.type === "finale"
    );

    const petiteFinale =
      passages.filter(
        (passage) =>
          passage.type ===
          "petite-finale"
      );

    if (
      finale.length !== 2 ||
      petiteFinale.length !== 2
    ) {
      return null;
    }

    const allFinished = [
      ...finale,
      ...petiteFinale,
    ].every(
      (passage) =>
        passage.statut === "Terminé"
    );

    if (!allFinished) {
      return null;
    }

    const finaleSorted = [
      ...finale,
    ].sort(
      (a, b) =>
        Number(b.score) -
        Number(a.score)
    );

    const bronzeSorted = [
      ...petiteFinale,
    ].sort(
      (a, b) =>
        Number(b.score) -
        Number(a.score)
    );

    return {
      firstId:
        finaleSorted[0]?.competitorId ||
        null,

      secondId:
        finaleSorted[1]?.competitorId ||
        null,

      thirdId:
        bronzeSorted[0]?.competitorId ||
        null,

      fourthId:
        bronzeSorted[1]?.competitorId ||
        null,
    };
  }

  function saveKataPassage(result) {
    if (
      !selectedPool ||
      !selectedKataPassage
    ) {
      return;
    }

    const savedPassage =
      makeSavedKataPassage(
        selectedKataPassage,
        result
      );

    const updatedPools = pools.map(
      (pool) => {
        if (
          String(pool.id) !==
          String(selectedPool.id)
        ) {
          return pool;
        }

        if (
          selectedKataPassageType ===
          "final"
        ) {
          const updatedFinalPassages = (
            pool.finalPassages || []
          ).map((passage) =>
            String(passage.id) ===
            String(
              selectedKataPassage.id
            )
              ? savedPassage
              : passage
          );

          const podium =
            calculateKataFinalPodium(
              updatedFinalPassages
            );

          return {
            ...pool,

            finalPassages:
              updatedFinalPassages,

            podium,

            statut: podium
              ? "Terminée"
              : "Phase finale",
          };
        }

        return {
          ...pool,

          passages: (
            pool.passages || []
          ).map((passage) =>
            String(passage.id) ===
            String(
              selectedKataPassage.id
            )
              ? savedPassage
              : passage
          ),
        };
      }
    );

    onUpdateCompetition({
      ...competition,
      pools: updatedPools,
    });

    setSelectedKataPassageId("");
    setSelectedKataPassageType("");
  }

  /*
   * =========================================================
   * CLASSEMENT KATA
   * =========================================================
   */

  function getKataPassage(
    competitorId,
    numero
  ) {
    return kataPassages.find(
      (passage) =>
        String(
          passage.competitorId
        ) ===
          String(competitorId) &&
        Number(passage.numero) ===
          Number(numero)
    );
  }

  function calculateKataRanking() {
    if (!selectedPool) {
      return [];
    }

    const competitorIds =
      selectedPool.competitorIds || [];

    return competitorIds
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

        const score1 =
          passage1?.statut ===
          "Terminé"
            ? Number(
                passage1.score
              ) || 0
            : null;

        const score2 =
          passage2?.statut ===
          "Terminé"
            ? Number(
                passage2.score
              ) || 0
            : null;

        const total =
          (score1 || 0) +
          (score2 || 0);

        const passagesTermines =
          Number(score1 !== null) +
          Number(score2 !== null);

        return {
          competitorId,
          passage1: score1,
          passage2: score2,
          total,
          passagesTermines,
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

  const kataRanking =
    kataMode && selectedPool
      ? calculateKataRanking()
      : [];

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
   * AFFICHAGE KATA QUALIFICATIONS
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
              {passage1?.statut ===
              "Terminé"
                ? Number(
                    passage1.score
                  ).toFixed(1)
                : "À noter"}
            </span>

            <span>
              Passage 2 :{" "}
              {passage2?.statut ===
              "Terminé"
                ? Number(
                    passage2.score
                  ).toFixed(1)
                : "À noter"}
            </span>

            {passage1?.statut ===
              "Terminé" &&
              passage2?.statut ===
                "Terminé" && (
                <span>
                  Total :{" "}
                  {(
                    Number(
                      passage1.score
                    ) +
                    Number(
                      passage2.score
                    )
                  ).toFixed(1)}
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
                  passage1,
                  "qualification"
                )
              }
            >
              {passage1.statut ===
              "Terminé"
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
                  passage2,
                  "qualification"
                )
              }
            >
              {passage2.statut ===
              "Terminé"
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
   * AFFICHAGE PHASE FINALE KATA
   * =========================================================
   */

  function renderKataFinalGroup(
    type,
    title
  ) {
    const passages =
      finalPassages.filter(
        (passage) =>
          passage.type === type
      );

    if (passages.length === 0) {
      return null;
    }

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
          {passages.map(
            (passage) => {
              const competitor =
                getCompetitor(
                  passage.competitorId
                );

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
                      {title}
                    </p>

                    <h3>
                      {competitor
                        ? `${competitor.nom} ${competitor.prenom}`
                        : "Compétiteur inconnu"}
                    </h3>

                    {passage.statut ===
                      "Terminé" && (
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
                      selectKataPassage(
                        passage,
                        "final"
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
      </section>
    );
  }

  function renderPodium() {
    if (!selectedPool?.podium) {
      return null;
    }

    const podium =
      selectedPool.podium;

    return (
      <section className="category-section">
        <div className="pool-ranking">
          <h3>Podium final</h3>

          <p>
            🥇{" "}
            {getCompetitor(
              podium.firstId
            )?.nom || "—"}{" "}
            {getCompetitor(
              podium.firstId
            )?.prenom || ""}
          </p>

          <p>
            🥈{" "}
            {getCompetitor(
              podium.secondId
            )?.nom || "—"}{" "}
            {getCompetitor(
              podium.secondId
            )?.prenom || ""}
          </p>

          <p>
            🥉{" "}
            {getCompetitor(
              podium.thirdId
            )?.nom || "—"}{" "}
            {getCompetitor(
              podium.thirdId
            )?.prenom || ""}
          </p>
        </div>
      </section>
    );
  }

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

          {/* =====================================
              KATA
          ===================================== */}

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

                {renderKataFinalGroup(
                  "finale",
                  "Finale"
                )}

                {renderKataFinalGroup(
                  "petite-finale",
                  "Petite finale"
                )}

                {renderPodium()}
              </>
            )}

          {/* =====================================
              JU RANDORI / RANDORI
          ===================================== */}

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
                      /{poolMatches.length}{" "}
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

                {renderPodium()}
              </>
            )}

          {/* =====================================
              FEUILLE JU RANDORI
          ===================================== */}

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

          {/* =====================================
              FEUILLE KATA
          ===================================== */}

          {selectedKataPassage &&
            selectedKataCompetitor &&
            kataMode && (
              <MatchManager
                key={
                  selectedKataPassage.id
                }
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
        </>
      )}
    </div>
  );
}

export default ArbitrationManager;
