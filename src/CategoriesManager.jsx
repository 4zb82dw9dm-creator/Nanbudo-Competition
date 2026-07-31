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

const MIN_GROUP_SIZE = 3;
const TARGET_GROUP_SIZE = 4;

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
      competitor.age !== "" &&
      competitor.age !== undefined &&
      competitor.age !== null
    ) {
      const age = Number(competitor.age);

      if (Number.isFinite(age)) {
        return age;
      }
    }

    if (!competitor.dateNaissance) {
      return null;
    }

    const birthDate = new Date(
      competitor.dateNaissance
    );

    if (Number.isNaN(birthDate.getTime())) {
      return null;
    }

    const referenceDate = competition.date
      ? new Date(competition.date)
      : new Date();

    if (Number.isNaN(referenceDate.getTime())) {
      return null;
    }

    let age =
      referenceDate.getFullYear() -
      birthDate.getFullYear();

    const monthDifference =
      referenceDate.getMonth() -
      birthDate.getMonth();

    if (
      monthDifference < 0 ||
      (monthDifference === 0 &&
        referenceDate.getDate() <
          birthDate.getDate())
    ) {
      age -= 1;
    }

    return age >= 0 ? age : null;
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

  function getGradeValue(competitor) {
    const grade = String(
      competitor.grade || ""
    )
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
      return 10 - Number(kyuMatch[1]);
    }

    return null;
  }

  function getAgeClass(age) {
    if (age === null) {
      return null;
    }

    if (age < 14) {
      return "Enfant";
    }

    if (age <= 17) {
      return "Junior";
    }

    if (age <= 39) {
      return "Senior";
    }

    return "Vétéran";
  }

  function getChildBand(age) {
    if (age === null || age >= 14) {
      return null;
    }

    if (age <= 7) {
      return "6–7 ans";
    }

    if (age <= 9) {
      return "8–9 ans";
    }

    if (age <= 11) {
      return "10–11 ans";
    }

    return "12–13 ans";
  }

  function getCombatFamily(age) {
    if (age === null) {
      return null;
    }

    return age < 10
      ? "randori"
      : "juRandori";
  }

  function eventIsJuRandori(
    type = eventType
  ) {
    return (
      type === "juRandori1" ||
      type === "juRandori2"
    );
  }

  function isAgeAllowedForEvent(
    competitor,
    type = eventType
  ) {
    const age = getAge(competitor);

    if (age === null) {
      return true;
    }

    if (type === "randori") {
      return age < 10;
    }

    if (eventIsJuRandori(type)) {
      return age >= 10;
    }

    return true;
  }

  function isRegisteredForEvent(
    competitor,
    type = eventType
  ) {
    if (
      Array.isArray(competitor.epreuves)
    ) {
      return competitor.epreuves.includes(
        type
      );
    }

    return (
      competitor.epreuves?.[type] === true
    );
  }

  function isAssignedToEvent(
    competitorId,
    type = eventType
  ) {
    return categories.some(
      (category) =>
        category.epreuve === type &&
        (
          category.competitorIds || []
        ).some((id) =>
          sameId(id, competitorId)
        )
    );
  }

  const eligibleCompetitors =
    useMemo(() => {
      return competitors
        .filter((competitor) =>
          isRegisteredForEvent(
            competitor,
            eventType
          )
        )
        .filter((competitor) =>
          isAgeAllowedForEvent(
            competitor,
            eventType
          )
        )
        .sort((a, b) => {
          const ageA = getAge(a);
          const ageB = getAge(b);

          const classA =
            getAgeClass(ageA) || "";

          const classB =
            getAgeClass(ageB) || "";

          const classOrder = {
            Enfant: 1,
            Junior: 2,
            Senior: 3,
            Vétéran: 4,
          };

          const orderA =
            classOrder[classA] || 99;

          const orderB =
            classOrder[classB] || 99;

          if (orderA !== orderB) {
            return orderA - orderB;
          }

          const sexA = a.sexe || "";
          const sexB = b.sexe || "";

          if (sexA !== sexB) {
            return sexA.localeCompare(
              sexB,
              "fr"
            );
          }

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

  const availableCompetitors = useMemo(
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

    const competitor =
      getCompetitor(id);

    if (!competitor) {
      return;
    }

    const alreadySelected =
      selectedIds.some((item) =>
        sameId(item, id)
      );

    if (alreadySelected) {
      setSelectedIds((current) =>
        current.filter(
          (item) =>
            !sameId(item, id)
        )
      );

      setSuggestionInfo(null);
      return;
    }

    const selectedCompetitors =
      selectedIds
        .map((selectedId) =>
          getCompetitor(selectedId)
        )
        .filter(Boolean);

    const competitorAgeClass =
      getAgeClass(
        getAge(competitor)
      );

    const selectedAgeClasses = [
      ...new Set(
        selectedCompetitors
          .map((item) =>
            getAgeClass(
              getAge(item)
            )
          )
          .filter(Boolean)
      ),
    ];

    /*
      Junior / Senior / Vétéran / Enfant
      ne peuvent jamais être mélangés dans
      la même catégorie.
    */
    if (
      selectedAgeClasses.length > 0 &&
      competitorAgeClass &&
      !selectedAgeClasses.includes(
        competitorAgeClass
      )
    ) {
      alert(
        `Sélection impossible : ${competitorAgeClass} ne peut pas être ajouté à une catégorie ${selectedAgeClasses.join(
          " / "
        )}.`
      );

      return;
    }

    /*
      Masculin / féminin séparés par défaut,
      mais porte de sortie manuelle.
    */
    const selectedSexes = [
      ...new Set(
        selectedCompetitors
          .map((item) => item.sexe)
          .filter(Boolean)
      ),
    ];

    if (
      selectedSexes.length > 0 &&
      competitor.sexe &&
      !selectedSexes.includes(
        competitor.sexe
      )
    ) {
      const confirmed =
        window.confirm(
          "Masculin et féminin sont séparés par défaut. Souhaites-tu exceptionnellement préparer une catégorie mixte ?"
        );

      if (!confirmed) {
        return;
      }
    }

    setSelectedIds((current) => [
      ...current,
      id,
    ]);

    setSuggestionInfo(null);
  }

  /*
    La sélection globale de tous les inscrits
    est volontairement supprimée.

    Elle pourrait mélanger Junior, Senior
    et Vétéran.
  */
  function selectAllAvailable() {
    if (
      availableCompetitors.length === 0
    ) {
      return;
    }

    alert(
      "La sélection globale est désactivée afin d'éviter de mélanger les classes d'âge. Sélectionne les compétiteurs d'une même classe ou utilise « Proposer un groupe »."
    );
  }

  function clearSelection() {
    setSelectedIds([]);
    setSuggestionInfo(null);
  }

  function getGroupSpread(group) {
    const ages = group
      .map(getAge)
      .filter(
        (value) => value !== null
      );

    const weights = group
      .map(getWeight)
      .filter(
        (value) => value !== null
      );

    return {
      ageSpread:
        ages.length >= 2
          ? Math.max(...ages) -
            Math.min(...ages)
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

  function groupHasSameSex(group) {
    const sexes = [
      ...new Set(
        group
          .map(
            (competitor) =>
              competitor.sexe
          )
          .filter(Boolean)
      ),
    ];

    return sexes.length <= 1;
  }

  function groupHasSameAgeClass(group) {
    const classes = [
      ...new Set(
        group
          .map((competitor) =>
            getAgeClass(
              getAge(competitor)
            )
          )
          .filter(Boolean)
      ),
    ];

    return classes.length <= 1;
  }

  function groupHasSameCombatFamily(
    group
  ) {
    const families = [
      ...new Set(
        group
          .map((competitor) =>
            getCombatFamily(
              getAge(competitor)
            )
          )
          .filter(Boolean)
      ),
    ];

    return families.length <= 1;
  }

  function groupIsCompatible(
    group,
    {
      strictChildBand = false,
    } = {}
  ) {
    if (group.length <= 1) {
      return true;
    }

    if (!groupHasSameSex(group)) {
      return false;
    }

    /*
      Blocage absolu entre les grandes
      classes d'âge.
    */
    if (
      !groupHasSameAgeClass(group)
    ) {
      return false;
    }

    if (
      eventType === "randori" ||
      eventIsJuRandori()
    ) {
      if (
        !groupHasSameCombatFamily(
          group
        )
      ) {
        return false;
      }
    }

    const ages =
      group.map(getAge);

    const allChildren =
      ages.every(
        (age) =>
          age !== null &&
          age < 14
      );

    if (
      strictChildBand &&
      allChildren
    ) {
      const bands = [
        ...new Set(
          group
            .map((competitor) =>
              getChildBand(
                getAge(competitor)
              )
            )
            .filter(Boolean)
        ),
      ];

      if (bands.length > 1) {
        return false;
      }
    }

    const spread =
      getGroupSpread(group);

    if (
      spread.hasCompleteAges &&
      spread.ageSpread >
        currentLimits.maxAgeSpread
    ) {
      return false;
    }

    if (
      currentLimits.maxWeightSpread !==
        null &&
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
    const referenceAge =
      getAge(referenceCompetitor);

    const candidateAge =
      getAge(competitor);

    const referenceWeight =
      getWeight(
        referenceCompetitor
      );

    const candidateWeight =
      getWeight(competitor);

    const referenceGrade =
      getGradeValue(
        referenceCompetitor
      );

    const candidateGrade =
      getGradeValue(
        competitor
      );

    const ageDifference =
      referenceAge === null ||
      candidateAge === null
        ? null
        : Math.abs(
            referenceAge -
              candidateAge
          );

    const weightDifference =
      referenceWeight === null ||
      candidateWeight === null
        ? null
        : Math.abs(
            referenceWeight -
              candidateWeight
          );

    const gradeDifference =
      referenceGrade === null ||
      candidateGrade === null
        ? null
        : Math.abs(
            referenceGrade -
              candidateGrade
          );

    const differentChildBand =
      referenceAge !== null &&
      candidateAge !== null &&
      referenceAge < 14 &&
      candidateAge < 14 &&
      getChildBand(referenceAge) !==
        getChildBand(candidateAge);

    const childBandPenalty =
      differentChildBand
        ? 2500
        : 0;

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
      childBandPenalty +
      ageScore +
      weightScore +
      gradeScore
    );
  }

  function buildSuggestedGroup(
    startCompetitor,
    strictChildBand
  ) {
    const startAge =
      getAge(startCompetitor);

    const startAgeClass =
      getAgeClass(startAge);

    const candidates =
      availableCompetitors
        .filter(
          (competitor) =>
            !sameId(
              competitor.id,
              startCompetitor.id
            ) &&
            competitor.sexe ===
              startCompetitor.sexe &&
            getAgeClass(
              getAge(competitor)
            ) === startAgeClass
        )
        .map((competitor) => ({
          competitor,

          score:
            calculateCandidateScore(
              startCompetitor,
              competitor
            ),
        }))
        .sort(
          (a, b) =>
            a.score - b.score
        );

    const group = [
      startCompetitor,
    ];

    let rejectedByLimits = 0;

    for (const item of candidates) {
      if (
        group.length >=
        TARGET_GROUP_SIZE
      ) {
        break;
      }

      const proposedGroup = [
        ...group,
        item.competitor,
      ];

      if (
        groupIsCompatible(
          proposedGroup,
          {
            strictChildBand,
          }
        )
      ) {
        group.push(
          item.competitor
        );
      } else {
        rejectedByLimits += 1;
      }
    }

    return {
      group,
      rejectedByLimits,
    };
  }

  function suggestGroup(
    startCompetitor
  ) {
    if (!startCompetitor) {
      return;
    }

    const startAge =
      getAge(startCompetitor);

    const isChild =
      startAge !== null &&
      startAge < 14;

    let result =
      buildSuggestedGroup(
        startCompetitor,
        isChild
      );

    let relaxedChildBand = false;

    /*
      Si moins de 3 enfants dans la tranche
      idéale, on élargit aux âges enfants
      voisins.

      La classe Enfant reste obligatoire.
    */
    if (
      isChild &&
      result.group.length <
        MIN_GROUP_SIZE
    ) {
      const relaxed =
        buildSuggestedGroup(
          startCompetitor,
          false
        );

      if (
        relaxed.group.length >
        result.group.length
      ) {
        result = relaxed;
        relaxedChildBand = true;
      }
    }

    const suggestedIds =
      result.group.map(
        (competitor) =>
          competitor.id
      );

    const spread =
      getGroupSpread(
        result.group
      );

    setSelectedIds(
      suggestedIds
    );

    setSuggestionInfo({
      startId:
        startCompetitor.id,

      count:
        suggestedIds.length,

      ready:
        suggestedIds.length >=
        MIN_GROUP_SIZE,

      ideal:
        suggestedIds.length >=
        TARGET_GROUP_SIZE,

      rejectedByLimits:
        result.rejectedByLimits,

      ageSpread:
        spread.ageSpread,

      weightSpread:
        spread.weightSpread,

      missingAge:
        !spread.hasCompleteAges,

      missingWeight:
        currentEvent.useWeight &&
        !spread.hasCompleteWeights,

      relaxedChildBand,

      ageClass:
        getAgeClass(startAge),

      childBand:
        getChildBand(startAge),
    });

    if (!categoryName.trim()) {
      const sexLabel =
        startCompetitor.sexe ||
        "Non renseigné";

      const ageLabel =
        getAgeClass(startAge) ||
        "Âge à vérifier";

      const bandLabel =
        isChild
          ? ` ${getChildBand(
              startAge
            )}`
          : "";

      setCategoryName(
        `${currentEvent.shortLabel} — ${ageLabel}${bandLabel} — ${sexLabel}`
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
        "Un ou plusieurs compétiteurs sélectionnés ne sont pas admissibles dans cette épreuve. Vérifie notamment la règle Randori moins de 10 ans / Ju Randori à partir de 10 ans."
      );

      return;
    }

    const alreadyAssignedIds =
      selectedIds.filter((id) =>
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

    /*
      Sécurité finale :
      aucune création entre classes d'âge
      différentes.
    */
    if (
      !groupHasSameAgeClass(
        selectedCompetitors
      )
    ) {
      alert(
        "Création impossible : Enfant, Junior, Senior et Vétéran doivent être placés dans des catégories distinctes."
      );

      return;
    }

    if (
      (eventType === "randori" ||
        eventIsJuRandori()) &&
      !groupHasSameCombatFamily(
        selectedCompetitors
      )
    ) {
      alert(
        "Création impossible : les moins de 10 ans relèvent du Randori et les 10 ans et plus du Ju Randori."
      );

      return;
    }

    const confirmations = [];

    /*
      Porte de sortie F/M.
    */
    if (
      !groupHasSameSex(
        selectedCompetitors
      )
    ) {
      confirmations.push(
        "la catégorie est mixte (masculin/féminin)"
      );
    }

    if (
      selectedIds.length <
      MIN_GROUP_SIZE
    ) {
      confirmations.push(
        `la poule ne contient que ${selectedIds.length} compétiteur(s), alors que le minimum visé est ${MIN_GROUP_SIZE}`
      );
    }

    const spread =
      getGroupSpread(
        selectedCompetitors
      );

    if (
      spread.hasCompleteAges &&
      spread.ageSpread >
        currentLimits.maxAgeSpread
    ) {
      confirmations.push(
        `l'écart d'âge est de ${spread.ageSpread} an(s)`
      );
    }

    if (
      currentLimits.maxWeightSpread !==
        null &&
      spread.hasCompleteWeights &&
      spread.weightSpread >
        currentLimits.maxWeightSpread
    ) {
      confirmations.push(
        `l'écart de poids est de ${spread.weightSpread} kg`
      );
    }

    if (
      confirmations.length > 0
    ) {
      const confirmed =
        window.confirm(
          `Dérogation Commission nécessaire :\n\n- ${confirmations.join(
            "\n- "
          )}\n\nConfirmer quand même la création de cette catégorie ?`
        );

      if (!confirmed) {
        return;
      }
    }

    const ageClasses = [
      ...new Set(
        selectedCompetitors
          .map((competitor) =>
            getAgeClass(
              getAge(competitor)
            )
          )
          .filter(Boolean)
      ),
    ];

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
        selectedIds.length >=
        MIN_GROUP_SIZE
          ? "Prête"
          : "Regroupement à vérifier",

      creationMode:
        suggestionInfo
          ? "assistant"
          : "manual",

      ageClass:
        ageClasses.length === 1
          ? ageClasses[0]
          : null,

      derogation:
        confirmations.length > 0,
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
      selectedCompetitors.length === 0
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

    const ageClasses = [
      ...new Set(
        selectedCompetitors
          .map((competitor) =>
            getAgeClass(
              getAge(competitor)
            )
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

      ageClass:
        ageClasses.length === 1
          ? ageClasses[0]
          : ageClasses.length > 1
          ? "Incompatible"
          : "Non renseignée",

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
            BÊTA 0.3
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
          Masculin et féminin sont séparés par
          défaut. Les classes d'âge sont :
          Enfant moins de 14 ans, Junior de 14 à
          17 ans, Senior de 18 à 39 ans et Vétéran
          à partir de 40 ans. Les classes d'âge ne
          sont jamais mélangées automatiquement.
          Chez les enfants, l'assistant privilégie
          les tranches 6–7, 8–9, 10–11 et
          12–13 ans puis élargit si l'effectif est
          insuffisant. Moins de 10 ans : Randori.
          À partir de 10 ans : Ju Randori.
          Objectif 4 compétiteurs, minimum 3.
          Poids et grade servent à rapprocher les
          profils.
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
              placeholder="Ex. Ju Randori 2 — Junior — Homme"
            />
          </label>
        </div>

        <div className="beta-note">
          <strong>
            {currentEvent.label}
          </strong>

          <p>
            {eventType === "randori"
              ? "Seuls les compétiteurs de moins de 10 ans sont admissibles dans cette épreuve."
              : eventIsJuRandori()
              ? "Les compétiteurs de 10 ans et plus sont admissibles, mais Junior, Senior et Vétéran restent dans des catégories distinctes."
              : "Les compétiteurs sont regroupés par classe d'âge et par sexe, puis rapprochés selon leur âge, leur poids et leur grade."}
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
                onClick={clearSelection}
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
          {eligibleCompetitors.length === 0 ? (
            <div className="empty-state">
              <span className="empty-number">
                0
              </span>

              <h3>
                Aucun compétiteur
              </h3>

              <p>
                Aucun participant admissible n'est
                inscrit en {currentEvent.label}.
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
                        {competitor.sexe ||
                          "Sexe non renseigné"}
                      </span>

                      <span>
                        {age !== null
                          ? `${age} ans`
                          : "Âge non renseigné"}
                      </span>

                      <span>
                        {age !== null
                          ? getAgeClass(age)
                          : "Classe d'âge inconnue"}
                      </span>

                      {age !== null &&
                        age < 14 && (
                          <span>
                            {getChildBand(
                              age
                            )}
                          </span>
                        )}

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

            {suggestionInfo.ideal ? (
              <p>
                Groupe idéal de 4 compétiteurs
                proposé dans la même classe d'âge
                et du même sexe.
              </p>
            ) : suggestionInfo.ready ? (
              <p>
                Groupe de{" "}
                {suggestionInfo.count} compétiteurs
                proposé. Le minimum de 3 est
                atteint.
              </p>
            ) : (
              <p>
                Seulement{" "}
                {suggestionInfo.count} compétiteur
                {suggestionInfo.count > 1
                  ? "s"
                  : ""}{" "}
                compatible
                {suggestionInfo.count > 1
                  ? "s"
                  : ""}
                . Le regroupement doit être
                contrôlé avant validation.
              </p>
            )}

            {suggestionInfo.relaxedChildBand && (
              <p>
                Effectif insuffisant dans la tranche
                enfant initiale : l'assistant a
                recherché des enfants d'âges voisins
                sans changer de classe d'âge ni
                franchir la limite Randori /
                Ju Randori.
              </p>
            )}

            <p>
              Classe :{" "}
              {suggestionInfo.ageClass ||
                "non renseignée"}
              {" · "}
              Écart d'âge :{" "}
              {suggestionInfo.ageSpread} an(s)
              {currentEvent.useWeight
                ? ` · Écart de poids : ${suggestionInfo.weightSpread} kg`
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
              Classe :{" "}
              {selectedSummary.ageClass}
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

            <h3>
              Catégories créées
            </h3>

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

            <h3>
              Aucune catégorie
            </h3>

            <p>
              Utilise l'assistant ou sélectionne
              manuellement les compétiteurs pour
              créer la première catégorie.
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
                      {category.competitorIds
                        ?.length || 0}{" "}
                      compétiteur
                      {(category.competitorIds
                        ?.length || 0) > 1
                        ? "s"
                        : ""}

                      {category.ageClass
                        ? ` · ${category.ageClass}`
                        : ""}

                      {category.derogation
                        ? " · Dérogation Commission"
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
              )
            )}
          </div>
        )}
      </section>
    </div>
  );
}

export default CategoriesManager;
