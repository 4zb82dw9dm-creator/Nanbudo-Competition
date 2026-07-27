import { useMemo, useState } from "react";

function CategoriesManager({
  competition,
  onUpdateCompetition,
}) {
  const competitors = competition.competitors || [];

  const [selectedIds, setSelectedIds] = useState([]);
  const [categoryName, setCategoryName] = useState("");
  const [eventType, setEventType] = useState("juRandori");

  const categories = competition.categories || [];

  const eligibleCompetitors = useMemo(() => {
    return competitors
      .filter((competitor) =>
        eventType === "kata"
          ? competitor.epreuves?.kata
          : competitor.epreuves?.juRandori
      )
      .sort((a, b) => {
        if (a.sexe !== b.sexe) {
          return a.sexe.localeCompare(b.sexe);
        }

        if ((a.age || 0) !== (b.age || 0)) {
          return (a.age || 0) - (b.age || 0);
        }

        return (a.poids || 0) - (b.poids || 0);
      });
  }, [competitors, eventType]);

  function toggleCompetitor(id) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  }

  function createCategory() {
    if (!categoryName.trim()) {
      alert("Indique le nom de la catégorie.");
      return;
    }

    if (selectedIds.length === 0) {
      alert("Sélectionne au moins un compétiteur.");
      return;
    }

    const newCategory = {
      id: Date.now(),
      nom: categoryName.trim(),
      epreuve: eventType,
      competitorIds: selectedIds,
      statut:
        selectedIds.length >= 3
          ? "Prête"
          : "Regroupement à vérifier",
    };

    onUpdateCompetition({
      ...competition,
      categories: [...categories, newCategory],
    });

    setCategoryName("");
    setSelectedIds([]);
  }

  function deleteCategory(id) {
    if (!window.confirm("Supprimer cette catégorie ?")) {
      return;
    }

    onUpdateCompetition({
      ...competition,
      categories: categories.filter(
        (category) => category.id !== id
      ),
    });
  }

  function getCompetitor(id) {
    return competitors.find(
      (competitor) => competitor.id === id
    );
  }

  return (
    <div className="categories-manager">
      <div className="manager-header">
        <div>
          <p className="surtitle">BÊTA 0.1</p>
          <h2>Catégories</h2>

          <p>
            Constitution et validation des catégories avant
            génération des poules.
          </p>
        </div>

        <div className="category-total">
          <strong>{categories.length}</strong>
          <span>catégories</span>
        </div>
      </div>

      <div className="competition-form">
        <h3>Créer une catégorie</h3>

        <div className="form-row">
          <label>
            Épreuve

            <select
              value={eventType}
              onChange={(event) => {
                setEventType(event.target.value);
                setSelectedIds([]);
              }}
            >
              <option value="juRandori">
                Ju Randori individuel
              </option>

              <option value="kata">
                Kata individuel
              </option>
            </select>
          </label>

          <label>
            Nom de la catégorie

            <input
              value={categoryName}
              onChange={(event) =>
                setCategoryName(event.target.value)
              }
              placeholder="Ex. Séniors Hommes A"
            />
          </label>
        </div>

        <div className="beta-note">
          <strong>Règle de préparation</strong>

          <p>
            Vérifie le sexe, l'âge et, pour le Ju Randori,
            le poids avant de valider le groupe.
          </p>
        </div>

        <div className="category-competitor-list">
          {eligibleCompetitors.length === 0 ? (
            <div className="empty-state">
              <h3>Aucun compétiteur</h3>

              <p>
                Aucun participant n'est inscrit dans cette
                épreuve.
              </p>
            </div>
          ) : (
            eligibleCompetitors.map((competitor) => {
              const alreadyAssigned = categories.some(
                (category) =>
                  category.epreuve === eventType &&
                  category.competitorIds.includes(
                    competitor.id
                  )
              );

              return (
                <label
                  className="category-competitor"
                  key={competitor.id}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(
                      competitor.id
                    )}
                    disabled={alreadyAssigned}
                    onChange={() =>
                      toggleCompetitor(competitor.id)
                    }
                  />

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
                    <span>{competitor.sexe}</span>

                    {competitor.age !== "" &&
                      competitor.age !== undefined && (
                        <span>
                          {competitor.age} ans
                        </span>
                      )}

                    {eventType === "juRandori" &&
                      competitor.poids !== "" &&
                      competitor.poids !== undefined && (
                        <span>
                          {competitor.poids} kg
                        </span>
                      )}

                    {alreadyAssigned && (
                      <span>Déjà classé</span>
                    )}
                  </div>
                </label>
              );
            })
          )}
        </div>

        <button
          className="primary"
          type="button"
          onClick={createCategory}
        >
          Créer la catégorie ({selectedIds.length})
        </button>
      </div>

      <section className="category-section">
        <div className="category-section-header">
          <div>
            <p className="surtitle">VALIDATION</p>
            <h3>Catégories créées</h3>
          </div>
        </div>

        {categories.length === 0 ? (
          <div className="empty-state">
            <h3>Aucune catégorie</h3>

            <p>
              Sélectionne les compétiteurs ci-dessus pour
              créer la première catégorie.
            </p>
          </div>
        ) : (
          <div className="competition-list">
            {categories.map((category) => (
              <article
                className="competition"
                key={category.id}
              >
                <div>
                  <h3>{category.nom}</h3>

                  <p>
                    {category.epreuve === "kata"
                      ? "Kata individuel"
                      : "Ju Randori individuel"}
                    {" · "}
                    {category.competitorIds.length} compétiteur
                    {category.competitorIds.length > 1
                      ? "s"
                      : ""}
                  </p>

                  <div className="competitor-events">
                    {category.competitorIds.map((id) => {
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
                </div>

                <div className="competition-actions">
                  <span className="status">
                    {category.statut}
                  </span>

                  <button
                    className="delete-button"
                    type="button"
                    onClick={() =>
                      deleteCategory(category.id)
                    }
                  >
                    Supprimer
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default CategoriesManager;
