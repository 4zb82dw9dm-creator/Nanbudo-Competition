import { downloadPdfWithDejaVu } from "./pdfExport.js";

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

async function exportResultsPdf() {
  const lines = [
    `Résultats - ${competition.nom || "Compétition"}`,
    competition.date || competition.lieu ? `${competition.lieu || "Lieu à définir"} - ${competition.date || "Date à définir"}` : "",
    "",
  ];

  if (finishedPools.length === 0) {
    lines.push("Aucun résultat définitif.");
  } else {
    finishedPools.forEach((pool) => {
      const category = getCategory(pool.categoryId);
      lines.push(category?.nom || pool.nom || "Catégorie");
      lines.push(`1er : ${competitorName(pool.podium.firstId)}`);
      lines.push(`2e : ${competitorName(pool.podium.secondId)}`);
      lines.push(`3e : ${competitorName(pool.podium.thirdId)}`);
      if (pool.podium.fourthId) lines.push(`4e : ${competitorName(pool.podium.fourthId)}`);
      lines.push("");
    });
  }

  await downloadPdfWithDejaVu({
    lines,
    filename: `resultats-${competition.nom || "competition"}.pdf`.replace(/[^a-z0-9._-]+/gi, "-"),
  });
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
        </div><button
  className="primary"
  type="button"
  onClick={printResults}
>
  Imprimer les résultats
</button><button
  className="primary"
  type="button"
  onClick={exportResultsPdf}
>
  Exporter les résultats en PDF
</button>      </div>

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
                    {category?.discipline === "kata"
                      ? "KATA"
                      : "COMBAT"}
                  </p>

                  <h3>
                    {category?.nom || pool.nom}
                  </h3>

                  <p>
                    {pool.closingMode === "finals"
                      ? "Classement de compétition"
                      : "Classement automatique"}
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
