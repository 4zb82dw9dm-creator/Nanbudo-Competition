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

async function printResults() {
  // Open the window synchronously from the click so Safari does not treat it as
  // an unsolicited popup. Its document remains independent from the app while
  // AirPrint builds its preview (notably when Safari fires `afterprint` early).
  const printWindow = window.open("", "_blank");

  if (!printWindow) {
    window.alert("La fenêtre d’impression a été bloquée. Autorisez les fenêtres surgissantes puis réessayez.");
    return;
  }

  const escapeHtml = (value) => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const competitionName = competition.nom || "Compétition";
  const location = competition.lieu || "Lieu à définir";
  const date = competition.date || "Date à définir";
  const cardsPerPage = 8;

  const categoryCards = finishedPools.map((pool) => {
    const category = getCategory(pool.categoryId);
    const rankings = [
      ["1er", pool.podium.firstId],
      ["2e", pool.podium.secondId],
      ["3e", pool.podium.thirdId],
    ];

    if (pool.podium.fourthId) rankings.push(["4e", pool.podium.fourthId]);

    return `
      <article class="category">
        <p class="discipline">${category?.discipline === "kata" ? "KATA" : "COMBAT"}</p>
        <h2>${escapeHtml(category?.nom || pool.nom || "Catégorie")}</h2>
        <ol>
          ${rankings.map(([rank, competitorId]) => `
            <li><strong>${rank}</strong><span>${escapeHtml(competitorName(competitorId))}</span></li>
          `).join("")}
        </ol>
      </article>
    `;
  });

  const pageChunks = [];
  for (let index = 0; index < categoryCards.length; index += cardsPerPage) {
    pageChunks.push(categoryCards.slice(index, index + cardsPerPage));
  }
  if (pageChunks.length === 0) pageChunks.push([]);

  const pagesHtml = pageChunks.map((cards) => `
    <section class="print-page">
      <header>
        <p class="eyebrow">RÉSULTATS OFFICIELS</p>
        <h1>${escapeHtml(competitionName)}</h1>
        <p>${escapeHtml(location)} · ${escapeHtml(date)}</p>
      </header>
      ${cards.length
        ? `<main class="categories">${cards.join("")}</main>`
        : '<p class="empty">Aucun résultat définitif.</p>'}
    </section>
  `).join("");

  const documentLoaded = new Promise((resolve) => {
    printWindow.addEventListener("load", resolve, { once: true });
  });

  printWindow.document.open();
  printWindow.document.write(`<!doctype html>
    <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Résultats - ${escapeHtml(competitionName)}</title>
        <style>
          @page { size: A4 portrait; margin: 12mm; }
          * { box-sizing: border-box; }
          html, body { margin: 0; padding: 0; background: #fff; color: #111827; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; font-size: 10.5pt; }
          .print-page { break-after: page; page-break-after: always; }
          .print-page:last-child { break-after: auto; page-break-after: auto; }
          header { margin-bottom: 7mm; padding-bottom: 4mm; border-bottom: 2px solid #111827; }
          header p { margin: 0; }
          .eyebrow, .discipline { color: #6b7280; font-size: 8.5pt; font-weight: 700; letter-spacing: .12em; }
          h1 { margin: 1.5mm 0; font-size: 22pt; line-height: 1.12; }
          .categories { display: grid; grid-template-columns: 1fr 1fr; gap: 5mm 6mm; align-items: start; }
          .category { break-inside: avoid; page-break-inside: avoid; overflow: hidden; border: 1px solid #d1d5db; border-radius: 2mm; padding: 4mm; }
          .category h2 { margin: 1mm 0 3mm; font-size: 13pt; line-height: 1.18; }
          .discipline { margin: 0; }
          ol { margin: 0; padding: 0; list-style: none; }
          li { display: grid; grid-template-columns: 12mm 1fr; gap: 3mm; padding: 2mm 0; border-top: 1px solid #e5e7eb; }
          li strong { white-space: nowrap; }
          .empty { font-size: 13pt; }
          @media print {
            html, body { width: 100%; }
            .print-page { break-after: page; page-break-after: always; }
            .print-page:last-child { break-after: auto; page-break-after: auto; }
            .category { break-inside: avoid !important; page-break-inside: avoid !important; box-shadow: none; }
          }
        </style>
      </head>
      <body>${pagesHtml}</body>
    </html>`);
  printWindow.document.close();

  if (printWindow.document.readyState !== "complete") await documentLoaded;
  if (printWindow.document.fonts?.ready) await printWindow.document.fonts.ready;

  // Let Safari complete layout after fonts resolve before requesting AirPrint.
  await new Promise((resolve) => printWindow.requestAnimationFrame(
    () => printWindow.requestAnimationFrame(resolve)
  ));
  printWindow.focus();
  printWindow.print();

  // Do not use `afterprint`: iPad Safari may emit it while generating preview.
  // Keep this self-contained document alive long enough for AirPrint to finish.
  window.setTimeout(() => {
    if (!printWindow.closed) printWindow.close();
  }, 5 * 60 * 1000);
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
    openInNewWindow: true,
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
