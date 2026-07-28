import { useMemo, useState } from "react";

function CategoriesManager({
  competition,
  onUpdateCompetition,
}) {
  const competitors = competition.competitors || [];
  const categories = competition.categories || [];

  const [selectedIds, setSelectedIds] = useState([]);
  const [categoryName, setCategoryName] = useState("");
  const [eventType, setEventType] = useState("kata0");

  const eventDefinitions = {
    kata0: {
      label: "Kata 0 — Shihotai",
      shortLabel: "Kata 0",
      useWeight: false,
    },

    kata1: {
      label: "Kata 1",
      shortLabel: "Kata 1",
      useWeight: false,
    },

    kata2: {
      label: "Kata 2",
      shortLabel: "Kata 2",
      useWeight: false,
    },

    randori: {
      label: "Randori",
      shortLabel: "Randori",
      useWeight: false,
    },

    juRandori1: {
      label: "Ju Randori 1",
      shortLabel: "Ju Randori 1",
      useWeight: true,
    },

    juRandori2: {
      label: "Ju Randori 2",
      shortLabel: "Ju Randori 2",
      useWeight: true,
    },
  };

  const currentEvent =
    eventDefinitions[eventType] ||
    eventDefinitions.kata0;

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

        const ageA =
          a.age === "" || a.age === undefined
            ? 999
            : Number(a.age);

        const ageB =
          b.age === "" || b.age === undefined
            ? 999
            : Number(b.age);

        if (ageA !== ageB) {
          return ageA - ageB;
        }

        const weightA =
          a.poids === "" || a.poids === undefined
            ? 999
            : Number(a.poids);

        const weightB =
          b.poids === "" || b.poids === undefined
            ? 999
            : Number(b.poids);

        return weightA - weightB;
      });
  }, [competitors, eventType]);

  function toggleCompetitor(id) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  }

  function selectAllAvailable() {
    const availableIds = eligibleCompetitors
      .filter(
        (competitor) =>
          !isAlreadyAssigned(competitor.id)
      )
      .map((competitor) => competitor.id);

    setSelectedIds(availableIds);
  }

  function clearSelection() {
    setSelectedIds([]);
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

  function createCategory() {
    if (!categoryName.trim()) {
      alert("Indique le nom de la catégorie.");
      return;
    }

    if (selectedIds.length === 0) {
      alert(
        "Sélectionne au moins un compétiteur."
      );
      return;
    }

    const invalidIds = selectedIds.filter(
      (id) =>
        !eligibleCompetitors.some(
          (competitor) => competitor.id === id
        )
    );

    if (invalidIds.length > 0) {
      alert(
        "Un ou plusieurs compétiteurs sélectionnés ne sont pas inscrits dans cette épreuve."
      );
      return;
    }

    const alreadyAssignedIds =
      selectedIds.filter((id) =>
        isAlreadyAssigned(id)
      );

    if (alreadyAssignedIds.length > 0) {
      alert(
        "Un ou plusieurs compétiteurs sont déjà classés dans une catégorie de cette épreuve."
      );
      return;
    }

    const selectedCompetitors =
      selectedIds
        .map((id) =>
          competitors.find(
            (competitor) => competitor.id === id
          )
        )
        .filter(Boolean);

    const sexes = [
      ...new Set(
        selectedCompetitors.map(
          (competitor) => competitor.sexe
        )
      ),
    ];

    if (sexes.length > 1) {
      const confirmed = window.confirm(
        "Cette catégorie contient des compétiteurs de sexes différents. Continuer quand même ?"
      );

      if (!confirmed) return;
    }

    const newCategory = {
      id: Date.now(),
      nom: categoryName.trim(),
      epreuve: eventType,
      epreuveLabel: currentEvent.label,
      competitorIds: [...selectedIds],

      statut:
        selectedIds.length >= 3
          ? "Prête"
          : "Regroupement à vérifier",
    };

    onUpdateCompetition({
      ...competition,
      categories: [
        ...categories,
        newCategory,
      ],
    });

    setCategoryName("");
    setSelectedIds([]);
  }

  function deleteCategory(id) {
    const confirmed = window.confirm(
      "Supprimer cette catégorie ?"
    );

    if (!confirmed) return;

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

  function getEventLabel(type) {
    return (
      eventDefinitions[type]?.label ||
      type ||
      "Épreuve"
    );
  }

  function getAvailableCount() {
    return eligibleCompetitors.filter(
      (competitor) =>
        !isAlreadyAssigned(competitor.id)
    ).length;
  }

  const eventCategories =
    categories.filter(
      (category) =>
        category.epreuve === eventType
    );

  const availableCount = getAvailableCount();

  return (
    <div className="categories-manager">
      <div className="manager-header">
        <div>
          <p className="surtitle">
            BÊTA 0.1
          </p>

          <h2>Catégories</h2>

          <p>
            Constitution et validation des
            catégories avant génération des
            poules.
          </p>
        </div>

        <div className="category-total">
          <strong>
            {categories.length}
          </strong>

          <span>
            catégorie
            {categories.length > 1
              ? "s"
              : ""}
          </span>
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
                setEventType(
                  event.target.value
                );

                setSelectedIds([]);
                setCategoryName("");
              }}
            >
              <option value="kata0">
                Kata 0 — Shihotai
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
                setCategoryName(
                  event.target.value
                )
              }
              placeholder={
                eventType === "kata0"
                  ? "Ex. Shihotai Enfants"
                  : eventType === "kata1"
                  ? "Ex. Kata 1 Juniors"
                  : eventType === "kata2"
                  ? "Ex. Kata 2 Séniors Hommes"
                  : eventType === "randori"
                  ? "Ex. Randori Minimes"
                  : "Ex. Séniors Hommes -70 kg"
              }
            />
          </label>
        </div>

        <div className="beta-note">
          <strong>
            {currentEvent.label}
          </strong>

          {eventType === "kata0" && (
            <p>
              Kata 0 correspond au programme
              Shihotai destiné aux enfants
              débutants.
            </p>
          )}

          {eventType === "kata1" && (
            <p>
              Kata 1 correspond au programme
              destiné aux enfants jusqu'aux
              juniors.
            </p>
          )}

          {eventType === "kata2" && (
            <p>
              Kata 2 correspond au programme
              des pratiquants confirmés.
            </p>
          )}

          {eventType === "randori" && (
            <p>
              Constitue les catégories en
              vérifiant notamment le sexe et
              l'âge des compétiteurs.
            </p>
          )}

          {(eventType === "juRandori1" ||
            eventType === "juRandori2") && (
            <p>
              Vérifie le sexe, l'âge et le
              poids avant de valider la
              catégorie.
            </p>
          )}
        </div>

        <div className="manager-header">
          <div>
            <p className="surtitle">
              COMPÉTITEURS
            </p>

            <h3>
              {eligibleCompetitors.length}{" "}
              inscrit
              {eligibleCompetitors.length > 1
                ? "s"
                : ""}
            </h3>

            <p>
              {availableCount} disponible
              {availableCount > 1
                ? "s"
                : ""}{" "}
              pour créer une catégorie.
            </p>
          </div>

          {eligibleCompetitors.length >
            0 && (
            <div className="competition-actions">
              <button
                className="manage-button"
                type="button"
                onClick={selectAllAvailable}
              >
                Sélectionner les disponibles
              </button>

              <button
                className="manage-button"
                type="button"
                onClick={clearSelection}
              >
                Effacer la sélection
              </button>
            </div>
          )}
        </div>

        <div className="category-competitor-list">
          {eligibleCompetitors.length ===
          0 ? (
            <div className="empty-state">
              <span className="empty-number">
                0
              </span>

              <h3>
                Aucun compétiteur
              </h3>

              <p>
                Aucun participant n'est
                inscrit en{" "}
                {currentEvent.label}.
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
                      disabled={
                        alreadyAssigned
                      }
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

                      {competitor.age !==
                        "" &&
                        competitor.age !==
                          undefined && (
                          <span>
                            {
                              competitor.age
                            }{" "}
                            ans
                          </span>
                        )}

                      {currentEvent.useWeight &&
                        competitor.poids !==
                          "" &&
                        competitor.poids !==
                          undefined && (
                          <span>
                            {
                              competitor.poids
                            }{" "}
                            kg
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
          disabled={
            selectedIds.length === 0
          }
        >
          Créer la catégorie (
          {selectedIds.length})
        </button>
      </div>

      <section className="category-section">
        <div className="category-section-header">
          <div>
            <p className="surtitle">
              VALIDATION
            </p>

            <h3>
              Catégories créées
            </h3>

            <p>
              {eventCategories.length}{" "}
              catégorie
              {eventCategories.length > 1
                ? "s"
                : ""}{" "}
              pour{" "}
              {currentEvent.label}.
            </p>
          </div>
        </div>

        {categories.length === 0 ? (
          <div className="empty-state">
            <span className="empty-number">
              0
            </span>

            <h3>
              Aucune catégorie
            </h3>

            <p>
              Sélectionne les compétiteurs
              ci-dessus pour créer la
              première catégorie.
            </p>
          </div>
        ) : (
          <div className="competition-list">
            {categories.map(
              (category) => (
                <article
                  className="competition"
                  key={category.id}
                >
                  <div>
                    <p className="surtitle">
                      {getEventLabel(
                        category.epreuve
                      )}
                    </p>

                    <h3>
                      {category.nom}
                    </h3>

                    <p>
                      {
                        category
                          .competitorIds
                          ?.length
                      }{" "}
                      compétiteur
                      {category
                        .competitorIds
                        ?.length > 1
                        ? "s"
                        : ""}
                    </p>

                    <div className="competitor-events">
                      {category.competitorIds?.map(
                        (id) => {
                          const competitor =
                            getCompetitor(
                              id
                            );

                          if (!competitor) {
                            return null;
                          }

                          return (
                            <span key={id}>
                              {
                                competitor.nom
                              }{" "}
                              {
                                competitor.prenom
                              }
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
              )
            )}
          </div>
        )}
      </section>
    </div>
  );
}

export default CategoriesManager;
