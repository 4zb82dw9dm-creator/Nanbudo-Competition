const EVENT_LABELS = {
  kata0: "Kata 0 — Shihotai",
  kata1: "Kata 1",
  kata2: "Kata 2",
  randori: "Randori",
  juRandori1: "Ju Randori 1",
  juRandori2: "Ju Randori 2",
};

function ResultsManager({ competition }) {
  const pools = competition?.pools || [];
  const competitors =
    competition?.competitors || [];
  const categories =
    competition?.categories || [];

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

  function getCompetitorName(id) {
    const competitor = getCompetitor(id);

    if (!competitor) {
      return "—";
    }

    return `${competitor.nom || ""} ${
      competitor.prenom || ""
    }`.trim();
  }

  function getCompetitorClub(id) {
    const competitor = getCompetitor(id);

    return (
      competitor?.club ||
      "Club non renseigné"
    );
  }

  /*
   * =========================================================
   * RÉSULTATS TERMINÉS
   * =========================================================
   */

  const finishedPools = pools.filter(
    (pool) =>
      pool.statut === "Terminée" &&
      pool.podium
  );

  /*
   * =========================================================
   * RÉSULTATS EN COURS
   * =========================================================
   */

  const unfinishedPools = pools.filter(
    (pool) =>
      pool.statut !== "Terminée" ||
      !pool.podium
  );

  /*
   * =========================================================
   * PODIUM
   * =========================================================
   */

  function renderPodium(pool) {
    const podium = pool.podium;

    if (!podium) {
      return null;
    }

    const first =
      getCompetitor(podium.firstId);

    const second =
      getCompetitor(podium.secondId);

    const third =
      getCompetitor(podium.thirdId);

    const fourth =
      getCompetitor(podium.fourthId);

    return (
      <div className="pool-ranking">
        <div className="ranking-table">
          <div className="ranking-header">
            <span>Place</span>
            <span>Compétiteur</span>
            <span>Club</span>
          </div>

          <div className="ranking-row">
            <strong>🥇 1</strong>

            <strong>
              {first
                ? `${first.nom} ${first.prenom}`
                : "—"}
            </strong>

            <span>
              {first?.club ||
                "Club non renseigné"}
            </span>
          </div>

          <div className="ranking-row">
            <strong>🥈 2</strong>

            <strong>
              {second
                ? `${second.nom} ${second.prenom}`
                : "—"}
            </strong>

            <span>
              {second?.club ||
                "Club non renseigné"}
            </span>
          </div>

          <div className="ranking-row">
            <strong>🥉 3</strong>

            <strong>
              {third
                ? `${third.nom} ${third.prenom}`
                : "—"}
            </strong>

            <span>
              {third?.club ||
                "Club non renseigné"}
            </span>
          </div>

          {fourth && (
            <div className="ranking-row">
              <strong>4</strong>

              <strong>
                {fourth.nom}{" "}
                {fourth.prenom}
              </strong>

              <span>
                {fourth.club ||
                  "Club non renseigné"}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  /*
   * =========================================================
   * CARTE D'UNE CATÉGORIE TERMINÉE
   * =========================================================
   */

  function renderFinishedPool(pool) {
    const category =
      getCategory(pool.categoryId);

    const eventType =
      category?.epreuve ||
      pool.epreuve ||
      "";

    return (
      <section
        className="category-section"
        key={pool.id}
      >
        <div className="category-section-header">
          <div>
            <p className="surtitle">
              {getEventLabel(eventType)}
            </p>

            <h3>
              {pool.nom ||
                category?.nom ||
                "Catégorie"}
            </h3>

            <p>
              Catégorie terminée
            </p>
          </div>

          <span className="status">
            Terminée
          </span>
        </div>

        {renderPodium(pool)}
      </section>
    );
  }

  /*
   * =========================================================
   * CATÉGORIE EN COURS
   * =========================================================
   */

  function renderUnfinishedPool(pool) {
    const category =
      getCategory(pool.categoryId);

    const eventType =
      category?.epreuve ||
      pool.epreuve ||
      "";

    const competitorCount =
      (pool.competitorIds || []).length;

    return (
      <article
        className="competition"
        key={pool.id}
      >
        <div>
          <p className="surtitle">
            {getEventLabel(eventType)}
          </p>

          <h3>
            {pool.nom ||
              category?.nom ||
              "Catégorie"}
          </h3>

          <p>
            {competitorCount}{" "}
            compétiteur
            {competitorCount > 1
              ? "s"
              : ""}
          </p>

          <p>
            Résultat final non disponible.
          </p>
        </div>

        <span className="status">
          {pool.statut ||
            "En cours"}
        </span>
      </article>
    );
  }

  /*
   * =========================================================
   * STATISTIQUES
   * =========================================================
   */

  const totalCategories =
    pools.length;

  const totalFinished =
    finishedPools.length;

  const totalUnfinished =
    unfinishedPools.length;

  const totalPodiumCompetitors =
    finishedPools.reduce(
      (total, pool) => {
        if (!pool.podium) {
          return total;
        }

        return (
          total +
          [
            pool.podium.firstId,
            pool.podium.secondId,
            pool.podium.thirdId,
          ].filter(Boolean).length
        );
      },
      0
    );

  /*
   * =========================================================
   * AFFICHAGE
   * =========================================================
   */

  return (
    <div className="results-manager">
      <div className="manager-header">
        <div>
          <p className="surtitle">
            RÉSULTATS
          </p>

          <h2>
            Résultats officiels
          </h2>

          <p>
            Classements et podiums des
            catégories terminées.
          </p>
        </div>
      </div>

      {pools.length === 0 ? (
        <div className="empty-state">
          <h3>
            Aucun résultat disponible
          </h3>

          <p>
            Les résultats apparaîtront
            ici après la création des
            poules et la saisie de
            l'arbitrage.
          </p>
        </div>
      ) : (
        <>
          <section className="category-section">
            <div className="category-section-header">
              <div>
                <p className="surtitle">
                  COMPÉTITION
                </p>

                <h3>
                  État des résultats
                </h3>
              </div>
            </div>

            <div className="match-score">
              <div>
                <strong>
                  CATÉGORIES
                </strong>

                <h2>
                  {totalCategories}
                </h2>

                <p>
                  Catégories générées
                </p>
              </div>

              <div>
                <strong>
                  TERMINÉES
                </strong>

                <h2>
                  {totalFinished}
                </h2>

                <p>
                  Podiums disponibles
                </p>
              </div>

              <div>
                <strong>
                  EN COURS
                </strong>

                <h2>
                  {totalUnfinished}
                </h2>

                <p>
                  Catégories à terminer
                </p>
              </div>

              <div>
                <strong>
                  MÉDAILLÉS
                </strong>

                <h2>
                  {totalPodiumCompetitors}
                </h2>

                <p>
                  Places de podium
                </p>
              </div>
            </div>
          </section>

          {finishedPools.length > 0 && (
            <>
              <div className="manager-header">
                <div>
                  <p className="surtitle">
                    PODIUMS
                  </p>

                  <h2>
                    Catégories terminées
                  </h2>

                  <p>
                    Résultats validés par
                    l'arbitrage.
                  </p>
                </div>
              </div>

              {finishedPools.map(
                renderFinishedPool
              )}
            </>
          )}

          {unfinishedPools.length > 0 && (
            <section className="category-section">
              <div className="category-section-header">
                <div>
                  <p className="surtitle">
                    EN COURS
                  </p>

                  <h3>
                    Catégories non
                    terminées
                  </h3>

                  <p>
                    Ces catégories
                    n'ont pas encore de
                    podium définitif.
                  </p>
                </div>
              </div>

              <div className="competition-list">
                {unfinishedPools.map(
                  renderUnfinishedPool
                )}
              </div>
            </section>
          )}

          {finishedPools.length === 0 && (
            <div className="empty-state">
              <h3>
                Aucun podium définitif
              </h3>

              <p>
                Termine une catégorie
                dans l'onglet Arbitrage
                pour faire apparaître
                automatiquement son
                podium ici.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default ResultsManager;
