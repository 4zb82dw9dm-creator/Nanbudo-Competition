import { useState } from "react";

const EVENT_LABELS = {
  kata0: "Kata 0 — Shihotai",
  kata1: "Kata 1",
  kata2: "Kata 2",
  randori: "Randori",
  juRandori1: "Ju Randori 1",
  juRandori2: "Ju Randori 2",
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

  function isKata(eventType) {
    return ["kata0", "kata1", "kata2"].includes(
      eventType
    );
  }

  function poolExistsForCategory(categoryId) {
    return pools.some(
      (pool) =>
        String(pool.categoryId) ===
        String(categoryId)
    );
  }

  // ==============================
  // JU RANDORI / RANDORI
  // ==============================

  function generateMatches(competitorIds) {
    const matches = [];
    const now = Date.now();

    for (
      let i = 0;
      i < competitorIds.length;
      i++
    ) {
      for (
        let j = i + 1;
        j < competitorIds.length;
        j++
      ) {
        matches.push({
          id: `${now}-match-${i}-${j}`,
          akaId: competitorIds[i],
          shiroId: competitorIds[j],

          akaScore: null,
          shiroScore: null,

          pointsNegatifsAka: 0,
          pointsNegatifsShiro: 0,

          winnerId: null,
          statut: "À jouer",
        });
      }
    }

    return matches;
  }

  function calculateCombatRanking(pool) {
    const competitorIds =
      pool.competitorIds || [];

    const matches = pool.matches || [];

    const ranking = competitorIds.map(
      (id) => ({
        competitorId: id,

        victories: 0,
        defeats: 0,
        draws: 0,

        scoreFor: 0,
        scoreAgainst: 0,

        difference: 0,
        negativePoints: 0,
      })
    );

    matches.forEach((match) => {
      if (match.statut !== "Terminé") {
        return;
      }

      const aka = ranking.find(
        (item) =>
          String(item.competitorId) ===
          String(match.akaId)
      );

      const shiro = ranking.find(
        (item) =>
          String(item.competitorId) ===
          String(match.shiroId)
      );

      if (!aka || !shiro) {
        return;
      }

      const akaScore =
        Number(match.akaScore) || 0;

      const shiroScore =
        Number(match.shiroScore) || 0;

      aka.scoreFor += akaScore;
      aka.scoreAgainst += shiroScore;

      shiro.scoreFor += shiroScore;
      shiro.scoreAgainst += akaScore;

      aka.negativePoints +=
        Number(match.pointsNegatifsAka) || 0;

      shiro.negativePoints +=
        Number(match.pointsNegatifsShiro) || 0;

      if (
        String(match.winnerId) ===
        String(match.akaId)
      ) {
        aka.victories += 1;
        shiro.defeats += 1;
      } else if (
        String(match.winnerId) ===
        String(match.shiroId)
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
        item.scoreFor - item.scoreAgainst;
    });

    ranking.sort((a, b) => {
      // 1. Victoires
      if (b.victories !== a.victories) {
        return (
          b.victories - a.victories
        );
      }

      // 2. Moins de points négatifs
      if (
        a.negativePoints !==
        b.negativePoints
      ) {
        return (
          a.negativePoints -
          b.negativePoints
        );
      }

      // 3. Confrontation directe
      const confrontation = matches.find(
        (match) =>
          match.statut === "Terminé" &&
          ((String(match.akaId) ===
            String(a.competitorId) &&
            String(match.shiroId) ===
              String(b.competitorId)) ||
            (String(match.akaId) ===
              String(b.competitorId) &&
              String(match.shiroId) ===
                String(a.competitorId)))
      );

      if (
        confrontation &&
        String(confrontation.winnerId) ===
          String(a.competitorId)
      ) {
        return -1;
      }

      if (
        confrontation &&
        String(confrontation.winnerId) ===
          String(b.competitorId)
      ) {
        return 1;
      }

      // 4. Différence de score
      if (
        b.difference !== a.difference
      ) {
        return (
          b.difference - a.difference
        );
      }

      // 5. Score marqué
      return b.scoreFor - a.scoreFor;
    });

    return ranking;
  }

  function combatPoolIsFinished(pool) {
    const matches = pool.matches || [];

    return (
      matches.length > 0 &&
      matches.every(
        (match) =>
          match.statut === "Terminé"
      )
    );
  }

  // ==============================
  // KATA
  // ==============================

  function generateKataPassages(
    competitorIds
  ) {
    const passages = [];
    const now = Date.now();

    competitorIds.forEach(
      (competitorId, index) => {
        passages.push({
          id: `${now}-kata-${index}-1`,
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

        passages.push({
          id: `${now}-kata-${index}-2`,
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
      }
    );

    return passages;
  }

  function getKataPassage(
    pool,
    competitorId,
    numero
  ) {
    return (pool.passages || []).find(
      (passage) =>
        String(passage.competitorId) ===
          String(competitorId) &&
        Number(passage.numero) ===
          Number(numero)
    );
  }

  function calculateKataRanking(pool) {
    const competitorIds =
      pool.competitorIds || [];

    const ranking = competitorIds.map(
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
          passage1?.statut === "Terminé"
            ? Number(passage1.score) || 0
            : 0;

        const scorePassage2 =
          passage2?.statut === "Terminé"
            ? Number(passage2.score) || 0
            : 0;

        const passagesTermines =
          Number(
            passage1?.statut === "Terminé"
          ) +
          Number(
            passage2?.statut === "Terminé"
          );

        return {
          competitorId,

          passage1: scorePassage1,
          passage2: scorePassage2,

          total:
            scorePassage1 +
            scorePassage2,

          passagesTermines,
        };
      }
    );

    ranking.sort((a, b) => {
      // On place d'abord ceux dont
      // les 2 passages sont terminés.
      if (
        b.passagesTermines !==
        a.passagesTermines
      ) {
        return (
          b.passagesTermines -
          a.passagesTermines
        );
      }

      // Puis total des deux passages.
      if (b.total !== a.total) {
        return b.total - a.total;
      }

      // Départage provisoire :
      // meilleur passage individuel.
      const bestA = Math.max(
        a.passage1,
        a.passage2
      );

      const bestB = Math.max(
        b.passage1,
        b.passage2
      );

      return bestB - bestA;
    });

    return ranking;
  }

  function kataPoolIsFinished(pool) {
    const passages = pool.passages || [];

    return (
      passages.length > 0 &&
      passages.every(
        (passage) =>
          passage.statut === "Terminé"
      )
    );
  }

  // ==============================
  // ÉTAT DE LA POULE
  // ==============================

  function poolIsFinished(pool) {
    const category = getCategory(
      pool.categoryId
    );

    const eventType =
      category?.epreuve ||
      pool.epreuve;

    if (isKata(eventType)) {
      return kataPoolIsFinished(pool);
    }

    return combatPoolIsFinished(pool);
  }

  // ==============================
  // CRÉATION
  // ==============================

  function createPool() {
    if (!selectedCategoryId) {
      alert(
        "Sélectionne une catégorie."
      );
      return;
    }

    const category = getCategory(
      selectedCategoryId
    );

    if (!category) {
      alert(
        "Catégorie introuvable."
      );
      return;
    }

    const competitorIds =
      category.competitorIds || [];

    if (competitorIds.length < 2) {
      alert(
        "Il faut au moins 2 compétiteurs pour créer une poule."
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

    const kata = isKata(
      category.epreuve
    );

    const newPool = {
      id: Date.now(),

      categoryId: category.id,

      epreuve: category.epreuve,

      type: kata
        ? "kata"
        : "combat",

      nom: `Poule - ${category.nom}`,

      competitorIds: [
        ...competitorIds,
      ],

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
    const confirmed =
      window.confirm(
        "Supprimer cette poule et toutes ses données ?"
      );

    if (!confirmed) {
      return;
    }

    onUpdateCompetition({
      ...competition,

      pools: pools.filter(
        (pool) =>
          pool.id !== id
      ),
    });
  }

  // ==============================
  // CLÔTURE
  // ==============================

  function chooseClosingMode(
    poolId,
    mode
  ) {
    const pool = pools.find(
      (item) =>
        item.id === poolId
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

    const updatedPools =
      pools.map((item) =>
        item.id === poolId
          ? {
              ...item,
              closingMode:
                mode,
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

    if (!pool.closingMode) {
      alert(
        "Choisis un mode de clôture."
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

    const kata =
      isKata(eventType);

    const ranking = kata
      ? calculateKataRanking(pool)
      : calculateCombatRanking(pool);

    // ==========================
    // CLASSEMENT DIRECT
    // ==========================

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
          item.id === pool.id
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

    // ==========================
    // PHASE FINALE
    // ==========================

    if (
      pool.closingMode ===
      "finals"
    ) {
      if (
        ranking.length < 4
      ) {
        alert(
          "Il faut au moins 4 compétiteurs pour organiser une finale et une petite finale."
        );
        return;
      }

      const now = Date.now();

      // ========================
      // KATA
      // ========================

      if (kata) {
        /*
          Pour le Kata :
          - 1er et 2e disputent la finale
          - 3e et 4e disputent la petite finale

          Mais chacun passe
          individuellement.

          Aucun AKA / SHIRO.
        */

        const finalPassages = [
          {
            id: `${now}-kata-final-1`,

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
            id: `${now}-kata-final-2`,

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
            id: `${now}-kata-bronze-1`,

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
            id: `${now}-kata-bronze-2`,

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
            item.id === pool.id
              ? {
                  ...item,

                  rankingLocked:
                    ranking,

                  finalPassages,

                  finalMatches:
                    [],

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

      // ========================
      // COMBAT
      // ========================

      const finalMatches = [
        {
          id: `${now}-final`,

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
          id: `${now}-bronze`,

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
          item.id === pool.id
            ? {
                ...item,

                rankingLocked:
                  ranking,

                finalMatches,

                finalPassages:
                  [],

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

  const availableCategories =
    categories.filter(
      (category) =>
        !poolExistsForCategory(
          category.id
        )
    );

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

      {categories.length === 0 ? (
        <div className="empty-state">
          <h3>
            Aucune catégorie
            disponible
          </h3>

          <p>
            Crée d'abord les
            catégories avant de
            générer les poules.
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
                      event.target
                        .value
                    )
                  }
                >
                  <option value="">
                    Sélectionner une
                    catégorie
                  </option>

                  {availableCategories.map(
                    (category) => (
                      <option
                        key={
                          category.id
                        }
                        value={
                          category.id
                        }
                      >
                        {getEventLabel(
                          category.epreuve
                        )}
                        {" — "}
                        {category.nom}
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
              Sélectionne une
              catégorie pour
              commencer.
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
                poolIsFinished(pool);

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
                    </p>

                    <div className="competitor-events">
                      {pool.competitorIds?.map(
                        (id) => {
                          const competitor =
                            getCompetitor(
                              id
                            );

                          if (
                            !competitor
                          ) {
                            return null;
                          }

                          return (
                            <span
                              key={id}
                            >
                              {
                                competitor.nom
                              }{" "}
                              {
                                competitor.prenom
                              }
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
                            effectue deux
                            passages. Chaque
                            passage est noté
                            par 5 juges. La
                            note la plus haute
                            et la plus basse
                            sont retirées.
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

                              if (
                                !competitor
                              ) {
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
                                    {
                                      competitor.nom
                                    }{" "}
                                    {
                                      competitor.prenom
                                    }
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

                            {ranking.map(
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
                                      {item.passagesTermines >=
                                      1
                                        ? item.passage1.toFixed(
                                            1
                                          )
                                        : "—"}
                                    </span>

                                    <span>
                                      {item.passagesTermines ===
                                      2
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
                        RANDORI
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
                                    {index +
                                      1}
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
                                    {
                                      match.statut
                                    }
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

                              <span>
                                V
                              </span>

                              <span>
                                D
                              </span>

                              <span>
                                N
                              </span>

                              <span>
                                PN
                              </span>

                              <span>
                                Diff.
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
                                        item.victories
                                      }
                                    </span>

                                    <span>
                                      {
                                        item.defeats
                                      }
                                    </span>

                                    <span>
                                      {
                                        item.draws
                                      }
                                    </span>

                                    <span>
                                      {
                                        item.negativePoints
                                      }
                                    </span>

                                    <span>
                                      {
                                        item.difference
                                      }
                                    </span>
                                  </div>
                                );
                              }
                            )}
                          </div>
                        </div>
                      </>
                    )}

                    {/* ======================
                        CLÔTURE
                    ====================== */}

                    {finished &&
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
                            (
                              passage
                            ) => {
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
                                    {
                                      passage.label
                                    }
                                  </strong>

                                  <span>
                                    {competitor
                                      ? `${competitor.nom} ${competitor.prenom}`
                                      : "Inconnu"}
                                  </span>

                                  <span>
                                    {
                                      passage.statut
                                    }
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
                                    {
                                      match.label
                                    }
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
                                    {
                                      match.statut
                                    }
                                  </span>
                                </div>
                              );
                            }
                          )}
                        </div>
                      )}
                  </div>

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
