import { useState } from "react";

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
      (competitor) => competitor.id === id
    );
  }
function calculateRanking(pool) {
  const ranking = pool.competitorIds.map((id) => ({
  competitorId: id,
  victories: 0,
  defeats: 0,
  draws: 0,
  scoreFor: 0,
  scoreAgainst: 0,
  difference: 0,
  negativePoints: 0,
}));
  pool.matches.forEach((match) => {
    if (match.statut !== "Terminé") return;

    const aka = ranking.find(
      (item) => item.competitorId === match.akaId
    );

    const shiro = ranking.find(
      (item) => item.competitorId === match.shiroId
    );

    if (!aka || !shiro) return;

    aka.scoreFor += match.akaScore || 0;
    aka.scoreAgainst += match.shiroScore || 0;

    shiro.scoreFor += match.shiroScore || 0;
    shiro.scoreAgainst += match.akaScore || 0;
aka.negativePoints += match.pointsNegatifsAka || 0;
shiro.negativePoints += match.pointsNegatifsShiro || 0;    if (match.winnerId === match.akaId) {
      aka.victories += 1;
      shiro.defeats += 1;
    } else if (match.winnerId === match.shiroId) {
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
  // 1. Nombre de victoires
  if (b.victories !== a.victories) {
    return b.victories - a.victories;
  }

  // 2. Moins de points négatifs
  if (a.negativePoints !== b.negativePoints) {
    return a.negativePoints - b.negativePoints;
  }

  // 3. Confrontation directe
  const confrontation = pool.matches.find(
    (match) =>
      match.statut === "Terminé" &&
      (
        (match.akaId === a.competitorId &&
          match.shiroId === b.competitorId) ||
        (match.akaId === b.competitorId &&
          match.shiroId === a.competitorId)
      )
  );

  if (confrontation?.winnerId === a.competitorId) {
    return -1;
  }

  if (confrontation?.winnerId === b.competitorId) {
    return 1;
  }

  // 4. Différence de score provisoire
  return b.difference - a.difference;
});  return ranking;
}  function generateMatches(competitorIds) {
    const matches = [];

    for (let i = 0; i < competitorIds.length; i++) {
      for (
        let j = i + 1;
        j < competitorIds.length;
        j++
      ) {
        matches.push({
          id: `${Date.now()}-${i}-${j}`,
          akaId: competitorIds[i],
          shiroId: competitorIds[j],
          akaScore: null,
          shiroScore: null,
          winnerId: null,
          statut: "À jouer",
        });
      }
    }

    return matches;
  }

  function createPool() {
    if (!selectedCategoryId) {
      alert("Sélectionne une catégorie.");
      return;
    }

    const category = categories.find(
      (item) =>
        String(item.id) === String(selectedCategoryId)
    );

    if (!category) {
      alert("Catégorie introuvable.");
      return;
    }

    if (category.competitorIds.length < 2) {
      alert(
        "Il faut au moins 2 compétiteurs pour créer une poule."
      );
      return;
    }

    const alreadyExists = pools.some(
      (pool) => pool.categoryId === category.id
    );

    if (alreadyExists) {
      alert(
        "Une poule existe déjà pour cette catégorie."
      );
      return;
    }

    const matches = generateMatches(
      category.competitorIds
    );

    const newPool = {
      id: Date.now(),
      categoryId: category.id,
      nom: `Poule - ${category.nom}`,
      competitorIds: category.competitorIds,
      matches,
      statut: "Prête",
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

  return (
    <div className="pools-manager">
      <div className="manager-header">
        <div>
          <p className="surtitle">ORGANISATION</p>

          <h2>Poules</h2>

          <p>
            Génération des rencontres à partir des
            catégories validées.
          </p>
        </div>

        <div className="category-total">
          <strong>{pools.length}</strong>
          <span>poules</span>
        </div>
      </div>

      {categories.length === 0 ? (
        <div className="empty-state">
          <h3>Aucune catégorie disponible</h3>

          <p>
            Crée d'abord les catégories avant de
            générer les poules.
          </p>
        </div>
      ) : (
        <div className="competition-form">
          <h3>Créer une poule</h3>

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

              {categories.map((category) => (
                <option
                  key={category.id}
                  value={category.id}
                >
                  {category.nom} —{" "}
                  {category.competitorIds.length} compétiteurs
                </option>
              ))}
            </select>
          </label>

          <button
            className="primary"
            type="button"
            onClick={createPool}
          >
            Générer la poule
          </button>
        </div>
      )}

      <section className="category-section">
        <div className="category-section-header">
          <div>
            <p className="surtitle">RENCONTRES</p>
            <h3>Poules générées</h3>
          </div>
        </div>

        {pools.length === 0 ? (
          <div className="empty-state">
            <h3>Aucune poule</h3>

            <p>
              Sélectionne une catégorie pour générer
              ses rencontres.
            </p>
          </div>
        ) : (
          <div className="competition-list">
            {pools.map((pool) => {
              const category = categories.find(
                (item) =>
                  item.id === pool.categoryId
              );

              return (
                <article
                  className="competition"
                  key={pool.id}
                >
                  <div>
                    <p className="surtitle">
                      {category?.epreuve === "kata"
                        ? "KATA"
                        : "JU RANDORI"}
                    </p>

                    <h3>{pool.nom}</h3>

                    <p>
                      {pool.competitorIds.length} compétiteurs
                      {" · "}
                      {pool.matches.length} rencontres
                    </p>

                    <div className="competitor-events">
                      {pool.competitorIds.map((id) => {
                        const competitor =
                          getCompetitor(id);

                        if (!competitor) return null;

                        return (
                          <span key={id}>
                            {competitor.nom}{" "}
                            {competitor.prenom}
                          </span>
                        );
                      })}
                    </div>
<div className="pool-ranking">
  <h3>Classement provisoire</h3>

  <div className="ranking-table">
    <div className="ranking-row ranking-header">
      <span>#</span>
      <span>Compétiteur</span>
      <span>V</span>
      <span>D</span>
      <span>E</span>
      <span>+</span>
      <span>-</span>
      <span>Diff.</span>
    </div>

    {calculateRanking(pool).map((item, index) => {
      const competitor = getCompetitor(
        item.competitorId
      );

      if (!competitor) return null;

      return (
        <div
          className="ranking-row"
          key={item.competitorId}
        >
          <span>
            <strong>{index + 1}</strong>
          </span>

          <span>
            {competitor.nom} {competitor.prenom}
          </span>

          <span>{item.victories}</span>
          <span>{item.defeats}</span>
          <span>{item.draws}</span>
          <span>{item.scoreFor}</span>
          <span>{item.scoreAgainst}</span>
          <span>{item.difference}</span>
        </div>
      );
    })}
  </div>
</div>                    <div className="pool-matches">
                      {pool.matches.map(
                        (match, index) => {
                          const aka =
                            getCompetitor(
                              match.akaId
                            );

                          const shiro =
                            getCompetitor(
                              match.shiroId
                            );

                          return (
                            <div
                              className="pool-match"
                              key={match.id}
                            >
                              <strong>
                                Rencontre {index + 1}
                              </strong>

                              <span>
                                AKA :{" "}
                                {aka
                                  ? `${aka.nom} ${aka.prenom}`
                                  : "Inconnu"}
                              </span>

                              <span>VS</span>

                              <span>
                                SHIRO :{" "}
                                {shiro
                                  ? `${shiro.nom} ${shiro.prenom}`
                                  : "Inconnu"}
                              </span>

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

  {calculateRanking(pool).map((item, index) => {
    const competitor = getCompetitor(
      item.competitorId
    );

    if (!competitor) return null;

    return (
      <div
        className="ranking-row"
        key={item.competitorId}
      >
        <strong>{index + 1}</strong>

        <strong>
          {competitor.nom} {competitor.prenom}
        </strong>

        <span>{item.victories}</span>
        <span>{item.defeats}</span>
        <span>{item.draws}</span>
        <span>{item.negativePoints}</span>
        <span>{item.difference}</span>
      </div>
    );
  })}
</div></div>                  </div>

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
