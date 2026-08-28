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
  const pageStyle = document.createElement("style");
  pageStyle.dataset.resultsPrintPage = "true";
  pageStyle.textContent = "@page { size: A4 portrait; margin: 14mm; }";

  const finishPrinting = () => {
    document.body.classList.remove("printing-results");
    pageStyle.remove();
  };

  document.head.appendChild(pageStyle);
  document.body.classList.add("printing-results");
  window.addEventListener("afterprint", finishPrinting, { once: true });
  window.print();
}

async function exportResultsPdf() {
  const pdfDocument = {
    title: `Résultats - ${competition.nom || "Compétition"}`,
    subtitle: `${competition.lieu || "Lieu à définir"} - ${competition.date || "Date à définir"}`,
    emptyMessage: "Aucun résultat définitif.",
    categories: finishedPools.map((pool) => {
      const category = getCategory(pool.categoryId);
      const rankings = [
        { label: "1er :", name: competitorName(pool.podium.firstId) },
        { label: "2e :", name: competitorName(pool.podium.secondId) },
        { label: "3e :", name: competitorName(pool.podium.thirdId) },
      ];
      if (pool.podium.fourthId) rankings.push({ label: "4e :", name: competitorName(pool.podium.fourthId) });
      return { title: category?.nom || pool.nom || "Catégorie", rankings };
    }),
  };

  await downloadPdfWithDejaVu({
    document: pdfDocument,
    filename: `resultats-${competition.nom || "competition"}.pdf`.replace(/[^a-z0-9._-]+/gi, "-"),
  });
}
  return (
    <div className="results-manager">
      <section className="results-print-view" aria-label="Résultats officiels à imprimer">
        <header className="results-print-header">
          <p>RÉSULTATS OFFICIELS</p>
          <h1>{competition.nom || "Compétition"}</h1>
          <p>{competition.lieu || "Lieu à définir"} · {competition.date || "Date à définir"}</p>
        </header>

        {finishedPools.length === 0 ? (
          <p className="results-print-empty">Aucun résultat définitif.</p>
        ) : (
          <div className="results-print-categories">
            {finishedPools.map((pool) => {
              const category = getCategory(pool.categoryId);
              return (
                <article className="results-print-category" key={pool.id}>
                  <p className="results-print-discipline">
                    {category?.discipline === "kata" ? "KATA" : "COMBAT"}
                  </p>
                  <h2>{category?.nom || pool.nom || "Catégorie"}</h2>
                  <ol>
                    <li><strong>1er</strong><span>{competitorName(pool.podium.firstId)}</span></li>
                    <li><strong>2e</strong><span>{competitorName(pool.podium.secondId)}</span></li>
                    <li><strong>3e</strong><span>{competitorName(pool.podium.thirdId)}</span></li>
                  </ol>
                </article>
              );
            })}
          </div>
        )}
      </section>

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
