import { useMemo, useState } from "react";

const EVENT_DEFINITIONS = {
  kata0: {
    label: "Kata 0 — Shihotai",
    shortLabel: "Kata 0",
    useWeight: false,
    useGrade: true,
  },
  kata1: {
    label: "Kata 1",
    shortLabel: "Kata 1",
    useWeight: false,
    useGrade: true,
  },
  kata2: {
    label: "Kata 2",
    shortLabel: "Kata 2",
    useWeight: false,
    useGrade: true,
  },
  randori: {
    label: "Randori",
    shortLabel: "Randori",
    useWeight: false,
    useGrade: true,
  },
  juRandori1: {
    label: "Ju Randori 1",
    shortLabel: "Ju Randori 1",
    useWeight: true,
    useGrade: true,
  },
  juRandori2: {
    label: "Ju Randori 2",
    shortLabel: "Ju Randori 2",
    useWeight: true,
    useGrade: true,
  },
};

const TARGET_GROUP_SIZE = 4;

/*
  Seuils de prudence de l'assistant BÊTA.

  Ils servent uniquement à éviter des propositions
  manifestement trop éloignées.

  Ils ne constituent PAS des catégories ni des
  règles sportives officielles AFDP.
*/
const ASSISTANT_LIMITS = {
  kata0: {
    maxAgeSpread: 6,
    maxWeightSpread: null,
  },

  kata1: {
    maxAgeSpread: 6,
    maxWeightSpread: null,
  },

  kata2: {
    maxAgeSpread: 8,
    maxWeightSpread: null,
  },

  randori: {
    maxAgeSpread: 6,
    maxWeightSpread: null,
  },

  juRandori1: {
    maxAgeSpread: 6,
    maxWeightSpread: 10,
  },

  juRandori2: {
    maxAgeSpread: 6,
    maxWeightSpread: 10,
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
  const [suggestionInfo, setSuggestionInfo] =
    useState(null);

  const currentEvent =
    EVENT_DEFINITIONS[eventType] ||
    EVENT_DEFINITIONS.kata0;

  const currentLimits =
    ASSISTANT_LIMITS[eventType] ||
    ASSISTANT_LIMITS.kata0;

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

  /*
    Conversion simple du grade en valeur numérique.

    Le grade est utilisé comme critère secondaire
    de classement par l'assistant.

    Il ne bloque jamais automatiquement la création
    d'une catégorie.
  */
  function getGradeValue(competitor) {
    const grade = String(competitor.grade || "")
      .trim()
      .toLowerCase();

    if (!grade) {
      return null;
    }

    const danMatch = grade.match(
      /(\d+)\s*(?:er|e|ème)?\s*dan/
    );

    if (danMatch) {
      return 10 + Number(danMatch[1]);
    }

    const kyuMatch = grade.match(
      /(\d+)\s*(?:er|e|ème)?\s*kyu/
    );

    if (kyuMatch) {
      const kyu = Number(kyuMatch[1]);

      return 10 - kyu;
    }

    return null;
  }

  function isAssignedToEvent(
    competitorId,
    type = eventType
  ) {
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

        return `${a.nom || ""} ${
          a.prenom || ""
        }`.localeCompare(
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
        ? current.filter(
            (item) => !sameId(item, id)
          )
        : [...current, id]
    );

    setSuggestionInfo(null);
  }

  function selectAllAvailable() {
    setSelectedIds(
      availableCompetitors.map(
        (competitor) => competitor.id
      )
    );

    setSuggestionInfo(null);
  }

  function clearSelection() {
    setSelectedIds([]);
    setSuggestionInfo(null);
  }

  /*
    Retourne l'amplitude d'âge et de poids
    d'un groupe COMPLET.

    Exemple :
    18, 21, 23, 24 ans => amplitude 6 ans.

    C'est cette amplitude qui est contrôlée,
    et non simplement la distance avec le
    compétiteur ayant lancé la proposition.
  */
  function getGroupSpread(group) {
    const ages = group
      .map(getAge)
      .filter((value) => value !== null);

    const weights = group
      .map(getWeight)
      .filter((value) => value !== null);

    return {
      ageSpread:
        ages.length >= 2
          ? Math.max(...ages) - Math.min(...ages)
          : 0,

      weightSpread:
        weights.length >= 2
          ? Math.max(...weights) -
            Math.min(...weights)
          : 0,

      hasCompleteAges:
        ages.length === group.length,

      hasCompleteWeights:
        weights.length === group.length,
    };
  }

  function groupIsCompatible(group) {
    if (group.length <= 1) {
      return true;
    }

    /*
      L'assistant automatique ne mélange
      jamais les sexes.
    */
    const sexes = [
      ...new Set(
        group
          .map((competitor) => competitor.sexe)
          .filter(Boolean)
      ),
    ];

    if (sexes.length > 1) {
      return false;
    }

    const spread = getGroupSpread(group);

    if (
      spread.hasCompleteAges &&
      spread.ageSpread > currentLimits.maxAgeSpread
    ) {
      return false;
    }

    if (
      currentLimits.maxWeightSpread !== null &&
      spread.hasCompleteWeights &&
      spread.weightSpread >
        currentLimits.maxWeightSpread
    ) {
      return false;
    }

    return true;
  }

  function calculateCandidateScore(
    referenceCompetitor,
    competitor
  ) {
    const referenceAge = getAge(
      referenceCompetitor
    );

    const candidateAge = getAge(competitor);

    const referenceWeight = getWeight(
      referenceCompetitor
    );

    const candidateWeight = getWeight(competitor);

    const referenceGrade = getGradeValue(
      referenceCompetitor
    );

    const candidateGrade = getGradeValue(
      competitor
    );

    const ageDifference =
      referenceAge === null ||
      candidateAge === null
        ? null
        : Math.abs(
            referenceAge - candidateAge
          );

    const weightDifference =
      referenceWeight === null ||
      candidateWeight === null
        ? null
        : Math.abs(
            referenceWeight - candidateWeight
          );

    const gradeDifference =
      referenceGrade === null ||
      candidateGrade === null
        ? null
        : Math.abs(
            referenceGrade - candidateGrade
          );

    /*
      Âge = critère principal.

      Poids = critère important en Ju Randori.

      Grade = critère secondaire permettant
      simplement de départager des profils
      proches.
    */
    const ageScore =
      ageDifference === null
        ? 5000
        : ageDifference * 1000;

    const weightScore =
      weightDifference === null
        ? currentEvent.useWeight
          ? 500
          : 0
        : currentEvent.useWeight
        ? weightDifference * 50
        : 0;

    const gradeScore =
      currentEvent.useGrade
        ? gradeDifference === null
          ? 20
          : gradeDifference * 5
        : 0;

    return (
      ageScore +
      weightScore +
      gradeScore
    );
  }

  function suggestGroup(startCompetitor) {
    if (!startCompetitor) {
      return;
    }

    /*
      On part du compétiteur sélectionné.

      Puis on teste les autres un par un.

      Un candidat n'est ajouté QUE si le
      groupe complet reste compatible.
    */

    const candidates = availableCompetitors
      .filter(
        (competitor) =>
          !sameId(
            competitor.id,
            startCompetitor.id
          ) &&
          competitor.sexe === startCompetitor.sexe
      )
      .map((competitor) => ({
        competitor,

        score: calculateCandidateScore(
          startCompetitor,
          competitor
        ),
      }))
      .sort((a, b) => a.score - b.score);

    const group = [startCompetitor];

    let rejectedByLimits = 0;

    for (const item of candidates) {
      if (group.length >= TARGET_GROUP_SIZE) {
        break;
      }

      const proposedGroup = [
        ...group,
        item.competitor,
      ];

      if (groupIsCompatible(proposedGroup)) {
        group.push(item.competitor);
      } else {
        rejectedByLimits += 1;
      }
    }

    const suggestedIds = group.map(
      (competitor) => competitor.id
    );

    const spread = getGroupSpread(group);

    setSelectedIds(suggestedIds);

    setSuggestionInfo({
      startId: startCompetitor.id,

      count: suggestedIds.length,

      complete:
        suggestedIds.length >= TARGET_GROUP_SIZE,

      rejectedByLimits,

      ageSpread: spread.ageSpread,

      weightSpread: spread.weightSpread,

      missingAge:
        !spread.hasCompleteAges,

      missingWeight:
        currentEvent.useWeight &&
        !spread.hasCompleteWeights,
    });

    if (!categoryName.trim()) {
      const sexLabel =
        startCompetitor.sexe ||
        "Non renseigné";

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

    const alreadyAssignedIds =
      selectedIds.filter((id) =>
        isAssignedToEvent(id)
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
          .map(
            (competitor) => competitor.sexe
          )
          .filter(Boolean)
      ),
    ];

    if (sexes.length > 1) {
      const confirmed = window.confirm(
        "Cette catégorie contient des compétiteurs de sexes différents. Confirmer quand même la création ?"
      );

      if (!confirmed) {
        return;
      }
    }

    const spread = getGroupSpread(
      selectedCompetitors
    );

    const ageWarning =
      spread.hasCompleteAges &&
      spread.ageSpread >
        currentLimits.maxAgeSpread;

    const weightWarning =
      currentLimits.maxWeightSpread !== null &&
      spread.hasCompleteWeights &&
      spread.weightSpread >
        currentLimits.maxWeightSpread;

    if (ageWarning || weightWarning) {
      const details = [];

      if (ageWarning) {
        details.push(
          `Écart d'âge : ${spread.ageSpread} an(s)`
        );
      }

      if (weightWarning) {
        details.push(
          `Écart de poids : ${spread.weightSpread} kg`
        );
      }

      const confirmed = window.confirm(
        `Attention : ce regroupement dépasse les seuils de prudence de l'assistant bêta.\n\n${details.join(
          "\n"
        )}\n\nCes seuils ne constituent pas une règle sportive AFDP.\n\nConfirmer quand même la catégorie ?`
      );

      if (!confirmed) {
        return;
      }
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

      creationMode: suggestionInfo
        ? "assistant"
        : "manual",
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
    setSuggestionInfo(null);
  }

  function deleteCategory(id) {
    const linkedPool = (
      competition.pools || []
    ).some((pool) =>
      sameId(pool.categoryId, id)
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

    if (!confirmed) {
      return;
    }

    onUpdateCompetition({
      ...competition,

      categories: categories.filter(
        (category) =>
          !sameId(category.id, id)
      ),
    });

    setSelectedIds([]);
    setSuggestionInfo(null);
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
          .map(
            (competitor) => competitor.sexe
          )
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

  const selectedSummary =
    getSelectedSummary();

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
          <strong>
            {categories.length}
          </strong>

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
          L'assistant rapproche les compétiteurs
          par sexe, âge, poids et grade afin
          d'aider l'organisateur. Il contrôle
          désormais la cohérence du groupe complet
          avant de proposer un compétiteur. Les
          seuils utilisés dans cette version bêta
          ne constituent pas des catégories
          officielles AFDP. La validation finale
          reste à l'organisateur.
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
                setEventType(
                  event.target.value
                );

                setSelectedIds([]);
                setCategoryName("");
                setSuggestionInfo(null);
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
                  : "Ex. Ju Randori Séniors"
              }
            />
          </label>
        </div>

        <div className="beta-note">
          <strong>
            {currentEvent.label}
          </strong>

          <p>
            Les compétiteurs sont présentés par
            sexe, puis par âge et par poids pour
            faciliter le contrôle de
            l'organisateur.
            {currentEvent.useWeight
              ? " Pour cette épreuve, le poids intervient également dans les propositions de l'assistant."
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
                disabled={
                  selectedIds.length === 0
                }
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

        {suggestionInfo && (
          <div className="beta-note">
            <strong>
              Proposition de l'assistant
            </strong>

            {suggestionInfo.complete ? (
              <p>
                Un groupe de{" "}
                {suggestionInfo.count} compétiteurs
                cohérents a été proposé. Le contrôle
                porte sur l'ensemble du groupe.
                Vérifie le regroupement avant de le
                valider.
              </p>
            ) : (
              <p>
                Seulement{" "}
                {suggestionInfo.count} compétiteur
                {suggestionInfo.count > 1
                  ? "s"
                  : ""}{" "}
                suffisamment proche
                {suggestionInfo.count > 1
                  ? "s ont"
                  : " a"}{" "}
                été trouvé
                {suggestionInfo.count > 1
                  ? "s"
                  : ""}.
                L'assistant n'a pas ajouté de
                compétiteur qui aurait rendu le
                groupe trop hétérogène. Tu peux
                compléter manuellement si
                nécessaire.
              </p>
            )}

            <p>
              Écart du groupe :{" "}
              {suggestionInfo.ageSpread} an(s)
              {currentEvent.useWeight
                ? ` · ${suggestionInfo.weightSpread} kg`
                : ""}
            </p>
          </div>
        )}

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
          disabled={
            selectedIds.length === 0
          }
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

                  <h3>
                    {category.nom}
                  </h3>

                  <p>
                    {category.competitorIds
                      ?.length || 0}{" "}
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
