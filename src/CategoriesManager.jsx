import { useMemo, useState } from "react";

const EVENT_LABELS = {
  kata0: "Kata 0",
  kata1: "Kata 1",
  kata2: "Kata 2",
  randori: "Randori",
  juRandori1: "Ju Randori 1",
  juRandori2: "Ju Randori 2",
};

const COMBAT_EVENTS = [
  "randori",
  "juRandori1",
  "juRandori2",
];

function CategoriesManager({
  competition,
  onUpdateCompetition,
}) {
  const competitors = competition.competitors || [];
  const categories = competition.categories || [];

  const [selectedIds, setSelectedIds] = useState([]);
  const [categoryName, setCategoryName] = useState("");
  const [eventType, setEventType] = useState("juRandori1");

  const eligibleCompetitors = useMemo(() => {
    return competitors
      .filter(
        (competitor) =>
          competitor.epreuves?.[eventType] === true
      )
      .sort((a, b) => {
        if (a.sexe !== b.sexe) {
          return (a.sexe || "").localeCompare(
            b.sexe || ""
          );
        }

        if ((a.age || 0) !== (b.age || 0)) {
          return (a.age || 0) - (b.age || 0);
        }

        return (a.poids || 0) - (b.poids || 0);
      });
  }, [competitors, eventType]);

  function changeEvent(newEventType) {
    setEventType(newEventType);
    setSelectedIds([]);
    setCategoryName("");
  }

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

    const selectedCompetitors = competitors.filter(
      (competitor) =>
        selectedIds.includes(competitor.id)
    );

    const invalidCompetitor =
      selectedCompetitors.find(
        (competitor) =>
          !competitor.epreuves?.[eventType]
      );

    if (invalidCompetitor) {
      alert(
        "Un compétiteur sélectionné n'est pas inscrit dans cette épreuve."
      );
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

  function isAlreadyAssigned(competitorId) {
    return categories.some(
      (category) =>
        category.epreuve === eventType &&
        category.competitorIds?.includes(
          competitorId
        )
    );
  }

  function getEventLabel(event) {
    return EVENT_LABELS[event] || event;
  }

  const showWeight =
    COMBAT_EVENTS.includes(eventType);

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
              onChange={(event) =>
                changeEvent(event.target.value)
              }
            >
              <option value="kata0">
                Kata 0
              </option>

              <option value="kata1">
                Kata 1
              </option>

              <option value="kata2">
                Kata 2
              </option>

              <option value="randori">
                Randori
              </option>

              <option value="juRandori1">
                Ju Randori 1
              </option>

              <option value="juRandori2">
                Ju Randori 2
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
          <strong>
            {getEventLabel(eventType)}
          </strong>

          <p>
            Les compétiteurs affichés ci-dessous sont
            uniquement ceux inscrits dans cette épreuve.
            Vérifie le sexe et l'âge
            {showWeight
              ? " ainsi que le poids avant de valider la catégorie."
              : " avant de valider la catégorie."}
          </p>
        </div>

        <div className="category-competitor-list">
          {eligibleCompetitors.length === 0 ? (
            <div className="empty-state">
              <h3>Aucun compétiteur</h3>

              <p>
                Aucun participant n'est inscrit en{" "}
                {getEventLabel(eventType)}.
              </p>
            </div>
          ) : (
            eligibleCompetitors.map(
              (competitor) => {
                const alreadyAssigned =
                  isAlreadyAssigned(
                    competitor.id
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
                        toggleCompetitor(
                          competitor.id
                        )
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
                      <span>
                        {competitor.sexe}
                      </span>

                      {competitor.age !== "" &&
                        competitor.age !==
                          undefined && (
                          <span>
                            {competitor.age} ans
                          </span>
                        )}

                      {showWeight &&
                        competitor.poids !== "" &&
                        competitor.poids !==
                          undefined && (
                          <span>
                            {competitor.poids} kg
                          </span>
                        )}

                      {competitor.grade && (
                        <span>
                          {competitor.grade}
                        </span>
                      )}

                      {alreadyAssigned && (
                        <span>
                          Déjà classé
                        </span>
                      )}
                    </div>
                  </label>
                );
              }
            )
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
            <p className="surtitle">
              VALIDATION
            </p>

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
                    {getEventLabel(
                      category.epreuve
                    )}
                    {" · "}
                    {category.competitorIds?.length ||
                      0}{" "}
                    compétiteur
                    {(category.competitorIds
                      ?.length || 0) > 1
                      ? "s"
                      : ""}
                  </p>

                  <div className="competitor-events">
                    {category.competitorIds?.map(
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
                </div>

                <div className="competition-actions">
                  <span className="status">
                    {category.statut}
                  </span>

                  <button
                    className="delete-button"
                    type="button"
                    onClick={() =>
                      deleteCategory(
                        category.id
                      )
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
