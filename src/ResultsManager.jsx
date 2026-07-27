function ResultsManager({ competition }) {
  const pools = competition.pools || [];
  const competitors = competition.competitors || [];
  const categories = competition.categories || [];

  function getCompetitor(id) {
    return competitors.find(
      (competitor) => competitor.id === id
    );
  }

  function getCategory(id) {
    return categories.find(
      (category) => category.id === id
    );
  }

  const finishedPools = pools.filter(
    (pool) => pool.podium
  );

  function competitorName(id) {
  const competitor = getCompetitor(id);

  if (!competitor) return "—";

  return `${competitor.nom} ${competitor.prenom}`;
}

function printResults() {
  window.print();
}
  return (
    <div className="results-manager">
      <div className="manager-header">
        <div>
          <p className="surtitle">
            RÉSULTATS OFFICIELS
          </p>

          <h2>Résultats</h2>

          <p>
            Classements définitifs des catégories
            terminées.
          </p>
        </div>

        <div className="category-total">
          <strong>{finishedPools.length}</strong>
          <span>catégories terminées</span>
        </div>
      </div>

      {finishedPools.length === 0 ? (
        <div className="empty-state">
          <h3>Aucun résultat définitif</h3>

          <p>
            Les résultats apparaîtront ici lorsqu'une
            catégorie sera terminée.
          </p>
        </div>
      ) : (
        <div className="competition-list">
          {finishedPools.map((pool) => {
            const category = getCategory(
              pool.categoryId
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

                  <h3>
                    {category?.nom || pool.nom}
                  </h3>

                  <p>
                    {pool.closingMode === "finals"
                      ? "Finale + petite finale"
                      : "Classement direct"}
                  </p>

                  <div className="pool-ranking">
                    <h3>Podium</h3>

                    <div className="ranking-table">
                      <div className="ranking-row">
                        <strong>🥇 1er</strong>
                        <span>
                          {competitorName(
                            pool.podium.firstId
                          )}
                        </span>
                      </div>

                      <div className="ranking-row">
                        <strong>🥈 2e</strong>
                        <span>
                          {competitorName(
                            pool.podium.secondId
                          )}
                        </span>
                      </div>

                      <div className="ranking-row">
                        <strong>🥉 3e</strong>
                        <span>
                          {competitorName(
                            pool.podium.thirdId
                          )}
                        </span>
                      </div>

                      {pool.podium.fourthId && (
                        <div className="ranking-row">
                          <strong>4e</strong>
                          <span>
                            {competitorName(
                              pool.podium.fourthId
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ResultsManager;
