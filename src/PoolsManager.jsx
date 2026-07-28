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
    return EVENT_LABELS[eventType] || eventType || "Épreuve";
  }

  function calculateRanking(pool) {
    const competitorIds = pool.competitorIds || [];
    const matches = pool.matches || [];

    const ranking = competitorIds.map((id) => ({
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
      if (match.statut !== "Terminé") return;

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

      if (!aka || !shiro) return;

      const akaScore = Number(match.akaScore) || 0;
      const shiroScore = Number(match.shiroScore) || 0;

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
      if (b.victories !== a.victories) {
        return b.victories - a.victories;
      }

      if (a.negativePoints !== b.negativePoints) {
        return a.negativePoints - b.negativePoints;
      }

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

      if (b.difference !== a.difference) {
        return b.difference - a.difference;
      }

      return b.scoreFor - a.scoreFor;
    });

    return ranking;
  }

  function generateMatches(competitorIds) {
    const matches = [];
    const now = Date.now();

    for (let i = 0; i < competitorIds.length; i++) {
      for (
        let j = i + 1;
        j < competitorIds.length;
        j++
      ) {
        matches.push({
          id: `${now}-${i}-${j}`,
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

  function poolIsFinished(pool) {
    const matches = pool.matches || [];

    return (
      matches.length > 0 &&
      matches.every(
        (match) => match.statut === "Terminé"
      )
    );
  }

  function poolExistsForCategory(categoryId) {
    return pools.some(
      (pool) =>
        String(pool.categoryId) ===
        String(categoryId)
    );
  }

  function createPool() {
    if (!selectedCategoryId) {
      alert("Sélectionne une catégorie.");
      return;
    }

    const category = getCategory(
      selectedCategoryId
    );

    if (!category) {
      alert("Catégorie introuvable.");
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

    if (poolExistsForCategory(category.id)) {
      alert(
        "Une poule existe déjà pour cette catégorie."
      );
      return;
    }

    const matches =
      generateMatches(competitorIds);

    const newPool = {
      id: Date.now(),
      categoryId: category.id,
      epreuve: category.epreuve,
      nom: `Poule - ${category.nom}`,
      competitorIds: [...competitorIds],
      matches,
      statut: "Prête",

      closingMode: "",
      rankingLocked: [],
      finalMatches: [],
      podium: null,
    };

    onUpdateCompetition({
      ...competition,
      pools: [...pools, newPool],
    });

    setSelectedCategoryId("");
  }

  function deletePool(id) {
    const confirmed = window.confirm(
      "Supprimer cette poule et toutes ses rencontres ?"
    );

    if (!confirmed) return;

    onUpdateCompetition({
      ...competition,
      pools: pools.filter(
        (pool) => pool.id !== id
      ),
    });
  }

  function chooseClosingMode(poolId, mode) {
    const pool = pools.find(
      (item) => item.id === poolId
    );

    if (!pool) return;

    if ((pool.finalMatches || []).length > 0) {
      alert(
        "La phase finale a déjà été générée."
      );
      return;
    }

    const updatedPools = pools.map((item) =>
      item.id === poolId
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
      alert(
        "Toutes les rencontres de la poule doivent être terminées."
      );
      return;
    }

    if (!pool.closingMode) {
      alert("Choisis un mode de clôture.");
      return;
    }

    const ranking = calculateRanking(pool);

    if (pool.closingMode === "direct") {
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

      const updatedPools = pools.map((item) =>
        item.id === pool.id
          ? {
              ...item,
              rankingLocked: ranking,
              podium,
              statut: "Terminée",
            }
          : item
      );

      onUpdateCompetition({
        ...competition,
        pools: updatedPools,
      });

      return;
    }

    if (pool.closingMode === "finals") {
      if (ranking.length < 4) {
        alert(
          "Il faut au moins 4 compétiteurs pour générer une finale et une petite finale."
        );
        return;
      }

      const now = Date.now();

      const finalMatches = [
        {
          id: `${now}-final`,
          type: "finale",
          label: "Finale",
          akaId: ranking[0].competitorId,
          shiroId: ranking[1].competitorId,
          akaScore: null,
          shiroScore: null,
          pointsNegatifsAka: 0,
          pointsNegatifsShiro: 0,
          winnerId: null,
          statut: "À jouer",
        },

        {
          id: `${now}-bronze`,
          type: "petite-finale",
          label: "Petite finale",
          akaId: ranking[2].competitorId,
          shiroId: ranking[3].competitorId,
          akaScore: null,
          shiroScore: null,
          pointsNegatifsAka: 0,
          pointsNegatifsShiro: 0,
          winnerId: null,
          statut: "À jouer",
        },
      ];

      const updatedPools = pools.map((item) =>
        item.id === pool.id
          ? {
              ...item,
              rankingLocked: ranking,
              finalMatches,
              podium: null,
              statut: "Phase finale",
            }
          : item
      );

      onUpdateCompetition({
        ...competition,
        pools: updatedPools,
      });
    }
  }

  const availableCategories = categories.filter(
    (category) =>
      !poolExistsForCategory(category.id)
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
            Génération des rencontres à partir
            des catégories créées.
          </p>
        </div>

        <div className="category-total">
          <strong>{pools.length}</strong>

          <span>
            poule
            {pools.length > 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {categories.length === 0 ? (
        <div className="empty-state">
          <h3>
            Aucune catégorie disponible
          </h3>

          <p>
            Crée d'abord les catégories avant de
            générer les poules.
          </p>
        </div>
      ) : (
        <div className="competition-form">
          <h3>Créer une poule</h3>

          {availableCategories.length === 0 ? (
            <div className="beta-note">
              <strong>
                Toutes les catégories ont une poule
              </strong>

              <p>
                Une poule a déjà été générée pour
                chaque catégorie disponible.
              </p>
            </div>
          ) : (
            <>
              <label>
                Catégorie

                <select
                  value={selectedCategoryId}
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
                        {" — "}
                        {category.competitorIds
                          ?.length || 0}{" "}
                        compétiteurs
                      </option>
                    )
                  )}
                </select>
              </label>

              <button
                className="primary"
                type="button"
                onClick={createPool}
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
              RENCONTRES
            </p>

            <h3>Poules générées</h3>
          </div>
        </div>

        {pools.length === 0 ? (
          <div className="empty-state">
            <h3>Aucune poule</h3>

            <p>
              Sélectionne une catégorie pour
              générer ses rencontres.
            </p>
          </div>
        ) : (
          <div className="competition-list">
            {pools.map((pool) => {
              const category =
                getCategory(pool.categoryId);

              const ranking =
                calculateRanking(pool);

              const finished =
                poolIsFinished(pool);

              const poolEvent =
                category?.epreuve ||
                pool.epreuve;

              return (
                <article
                  className="competition"
                  key={pool.id}
                >
                  <div>
                    <p className="surtitle">
                      {getEventLabel(poolEvent)}
                    </p>

                    <h3>{pool.nom}</h3>

                    <p>
                      {pool.competitorIds?.length ||
                        0}{" "}
                      compétiteur
                      {(pool.competitorIds?.length ||
                        0) > 1
                        ? "s"
                        : ""}
                      {" · "}
                      {pool.matches?.length || 0}{" "}
                      rencontre
                      {(pool.matches?.length || 0) >
                      1
                        ? "s"
                        : ""}
                    </p>

                    <div className="competitor-events">
                      {pool.competitorIds?.map(
                        (id) => {
                          const competitor =
                            getCompetitor(id);

                          if (!competitor) {
                            return null;
                          }

                          return (
                            <span key={id}>
                              {competitor.nom}{" "}
                              {competitor.prenom}
                            </span>
                          );
                        }
                      )}
                    </div>

                    <div className="pool-matches">
                      <h3>Rencontres</h3>

                      {(pool.matches || []).map(
                        (match, index) => {
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
                              key={match.id}
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
                                    0}{" "}
                                  —{" "}
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
                      <h3>Classement</h3>

                      <div className="ranking-table">
                        <div className="ranking-header">
                          <span>Place</span>
                          <span>Compétiteur</span>
                          <span>V</span>
                          <span>D</span>
                          <span>N</span>
                          <span>PN</span>
                          <span>Diff.</span>
                        </div>

                        {ranking.map(
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
                                  {
                                    item.negativePoints
                                  }
                                </span>

                                <span>
                                  {item.difference}
                                </span>
                              </div>
                            );
                          }
                        )}
                      </div>
                    </div>

                    {finished &&
                      pool.statut !== "Terminée" &&
                      (pool.finalMatches?.length ||
                        0) === 0 && (
                        <div className="competition-form">
                          <h3>
                            Clôture de la catégorie
                          </h3>

                          <label>
                            Mode de clôture

                            <select
                              value={
                                pool.closingMode ||
                                ""
                              }
                              onChange={(event) =>
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
                            onClick={() =>
                              validateClosing(pool)
                            }
                          >
                            Valider la phase finale
                          </button>
                        </div>
                      )}

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
                              pool.podium.firstId
                            )?.nom || "—"}{" "}
                            {getCompetitor(
                              pool.podium.firstId
                            )?.prenom || ""}
                          </p>

                          <p>
                            🥈{" "}
                            {getCompetitor(
                              pool.podium.secondId
                            )?.nom || "—"}{" "}
                            {getCompetitor(
                              pool.podium.secondId
                            )?.prenom || ""}
                          </p>

                          <p>
                            🥉{" "}
                            {getCompetitor(
                              pool.podium.thirdId
                            )?.nom || "—"}{" "}
                            {getCompetitor(
                              pool.podium.thirdId
                            )?.prenom || ""}
                          </p>
                        </div>
                      )}

                    {(pool.finalMatches?.length ||
                      0) > 0 && (
                      <div className="pool-ranking">
                        <h3>Phase finale</h3>

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
                                key={match.id}
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
                                      0}{" "}
                                    —{" "}
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

                  <button
                    className="delete-button"
                    type="button"
                    onClick={() =>
                      deletePool(pool.id)
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
