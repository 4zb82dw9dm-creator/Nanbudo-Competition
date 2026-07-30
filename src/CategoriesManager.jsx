import { useMemo, useState } from "react";

const EVENT_DEFINITIONS = {
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

function CategoriesManager({
  competition,
  onUpdateCompetition,
}) {
  const competitors = competition.competitors || [];
  const categories = competition.categories || [];

  const [selectedIds, setSelectedIds] = useState([]);
  const [categoryName, setCategoryName] = useState("");
  const [eventType, setEventType] = useState("kata0");

  const currentEvent =
    EVENT_DEFINITIONS[eventType] ||
    EVENT_DEFINITIONS.kata0;

  function sameId(a, b) {
    return String(a) === String(b);
  }

  function getAge(competitor) {
    if (
      competitor.age === "" ||
      competitor.age === undefined ||
      competitor.age === null
    ) {
      return null;
    }

    const age = Number(competitor.age);

    return Number.isFinite(age) ? age : null;
  }

  function getWeight(competitor) {
    if (
      competitor.poids === "" ||
      competitor.poids === undefined ||
      competitor.poids === null
    ) {
      return null;
    }

    const weight = Number(competitor.poids);

    return Number.isFinite(weight) ? weight : null;
  }

  function isAssignedToEvent(competitorId, type = eventType) {
    return categories.some(
      (category) =>
        category.epreuve === type &&
        (category.competitorIds || []).some((id) =>
          sameId(id, competitorId)
        )
    );
  }

  const eligibleCompetitors = useMemo(() => {
    return competitors
      .filter(
        (competitor) =>
          competitor.epreuves?.[eventType] === true
      )
      .sort((a, b) => {
        const sexA = a.sexe || "";
        const sexB = b.sexe || "";

        if (sexA !== sexB) {
          return sexA.localeCompare(sexB, "fr");
        }

        const ageA = getAge(a);
        const ageB = getAge(b);

        if (ageA !== ageB) {
          if (ageA === null) return 1;
          if (ageB === null) return -1;

          return ageA - ageB;
        }

        const weightA = getWeight(a);
        const weightB = getWeight(b);

        if (weightA !== weightB) {
          if (weightA === null) return 1;
          if (weightB === null) return -1;

          return weightA - weightB;
        }

        return `${a.nom || ""} ${a.prenom || ""}`.localeCompare(
          `${b.nom || ""} ${b.prenom || ""}`,
          "fr"
        );
      });
  }, [competitors, categories, eventType]);

  const availableCompetitors = useMemo(
    () =>
      eligibleCompetitors.filter(
        (competitor) =>
          !isAssignedToEvent(competitor.id)
      ),
    [eligibleCompetitors, categories, eventType]
  );

  const eventCategories = categories.filter(
    (category) => category.epreuve === eventType
  );

  function getCompetitor(id) {
    return competitors.find((competitor) =>
      sameId(competitor.id, id)
    );
  }

  function getEventLabel(type) {
    return (
      EVENT_DEFINITIONS[type]?.label ||
      type ||
      "Épreuve"
    );
  }

  function toggleCompetitor(id) {
    if (isAssignedToEvent(id)) {
      return;
    }

    setSelectedIds((current) =>
      current.some((item) => sameId(item, id))
        ? current.filter((item) => !sameId(item, id))
        : [...current, id]
    );
  }

  function selectAllAvailable() {
    setSelectedIds(
      availableCompetitors.map(
        (competitor) => competitor.id
      )
    );
  }

  function clearSelection() {
    setSelectedIds([]);
  }

  function suggestGroup(startCompetitor) {
    if (!startCompetitor) return;

    /*
      Assistant uniquement.

      Ce regroupement n'est PAS une règle sportive AFDP.

      On recherche parmi les compétiteurs encore disponibles
      ceux qui sont les plus proches du compétiteur choisi,
      en privilégiant :
      1. même sexe
      2. âge proche
      3. poids proche

      L'utilisateur doit ensuite contrôler et valider.
    */

    const candidates = availableCompetitors
      .filter(
        (competitor) =>
          !sameId(
            competitor.id,
            startCompetitor.id
          )
      )
      .map((competitor) => {
        const sameSex =
          competitor.sexe === startCompetitor.sexe;

        const ageA = getAge(startCompetitor);
        const ageB = getAge(competitor);

        const ageDifference =
          ageA === null || ageB === null
            ? 100
            : Math.abs(ageA - ageB);

        const weightA = getWeight(startCompetitor);
        const weightB = getWeight(competitor);

        const weightDifference =
          weightA === null || weightB === null
            ? 100
            : Math.abs(weightA - weightB);

        /*
          Le score sert seulement à trier les personnes
          les plus proches. Il ne constitue aucune
          limite de catégorie.
        */
        let score = 0;

        if (!sameSex) {
          score += 10000;
        }

        score += ageDifference * 100;

        if (currentEvent.useWeight) {
          score += weightDifference * 10;
        } else {
          score += weightDifference;
        }

        return {
          competitor,
          score,
        };
      })
      .sort((a, b) => a.score - b.score);

    /*
      Proposition de 4 personnes maximum :
      le compétiteur choisi + les 3 plus proches.

      Ce nombre sert uniquement à rendre l'assistant
      pratique pendant la bêta.
    */
    const suggestedIds = [
      startCompetitor.id,
      ...candidates
        .slice(0, 3)
        .map((item) => item.competitor.id),
    ];

    setSelectedIds(suggestedIds);

    if (!categoryName.trim()) {
      const sexLabel =
        startCompetitor.sexe || "Mixte";

      setCategoryName(
        `${currentEvent.shortLabel} — ${sexLabel}`
      );
    }
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
          (competitor) =>
            sameId(competitor.id, id)
        )
    );

    if (invalidIds.length > 0) {
      alert(
        "Un ou plusieurs compétiteurs sélectionnés ne sont pas inscrits dans cette épreuve."
      );
      return;
    }

    const alreadyAssignedIds = selectedIds.filter(
      (id) => isAssignedToEvent(id)
    );

    if (alreadyAssignedIds.length > 0) {
      alert(
        "Un ou plusieurs compétiteurs appartiennent déjà à une catégorie de cette épreuve."
      );
      return;
    }

    const selectedCompetitors = selectedIds
      .map((id) => getCompetitor(id))
      .filter(Boolean);

    const sexes = [
      ...new Set(
        selectedCompetitors
          .map((competitor) => competitor.sexe)
          .filter(Boolean)
      ),
    ];

    if (sexes.length > 1) {
      const confirmed = window.confirm(
        "Cette catégorie contient des compétiteurs de sexes différents. Confirmer quand même la création ?"
      );

      if (!confirmed) return;
    }

    const newCategory = {
      id: `${Date.now()}-category`,
      nom: categoryName.trim(),
      epreuve: eventType,
      epreuveLabel: currentEvent.label,
      competitorIds: [...selectedIds],

      statut:
        selectedIds.length >= 3
          ? "Prête"
          : "Regroupement à vérifier",

      creationMode: "manual-assisted",
    };

    onUpdateCompetition({
      ...competition,
      categories: [...categories, newCategory],
    });

    setCategoryName("");
    setSelectedIds([]);
  }

  function deleteCategory(id) {
    const linkedPool = (competition.pools || []).some(
      (pool) => sameId(pool.categoryId, id)
    );

    if (linkedPool) {
      alert(
        "Suppression impossible : une poule a déjà été générée pour cette catégorie. Supprime d'abord la poule concernée."
      );
      return;
    }

    const confirmed = window.confirm(
      "Supprimer cette catégorie ? Les compétiteurs redeviendront disponibles pour cette épreuve."
    );

    if (!confirmed) return;

    onUpdateCompetition({
      ...competition,
      categories: categories.filter(
        (category) => !sameId(category.id, id)
      ),
    });

    setSelectedIds([]);
  }

  function getSelectedSummary() {
    const selectedCompetitors = selectedIds
      .map((id) => getCompetitor(id))
      .filter(Boolean);

    if (selectedCompetitors.length === 0) {
      return null;
    }

    const ages = selectedCompetitors
      .map(getAge)
      .filter((value) => value !== null);

    const weights = selectedCompetitors
      .map(getWeight)
      .filter((value) => value !== null);

    const sexes = [
      ...new Set(
        selectedCompetitors
          .map((competitor) => competitor.sexe)
          .filter(Boolean)
      ),
    ];

    return {
      count: selectedCompetitors.length,

      sex:
        sexes.length === 1
          ? sexes[0]
          : sexes.length > 1
          ? "Mixte"
          : "Non renseigné",

      minAge:
        ages.length > 0
          ? Math.min(...ages)
          : null,

      maxAge:
        ages.length > 0
          ? Math.max(...ages)
          : null,

      minWeight:
        weights.length > 0
          ? Math.min(...weights)
          : null,

      maxWeight:
        weights.length > 0
          ? Math.max(...weights)
          : null,
    };
  }

  const selectedSummary = getSelectedSummary();

  return (
    <div className="categories-manager">
      <div className="manager-header">
        <div>
          <p className="surtitle">
            BÊTA 0.1
          </p>

          <h2>Catégories</h2>

          <p>
            Prépare les regroupements avant la
            génération des poules.
          </p>
        </div>

        <div className="category-total">
          <strong>{categories.length}</strong>

          <span>
            catégorie
            {categories.length > 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <div className="beta-note">
        <strong>
          Assistant de regroupement
        </strong>

        <p>
          Les propositions de cette version bêta
          ne constituent pas des catégories
          officielles AFDP. L'application trie et
          rapproche les compétiteurs pour aider
          l'organisateur, qui reste responsable de
          la validation de chaque catégorie.
        </p>
      </div>

      <div className="competition-form">
        <h3>Préparer une catégorie</h3>

        <div className="form-row">
          <label>
            Épreuve

            <select
              value={eventType}
              onChange={(event) => {
                setEventType(event.target.value);
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
                setCategoryName(event.target.value)
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
                  : "Ex. Ju Randori Séniors"
              }
            />
          </label>
        </div>

        <div className="beta-note">
          <strong>{currentEvent.label}</strong>

          <p>
            Les compétiteurs sont présentés par
            sexe, puis par âge et par poids pour
            faciliter le contrôle de
            l'organisateur.
            {currentEvent.useWeight
              ? " Pour cette épreuve, le poids est particulièrement mis en évidence."
              : ""}
          </p>
        </div>

        <div className="manager-header">
          <div>
            <p className="surtitle">
              COMPÉTITEURS
            </p>

            <h3>
              {eligibleCompetitors.length} inscrit
              {eligibleCompetitors.length > 1
                ? "s"
                : ""}
            </h3>

            <p>
              {availableCompetitors.length} disponible
              {availableCompetitors.length > 1
                ? "s"
                : ""}{" "}
              pour cette épreuve.
            </p>
          </div>

          {eligibleCompetitors.length > 0 && (
            <div className="competition-actions">
              <button
                className="manage-button"
                type="button"
                onClick={selectAllAvailable}
                disabled={
                  availableCompetitors.length === 0
                }
              >
                Sélectionner les disponibles
              </button>

              <button
                className="manage-button"
                type="button"
                onClick={clearSelection}
                disabled={selectedIds.length === 0}
              >
                Effacer la sélection
              </button>
            </div>
          )}
        </div>

        <div className="category-competitor-list">
          {eligibleCompetitors.length === 0 ? (
            <div className="empty-state">
              <span className="empty-number">
                0
              </span>

              <h3>Aucun compétiteur</h3>

              <p>
                Aucun participant n'est inscrit en{" "}
                {currentEvent.label}.
              </p>
            </div>
          ) : (
            eligibleCompetitors.map(
              (competitor) => {
                const alreadyAssigned =
                  isAssignedToEvent(
                    competitor.id
                  );

                const age =
                  getAge(competitor);

                const weight =
                  getWeight(competitor);

                return (
                  <div
                    className="category-competitor"
                    key={competitor.id}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.some(
                        (id) =>
                          sameId(
                            id,
                            competitor.id
                          )
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
                        {competitor.sexe ||
                          "Sexe non renseigné"}
                      </span>

                      <span>
                        {age !== null
                          ? `${age} ans`
                          : "Âge non renseigné"}
                      </span>

                      <span>
                        {weight !== null
                          ? `${weight} kg`
                          : "Poids non renseigné"}
                      </span>

                      {competitor.grade && (
                        <span>
                          {competitor.grade}
                        </span>
                      )}

                      {alreadyAssigned ? (
                        <span>
                          Déjà classé
                        </span>
                      ) : (
                        <button
                          className="manage-button"
                          type="button"
                          onClick={() =>
                            suggestGroup(
                              competitor
                            )
                          }
                        >
                          Proposer un groupe
                        </button>
                      )}
                    </div>
                  </div>
                );
              }
            )
          )}
        </div>

        {selectedSummary && (
          <div className="beta-note">
            <strong>
              Groupe sélectionné :{" "}
              {selectedSummary.count} compétiteur
              {selectedSummary.count > 1
                ? "s"
                : ""}
            </strong>

            <p>
              Sexe : {selectedSummary.sex}
              {" · "}
              Âge :{" "}
              {selectedSummary.minAge !== null
                ? selectedSummary.minAge ===
                  selectedSummary.maxAge
                  ? `${selectedSummary.minAge} ans`
                  : `${selectedSummary.minAge} à ${selectedSummary.maxAge} ans`
                : "non renseigné"}

              {currentEvent.useWeight && (
                <>
                  {" · "}
                  Poids :{" "}
                  {selectedSummary.minWeight !== null
                    ? selectedSummary.minWeight ===
                      selectedSummary.maxWeight
                      ? `${selectedSummary.minWeight} kg`
                      : `${selectedSummary.minWeight} à ${selectedSummary.maxWeight} kg`
                    : "non renseigné"}
                </>
              )}
            </p>
          </div>
        )}

        <button
          className="primary"
          type="button"
          onClick={createCategory}
          disabled={selectedIds.length === 0}
        >
          Valider et créer la catégorie (
          {selectedIds.length})
        </button>
      </div>

      <section className="category-section">
        <div className="category-section-header">
          <div>
            <p className="surtitle">
              VALIDATION
            </p>

            <h3>Catégories créées</h3>

            <p>
              {eventCategories.length} catégorie
              {eventCategories.length > 1
                ? "s"
                : ""}{" "}
              pour {currentEvent.label}.
            </p>
          </div>
        </div>

        {categories.length === 0 ? (
          <div className="empty-state">
            <span className="empty-number">
              0
            </span>

            <h3>Aucune catégorie</h3>

            <p>
              Utilise l'assistant ou sélectionne
              manuellement les compétiteurs pour
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
                  <p className="surtitle">
                    {getEventLabel(
                      category.epreuve
                    )}
                  </p>

                  <h3>{category.nom}</h3>

                  <p>
                    {category.competitorIds?.length ||
                      0}{" "}
                    compétiteur
                    {(category.competitorIds?.length ||
                      0) > 1
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
