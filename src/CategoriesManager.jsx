function CategoriesManager({ competition }) {
  const competitors = competition.competitors || [];

  const kataCompetitors = competitors.filter(
    (competitor) => competitor.epreuves?.kata
  );

  const juRandoriCompetitors = competitors.filter(
    (competitor) => competitor.epreuves?.juRandori
  );

  function formatCompetitor(competitor) {
    const details = [];

    if (competitor.sexe) {
      details.push(competitor.sexe);
    }

    if (
      competitor.age !== "" &&
      competitor.age !== undefined
    ) {
      details.push(`${competitor.age} ans`);
    }

    if (
      competitor.poids !== "" &&
      competitor.poids !== undefined
    ) {
      details.push(`${competitor.poids} kg`);
    }

    return details.join(" · ");
  }

  return (
    <div className="categories-manager">
      <div className="manager-header">
        <div>
          <p className="surtitle">PRÉPARATION</p>

          <h2>Catégories</h2>

          <p>
            Vérification des inscriptions avant génération
            des catégories de compétition.
          </p>
        </div>

        <div className="category-total">
          <strong>{competitors.length}</strong>
          <span>compétiteurs</span>
        </div>
      </div>

      {competitors.length === 0 ? (
        <div className="empty-state">
          <span className="empty-number">0</span>

          <h3>Aucun compétiteur</h3>

          <p>
            Enregistre d'abord les participants dans
            l'onglet Compétiteurs.
          </p>
        </div>
      ) : (
        <>
          <div className="category-summary">
            <div className="card">
              <span className="number">
                {kataCompetitors.length}
              </span>

              <h3>Kata individuel</h3>

              <p>Inscriptions enregistrées</p>
            </div>

            <div className="card">
              <span className="number">
                {juRandoriCompetitors.length}
              </span>

              <h3>Ju Randori individuel</h3>

              <p>Inscriptions enregistrées</p>
            </div>
          </div>

          <section className="category-section">
            <div className="category-section-header">
              <div>
                <p className="surtitle">KATA</p>
                <h3>Kata individuel</h3>
              </div>

              <span className="status">
                {kataCompetitors.length} inscrit
                {kataCompetitors.length > 1 ? "s" : ""}
              </span>
            </div>

            {kataCompetitors.length === 0 ? (
              <div className="empty-category">
                Aucun compétiteur inscrit en Kata.
              </div>
            ) : (
              <div className="category-competitor-list">
                {kataCompetitors.map((competitor) => (
                  <article
                    className="category-competitor"
                    key={competitor.id}
                  >
                    <div>
                      <h4>
                        {competitor.nom}{" "}
                        {competitor.prenom}
                      </h4>

                      <p>
                        {competitor.club ||
                          "Club non renseigné"}
                      </p>
                    </div>

                    <div className="category-data">
                      {formatCompetitor(competitor) || (
                        <span>
                          Informations à compléter
                        </span>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="category-section">
            <div className="category-section-header">
              <div>
                <p className="surtitle">JU RANDORI</p>
                <h3>Ju Randori individuel</h3>
              </div>

              <span className="status">
                {juRandoriCompetitors.length} inscrit
                {juRandoriCompetitors.length > 1 ? "s" : ""}
              </span>
            </div>

            {juRandoriCompetitors.length === 0 ? (
              <div className="empty-category">
                Aucun compétiteur inscrit en Ju Randori.
              </div>
            ) : (
              <div className="category-competitor-list">
                {juRandoriCompetitors.map((competitor) => (
                  <article
                    className="category-competitor"
                    key={competitor.id}
                  >
                    <div>
                      <h4>
                        {competitor.nom}{" "}
                        {competitor.prenom}
                      </h4>

                      <p>
                        {competitor.club ||
                          "Club non renseigné"}
                      </p>
                    </div>

                    <div className="category-data">
                      {formatCompetitor(competitor) || (
                        <span>
                          Informations à compléter
                        </span>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <div className="beta-note">
            <strong>
              Prochaine étape : génération des catégories
            </strong>

            <p>
              Le moteur utilisera les données des
              compétiteurs pour constituer les catégories.
              Les regroupements pourront ensuite être
              contrôlés avant la création des poules.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

export default CategoriesManager;
