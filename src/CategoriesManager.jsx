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

const TARGET_GROUP_SIZE = 4;

/*
  Limites de l'assistant BÊTA.

  Elles servent uniquement à empêcher l'application
  de proposer des regroupements manifestement trop
  éloignés.

  Ce ne sont PAS des catégories ni des règles
  sportives officielles AFDP.
*/
const ASSISTANT_LIMITS = {
  juRandori1: {
    maxAgeDifference: 6,
    maxWeightDifference: 10,
  },

  juRandori2: {
    maxAgeDifference: 6,
    maxWeightDifference: 10,
  },

  randori: {
    maxAgeDifference: 6,
    maxWeightDifference: null,
  },

  kata0: {
    maxAgeDifference: 6,
    maxWeightDifference: null,
  },

  kata1: {
    maxAgeDifference: 6,
    maxWeightDifference: null,
  },

  kata2: {
    maxAgeDifference: 8,
    maxWeightDifference: null,
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

    return Number.isFinite(age)
      ? age
      : null;
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

    return Number.isFinite(weight)
      ? weight
      : null;
  }

  /*
    Conversion simple du grade en valeur numérique.

    Plus le nombre est élevé, plus le grade est
    considéré comme avancé.

    Cette valeur ne sert qu'au tri de l'assistant.
  */
  function getGradeValue(competitor) {
    const grade = String(
      competitor.grade || ""
    )
      .trim()
      .toLowerCase();

    if (!grade) {
      return null;
    }

    const danMatch =
      grade.match(/(\d+)\s*(?:er|e|ème)?\s*dan/);

    if (danMatch) {
      return 10 + Number(danMatch[1]);
    }

    const kyuMatch =
      grade.match(/(\d+)\s*(?:er|e|ème)?\s*kyu/);

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
        (category.competitorIds || []).some(
          (id) =>
            sameId(
              id,
              competitorId
            )
        )
    );
  }

  const eligibleCompetitors = useMemo(() => {
    return competitors
      .filter(
        (competitor) =>
          competitor.epreuves?.[
            eventType
          ] === true
      )
      .sort((a, b) => {
        const sexA = a.sexe || "";
        const sexB = b.sexe || "";

        if (sexA !== sexB) {
          return sexA.localeCompare(
            sexB,
            "fr"
          );
        }

        const ageA = getAge(a);
        const ageB = getAge(b);

        if (ageA !== ageB) {
          if (ageA === null) return 1;
          if (ageB === null) return -1;

          return ageA - ageB;
        }

        const weightA =
          getWeight(a);

        const weightB =
          getWeight(b);

        if (weightA !== weightB) {
          if (weightA === null) return 1;
          if (weightB === null) return -1;

          return (
            weightA -
            weightB
          );
        }

        return `${a.nom || ""} ${
          a.prenom || ""
        }`.localeCompare(
          `${b.nom || ""} ${
            b.prenom || ""
          }`,
          "fr"
        );
      });
  }, [
    competitors,
    categories,
    eventType,
  ]);

  const availableCompetitors =
    useMemo(
      () =>
        eligibleCompetitors.filter(
          (competitor) =>
            !isAssignedToEvent(
              competitor.id
            )
        ),
      [
        eligibleCompetitors,
        categories,
        eventType,
      ]
    );

  const eventCategories =
    categories.filter(
      (category) =>
        category.epreuve === eventType
    );

  function getCompetitor(id) {
    return competitors.find(
      (competitor) =>
        sameId(
          competitor.id,
          id
        )
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
      current.some((item) =>
        sameId(item, id)
      )
        ? current.filter(
            (item) =>
              !sameId(
                item,
                id
              )
          )
        : [...current, id]
    );

    /*
      Dès qu'une sélection est modifiée
      manuellement, elle n'est plus considérée
      comme la proposition automatique initiale.
    */
    setSuggestionInfo(null);
  }

  function selectAllAvailable() {
    setSelectedIds(
      availableCompetitors.map(
        (competitor) =>
          competitor.id
      )
    );

    setSuggestionInfo(null);
  }

  function clearSelection() {
    setSelectedIds([]);
    setSuggestionInfo(null);
  }

  function calculateCandidateData(
    startCompetitor,
    competitor
  ) {
    const startAge =
      getAge(startCompetitor);

    const candidateAge =
      getAge(competitor);

    const startWeight =
      getWeight(startCompetitor);

    const candidateWeight =
      getWeight(competitor);

    const startGrade =
      getGradeValue(startCompetitor);

    const candidateGrade =
      getGradeValue(competitor);

    const ageDifference =
      startAge === null ||
      candidateAge === null
        ? null
        : Math.abs(
            startAge -
              candidateAge
          );

    const weightDifference =
      startWeight === null ||
      candidateWeight === null
        ? null
        : Math.abs(
            startWeight -
              candidateWeight
          );

    const gradeDifference =
      startGrade === null ||
      candidateGrade === null
        ? null
        : Math.abs(
            startGrade -
              candidateGrade
          );

    return {
      competitor,
      ageDifference,
      weightDifference,
      gradeDifference,
    };
  }

  function candidateIsCompatible(
    candidate
  ) {
    const limits =
      ASSISTANT_LIMITS[eventType];

    if (!limits) {
      return true;
    }

    /*
      Si l'âge est connu chez les deux
      compétiteurs, on refuse un écart
      supérieur à la limite de l'assistant.
    */
    if (
      candidate.ageDifference !== null &&
      candidate.ageDifference >
        limits.maxAgeDifference
    ) {
      return false;
    }

    /*
      Pour Ju Randori, même principe avec
      le poids.
    */
    if (
      limits.maxWeightDifference !==
        null &&
      candidate.weightDifference !==
        null &&
      candidate.weightDifference >
        limits.maxWeightDifference
    ) {
      return false;
    }

    return true;
  }

  function candidateScore(candidate) {
    /*
      Âge très prioritaire.

      Puis poids pour Ju Randori.

      Enfin grade comme petit critère
      complémentaire.
    */

    const ageScore =
      candidate.ageDifference === null
        ? 5000
        : candidate.ageDifference * 1000;

    const weightScore =
      candidate.weightDifference === null
        ? currentEvent.useWeight
          ? 500
          : 0
        : currentEvent.useWeight
        ? candidate.weightDifference * 50
        : candidate.weightDifference;

    const gradeScore =
      candidate.gradeDifference === null
        ? 20
        : candidate.gradeDifference * 5;

    return (
      ageScore +
      weightScore +
      gradeScore
    );
  }

  function suggestGroup(
    startCompetitor
  ) {
    if (!startCompetitor) {
      return;
    }

    /*
      RÈGLE DE SÉCURITÉ DE L'ASSISTANT :

      jamais de proposition automatique
      mélangeant les sexes.

      Une sélection mixte reste possible
      manuellement avec confirmation lors
      de la création.
    */
    const sameSexCandidates =
      availableCompetitors.filter(
        (competitor) =>
          !sameId(
            competitor.id,
            startCompetitor.id
          ) &&
          competitor.sexe ===
            startCompetitor.sexe
      );

    const analysedCandidates =
      sameSexCandidates.map(
        (competitor) =>
          calculateCandidateData(
            startCompetitor,
            competitor
          )
      );

    const compatibleCandidates =
      analysedCandidates
        .filter(
          candidateIsCompatible
        )
        .sort(
          (a, b) =>
            candidateScore(a) -
            candidateScore(b)
        );

    const selectedCandidates =
      compatibleCandidates.slice(
        0,
        TARGET_GROUP_SIZE - 1
      );

    const suggestedIds = [
      startCompetitor.id,
      ...selectedCandidates.map(
        (item) =>
          item.competitor.id
      ),
    ];

    setSelectedIds(
      suggestedIds
    );

    const startAge =
      getAge(startCompetitor);

    const startWeight =
      getWeight(startCompetitor);

    const excludedByLimits =
      analysedCandidates.filter(
        (candidate) =>
          !candidateIsCompatible(
            candidate
          )
      ).length;

    setSuggestionInfo({
      startId:
        startCompetitor.id,

      count:
        suggestedIds.length,

      complete:
        suggestedIds.length >=
        TARGET_GROUP_SIZE,

      excludedByLimits,

      referenceAge:
        startAge,

      referenceWeight:
        startWeight,
    });

    if (
      !categoryName.trim()
    ) {
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
      alert(
        "Indique le nom de la catégorie."
      );

      return;
    }

    if (
      selectedIds.length === 0
    ) {
      alert(
        "Sélectionne au moins un compétiteur."
      );

      return;
    }

    const invalidIds =
      selectedIds.filter(
        (id) =>
          !eligibleCompetitors.some(
            (competitor) =>
              sameId(
                competitor.id,
                id
              )
          )
      );

    if (
      invalidIds.length > 0
    ) {
      alert(
        "Un ou plusieurs compétiteurs sélectionnés ne sont pas inscrits dans cette épreuve."
      );

      return;
    }

    const alreadyAssignedIds =
      selectedIds.filter(
        (id) =>
          isAssignedToEvent(id)
      );

    if (
      alreadyAssignedIds.length > 0
    ) {
      alert(
        "Un ou plusieurs compétiteurs appartiennent déjà à une catégorie de cette épreuve."
      );

      return;
    }

    const selectedCompetitors =
      selectedIds
        .map((id) =>
          getCompetitor(id)
        )
        .filter(Boolean);

    const sexes = [
      ...new Set(
        selectedCompetitors
          .map(
            (competitor) =>
              competitor.sexe
          )
          .filter(Boolean)
      ),
    ];

    if (sexes.length > 1) {
      const confirmed =
        window.confirm(
          "Cette catégorie contient des compétiteurs de sexes différents. Confirmer quand même la création ?"
        );

      if (!confirmed) {
        return;
      }
    }

    /*
      Pour Ju Randori, on signale les
      regroupements présentant des écarts
      importants.

      On n'interdit pas la validation :
      la décision reste à l'organisateur.
    */
    if (
      eventType ===
        "juRandori1" ||
      eventType ===
        "juRandori2"
    ) {
      const ages =
        selectedCompetitors
          .map(getAge)
          .filter(
            (value) =>
              value !== null
          );

      const weights =
        selectedCompetitors
          .map(getWeight)
          .filter(
            (value) =>
              value !== null
          );

      const ageSpread =
        ages.length >= 2
          ? Math.max(...ages) -
            Math.min(...ages)
          : 0;

      const weightSpread =
        weights.length >= 2
          ? Math.max(...weights) -
            Math.min(...weights)
          : 0;

      const limits =
        ASSISTANT_LIMITS[
          eventType
        ];

      if (
        ageSpread >
          limits.maxAgeDifference ||
        weightSpread >
          limits.maxWeightDifference
      ) {
        const confirmed =
          window.confirm(
            `Attention : ce regroupement présente un écart important.\n\nÂge : ${ageSpread} an(s)\nPoids : ${weightSpread} kg\n\nCes seuils sont uniquement ceux de l'assistant bêta et ne constituent pas une règle AFDP.\n\nConfirmer quand même la catégorie ?`
          );

        if (!confirmed) {
          return;
        }
      }
    }

    const newCategory = {
      id: `${Date.now()}-category`,

      nom:
        categoryName.trim(),

      epreuve:
        eventType,

      epreuveLabel:
        currentEvent.label,

      competitorIds: [
        ...selectedIds,
      ],

      statut:
        selectedIds.length >= 3
          ? "Prête"
          : "Regroupement à vérifier",

      creationMode:
        suggestionInfo
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
    const linkedPool =
      (
        competition.pools ||
        []
      ).some(
        (pool) =>
          sameId(
            pool.categoryId,
            id
          )
      );

    if (linkedPool) {
      alert(
        "Suppression impossible : une poule a déjà été générée pour cette catégorie. Supprime d'abord la poule concernée."
      );

      return;
    }

    const confirmed =
      window.confirm(
        "Supprimer cette catégorie ? Les compétiteurs redeviendront disponibles pour cette épreuve."
      );

    if (!confirmed) {
      return;
    }

    onUpdateCompetition({
      ...competition,

      categories:
        categories.filter(
          (category) =>
            !sameId(
              category.id,
              id
            )
        ),
    });

    setSelectedIds([]);
    setSuggestionInfo(null);
  }

  function getSelectedSummary() {
    const selectedCompetitors =
      selectedIds
        .map((id) =>
          getCompetitor(id)
        )
        .filter(Boolean);

    if (
      selectedCompetitors.length ===
      0
    ) {
      return null;
    }

    const ages =
      selectedCompetitors
        .map(getAge)
        .filter(
          (value) =>
            value !== null
        );

    const weights =
      selectedCompetitors
        .map(getWeight)
        .filter(
          (value) =>
            value !== null
        );

    const sexes = [
      ...new Set(
        selectedCompetitors
          .map(
            (competitor) =>
              competitor.sexe
          )
          .filter(Boolean)
      ),
    ];

    return {
      count:
        selectedCompetitors.length,

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

          <h2>
            Catégories
          </h2>

          <p>
            Prépare les regroupements
            avant la génération des
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

      <div className="beta-note">
        <strong>
          Assistant de regroupement
        </strong>

        <p>
          L'assistant rapproche les
          compétiteurs par sexe, âge,
          poids et grade afin d'aider
          l'organisateur. Les seuils
          utilisés dans cette version
          bêta ne constituent pas des
          catégories officielles AFDP.
          La validation finale reste à
          l'organisateur.
        </p>
      </div>

      <div className="competition-form">
        <h3>
          Préparer une catégorie
        </h3>

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
            Les compétiteurs sont
            présentés par sexe, puis par
            âge et par poids pour
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
              {
                eligibleCompetitors.length
              }{" "}
              inscrit
              {eligibleCompetitors.length >
              1
                ? "s"
                : ""}
            </h3>

            <p>
              {
                availableCompetitors.length
              }{" "}
              disponible
              {availableCompetitors.length >
              1
                ? "s"
                : ""}{" "}
              pour cette épreuve.
            </p>
          </div>

          {eligibleCompetitors.length >
            0 && (
            <div className="competition-actions">
              <button
                className="manage-button"
                type="button"
                onClick={
                  selectAllAvailable
                }
                disabled={
                  availableCompetitors.length ===
                  0
                }
              >
                Sélectionner les disponibles
              </button>

              <button
                className="manage-button"
                type="button"
                onClick={
                  clearSelection
                }
                disabled={
                  selectedIds.length ===
                  0
                }
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
                  isAssignedToEvent(
                    competitor.id
                  );

                const age =
                  getAge(
                    competitor
                  );

                const weight =
                  getWeight(
                    competitor
                  );

                return (
                  <div
                    className="category-competitor"
                    key={
                      competitor.id
                    }
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
                        {
                          competitor.prenom
                        }
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
                          {
                            competitor.grade
                          }
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
                {
                  suggestionInfo.count
                }{" "}
                compétiteurs proches a
                été proposé. Contrôle le
                regroupement avant de le
                valider.
              </p>
            ) : (
              <p>
                Seulement{" "}
                {
                  suggestionInfo.count
                }{" "}
                compétiteur
                {suggestionInfo.count >
                1
                  ? "s"
                  : ""}{" "}
                suffisamment proche
                {suggestionInfo.count >
                1
                  ? "s ont"
                  : " a"}{" "}
                été trouvé
                {suggestionInfo.count >
                1
                  ? "s"
                  : ""}.
                L'assistant n'a pas
                élargi automatiquement
                le groupe au-delà de ses
                limites de prudence.
                L'organisateur peut
                compléter manuellement
                si nécessaire.
              </p>
            )}
          </div>
        )}

        {selectedSummary && (
          <div className="beta-note">
            <strong>
              Groupe sélectionné :{" "}
              {
                selectedSummary.count
              }{" "}
              compétiteur
              {selectedSummary.count >
              1
                ? "s"
                : ""}
            </strong>

            <p>
              Sexe :{" "}
              {selectedSummary.sex}
              {" · "}
              Âge :{" "}
              {selectedSummary.minAge !==
              null
                ? selectedSummary.minAge ===
                  selectedSummary.maxAge
                  ? `${selectedSummary.minAge} ans`
                  : `${selectedSummary.minAge} à ${selectedSummary.maxAge} ans`
                : "non renseigné"}

              {currentEvent.useWeight && (
                <>
                  {" · "}
                  Poids :{" "}
                  {selectedSummary.minWeight !==
                  null
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
          onClick={
            createCategory
          }
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

            <h3>
              Catégories créées
            </h3>

            <p>
              {
                eventCategories.length
              }{" "}
              catégorie
              {eventCategories.length >
              1
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
              Utilise l'assistant ou
              sélectionne manuellement
              les compétiteurs pour
              créer la première
              catégorie.
            </p>
          </div>
        ) : (
          <div className="competition-list">
            {categories.map(
              (category) => (
                <article
                  className="competition"
                  key={
                    category.id
                  }
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
                      {category
                        .competitorIds
                        ?.length ||
                        0}{" "}
                      compétiteur
                      {(category
                        .competitorIds
                        ?.length ||
                        0) > 1
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

                          if (
                            !competitor
                          ) {
                            return null;
                          }

                          return (
                            <span
                              key={
                                id
                              }
                            >
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
                      {
                        category.statut
                      }
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
