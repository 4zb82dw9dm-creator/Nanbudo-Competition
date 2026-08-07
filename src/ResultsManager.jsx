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

function escapePdfText(value) {
  return String(value || "").replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function exportResultsPdf() {
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

  const content = ["BT", "/F1 16 Tf", "50 790 Td", "18 TL", ...lines.flatMap((line, index) => {
    const font = index === 0 ? ["/F1 16 Tf"] : index === 2 ? ["/F1 11 Tf"] : [];
    return [...font, `(${escapePdfText(line)}) Tj`, "T*"];
  }), "ET"].join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => { pdf += `${String(offset).padStart(10, "0")} 00000 n \n`; });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  const blob = new Blob([pdf], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `resultats-${competition.nom || "competition"}.pdf`.replace(/[^a-z0-9._-]+/gi, "-");
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
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
