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

const AGE_CLASS_ORDER = {
  Enfant: 1,
  Junior: 2,
  Senior: 3,
  Vétéran: 4,
};

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
  const [suggestionInfo, setSuggestionInfo] = useState(null);

  /*
    Propositions préparées par le générateur automatique.
    Elles ne sont pas enregistrées dans competition.categories
    tant que l'organisateur ne les valide pas.
  */
  const [automaticGroups, setAutomaticGroups] = useState([]);

  const currentEvent =
    EVENT_DEFINITIONS[eventType] ||
    EVENT_DEFINITIONS.kata0;

  const currentLimits =
    ASSISTANT_LIMITS[eventType] ||
    ASSISTANT_LIMITS.kata0;

  function sameId(a, b) {
    return String(a) === String(b);
  }

  function makeId(prefix = "id") {
    if (
      typeof crypto !== "undefined" &&
      typeof crypto.randomUUID === "function"
    ) {
      return `${prefix}-${crypto.randomUUID()}`;
    }

    return `${prefix}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}`;
  }

  function normalizeSex(sex) {
    const value = String(sex || "")
      .trim()
      .toLowerCase();

    if (
      value === "homme" ||
      value === "h" ||
      value === "masculin" ||
      value === "m"
    ) {
      return "Homme";
    }

    if (
      value === "femme" ||
      value === "f" ||
      value === "féminin" ||
      value === "feminin"
    ) {
      return "Femme";
    }

    return sex || "Non renseigné";
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

    const birthDate = new Date(competitor.dateNaissance);

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
        referenceDate.getDate() < birthDate.getDate())
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
      return 10 - Number(kyuMatch[1]);
    }

    return null;
  }

  /*
    Classes principales.

    Enfant  : moins de 14 ans
    Junior  : 14 à 17 ans
    Senior  : 18 à 39 ans
    Vétéran : 40 ans et plus
  */
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

  /*
    Tranches prioritaires chez les enfants.

    Elles servent au regroupement automatique.
    Elles peuvent être assouplies si l'effectif
    ne permet pas de former une poule.
  */
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

  function eventIsJuRandori(type = eventType) {
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

    /*
      Si l'âge manque, le participant reste visible
      pour permettre à l'organisateur de repérer
      et corriger sa fiche.

      En revanche il ne sera pas utilisé par le
      générateur automatique.
    */
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
    if (Array.isArray(competitor.epreuves)) {
      return competitor.epreuves.includes(type);
    }

    return competitor.epreuves?.[type] === true;
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

  function compareCompetitors(a, b) {
    const ageA = getAge(a);
    const ageB = getAge(b);

    const classA = getAgeClass(ageA);
    const classB = getAgeClass(ageB);

    const orderA =
      AGE_CLASS_ORDER[classA] || 99;

    const orderB =
      AGE_CLASS_ORDER[classB] || 99;

    if (orderA !== orderB) {
      return orderA - orderB;
    }

    const sexA = normalizeSex(a.sexe);
    const sexB = normalizeSex(b.sexe);

    if (sexA !== sexB) {
      return sexA.localeCompare(sexB, "fr");
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

    const gradeA = getGradeValue(a);
    const gradeB = getGradeValue(b);

    if (gradeA !== gradeB) {
      if (gradeA === null) return 1;
      if (gradeB === null) return -1;

      return gradeA - gradeB;
    }

    return `${a.nom || ""} ${a.prenom || ""}`.localeCompare(
      `${b.nom || ""} ${b.prenom || ""}`,
      "fr"
    );
  }

  const eligibleCompetitors = useMemo(() => {
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
      .sort(compareCompetitors);
  }, [
    competitors,
    categories,
    eventType,
    competition.date,
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

  const eventCategories = categories.filter(
    (category) =>
      category.epreuve === eventType
  );

  function toggleCompetitor(id) {
    if (isAssignedToEvent(id)) {
      return;
    }

    const competitor = getCompetitor(id);

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
      Les classes principales ne peuvent pas
      être mélangées dans une catégorie.
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
      Masculin / féminin séparés par défaut.

      La sélection manuelle conserve une porte
      de sortie pour une décision exceptionnelle
      de la Commission.
    */
    const selectedSexes = [
      ...new Set(
        selectedCompetitors
          .map((item) =>
            normalizeSex(item.sexe)
          )
          .filter(Boolean)
      ),
    ];

    const competitorSex =
      normalizeSex(competitor.sexe);

    if (
      selectedSexes.length > 0 &&
      competitorSex &&
      !selectedSexes.includes(
        competitorSex
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

  function clearSelection() {
    setSelectedIds([]);
    setSuggestionInfo(null);
  }

  function getGroupSpread(group) {
    const ages = group
      .map(getAge)
      .filter(
        (value) =>
          value !== null
      );

    const weights = group
      .map(getWeight)
      .filter(
        (value) =>
          value !== null
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
          .map((competitor) =>
            normalizeSex(
              competitor.sexe
            )
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

  function groupHasSameCombatFamily(group) {
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

    if (!groupHasSameAgeClass(group)) {
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

    /*
      Chez les enfants, on favorise fortement
      la même tranche avant d'élargir.
    */
    const childBandPenalty =
      differentChildBand
        ? 2500
        : 0;

    /*
      Âge = critère principal.

      En Ju Randori :
      poids = critère important.

      Grade = critère secondaire.
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
            normalizeSex(
              competitor.sexe
            ) ===
              normalizeSex(
                startCompetitor.sexe
              ) &&
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

    if (startAge === null) {
      alert(
        "Impossible de proposer automatiquement un groupe : l'âge du compétiteur n'est pas renseigné."
      );

      return;
    }

    const isChild =
      startAge < 14;

    let result =
      buildSuggestedGroup(
        startCompetitor,
        isChild
      );

    let relaxedChildBand = false;

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
        normalizeSex(
          startCompetitor.sexe
        );

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

  /*
    ----------------------------------------------------
    GÉNÉRATEUR AUTOMATIQUE
    ----------------------------------------------------
  */

  function calculateIdealGroupSizes(count) {
    /*
      Objectif :
      - groupes de 4 autant que possible ;
      - éviter les restes de 1 ou 2 lorsque
        l'effectif permet des groupes de 3/4.

      Exemples :
      3  -> 3
      4  -> 4
      5  -> 3 + 2 (2 à vérifier)
      6  -> 3 + 3
      7  -> 4 + 3
      8  -> 4 + 4
      9  -> 3 + 3 + 3
      10 -> 4 + 3 + 3
      11 -> 4 + 4 + 3
      12 -> 4 + 4 + 4
    */

    if (count <= 0) {
      return [];
    }

    if (count <= 4) {
      return [count];
    }

    /*
      Recherche d'une combinaison uniquement
      composée de 3 et de 4.
    */
    for (
      let numberOfGroups =
        Math.ceil(count / TARGET_GROUP_SIZE);
      numberOfGroups <=
        Math.ceil(count / MIN_GROUP_SIZE);
      numberOfGroups += 1
    ) {
      if (
        count >=
          numberOfGroups *
            MIN_GROUP_SIZE &&
        count <=
          numberOfGroups *
            TARGET_GROUP_SIZE
      ) {
        const sizes =
          Array(numberOfGroups).fill(
            MIN_GROUP_SIZE
          );

        let remaining =
          count -
          numberOfGroups *
            MIN_GROUP_SIZE;

        let index = 0;

        while (remaining > 0) {
          sizes[index] += 1;
          remaining -= 1;
          index += 1;
        }

        /*
          Les 4 passent en premier.
        */
        return sizes.sort(
          (a, b) => b - a
        );
      }
    }

    /*
      Cas rares où aucune combinaison 3/4
      n'est possible.

      Exemple : 5 => 3 + 2.
    */
    const sizes = [];
    let remaining = count;

    while (
      remaining >=
      TARGET_GROUP_SIZE
    ) {
      sizes.push(
        TARGET_GROUP_SIZE
      );

      remaining -=
        TARGET_GROUP_SIZE;
    }

    if (remaining > 0) {
      sizes.push(remaining);
    }

    return sizes;
  }

  function getAutomaticSortScore(
    competitor
  ) {
    const age =
      getAge(competitor);

    const weight =
      getWeight(competitor);

    const grade =
      getGradeValue(
        competitor
      );

    /*
      Valeur utilisée uniquement pour
      ordonner les profils avant répartition.

      L'âge reste dominant.
    */
    return (
      (age ?? 999) * 100000 +
      (currentEvent.useWeight
        ? (weight ?? 999) * 100
        : 0) +
      (grade ?? 99)
    );
  }

  function sortForAutomaticGrouping(list) {
    return [...list].sort((a, b) => {
      const scoreA =
        getAutomaticSortScore(a);

      const scoreB =
        getAutomaticSortScore(b);

      if (scoreA !== scoreB) {
        return scoreA - scoreB;
      }

      return compareCompetitors(a, b);
    });
  }

  function splitBySizes(
    list,
    sizes
  ) {
    const groups = [];
    let cursor = 0;

    sizes.forEach((size) => {
      groups.push(
        list.slice(
          cursor,
          cursor + size
        )
      );

      cursor += size;
    });

    return groups;
  }

  function buildBalancedGroups(list) {
    const sorted =
      sortForAutomaticGrouping(
        list
      );

    const sizes =
      calculateIdealGroupSizes(
        sorted.length
      );

    return splitBySizes(
      sorted,
      sizes
    );
  }

  function getAutomaticGroupName(
    group,
    index,
    relaxedChildBand = false
  ) {
    const first = group[0];

    if (!first) {
      return `${currentEvent.shortLabel} — Groupe ${index + 1}`;
    }

    const age =
      getAge(first);

    const ageClass =
      getAgeClass(age) ||
      "Âge à vérifier";

    const sex =
      normalizeSex(first.sexe);

    let childBand = "";

    if (
      ageClass === "Enfant" &&
      !relaxedChildBand
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

      if (bands.length === 1) {
        childBand =
          ` ${bands[0]}`;
      }
    }

    return `${currentEvent.shortLabel} — ${ageClass}${childBand} — ${sex} — Groupe ${
      index + 1
    }`;
  }

  function makeAutomaticProposal(
    group,
    index,
    {
      relaxedChildBand = false,
    } = {}
  ) {
    const ages =
      group
        .map(getAge)
        .filter(
          (age) =>
            age !== null
        );

    const ageClass =
      ages.length > 0
        ? getAgeClass(
            ages[0]
          )
        : null;

    const spread =
      getGroupSpread(group);

    const status =
      group.length >=
      MIN_GROUP_SIZE
        ? "Prête à valider"
        : "À vérifier";

    const warnings = [];

    if (
      group.length <
      MIN_GROUP_SIZE
    ) {
      warnings.push(
        `Seulement ${group.length} compétiteur(s)`
      );
    }

    if (
      spread.hasCompleteAges &&
      spread.ageSpread >
        currentLimits.maxAgeSpread
    ) {
      warnings.push(
        `Écart d'âge ${spread.ageSpread} ans`
      );
    }

    if (
      currentLimits.maxWeightSpread !==
        null &&
      spread.hasCompleteWeights &&
      spread.weightSpread >
        currentLimits.maxWeightSpread
    ) {
      warnings.push(
        `Écart de poids ${spread.weightSpread} kg`
      );
    }

    if (relaxedChildBand) {
      warnings.push(
        "Tranches enfants rapprochées faute d'effectif"
      );
    }

    return {
      id: makeId(
        "proposal"
      ),

      nom:
        getAutomaticGroupName(
          group,
          index,
          relaxedChildBand
        ),

      epreuve:
        eventType,

      competitorIds:
        group.map(
          (competitor) =>
            competitor.id
        ),

      ageClass,

      sexe:
        group.length > 0
          ? normalizeSex(
              group[0].sexe
            )
          : null,

      count:
        group.length,

      statut:
        status,

      warnings,

      relaxedChildBand,

      ageSpread:
        spread.ageSpread,

      weightSpread:
        spread.weightSpread,
    };
  }

  function buildAutomaticGroupsForBucket(
    bucket
  ) {
    if (bucket.length === 0) {
      return [];
    }

    const firstAge =
      getAge(bucket[0]);

    const ageClass =
      getAgeClass(firstAge);

    /*
      Pour Junior / Senior / Vétéran :
      répartition directement par profils proches.
    */
    if (ageClass !== "Enfant") {
      return buildBalancedGroups(
        bucket
      ).map((group, index) =>
        makeAutomaticProposal(
          group,
          index
        )
      );
    }

    /*
      ENFANTS

      Premier objectif :
      rester dans 6–7 / 8–9 / 10–11 / 12–13.

      Mais Randori et Ju Randori ne doivent
      jamais être mélangés.
    */

    const combatBuckets = {};

    bucket.forEach((competitor) => {
      const age =
        getAge(competitor);

      const family =
        getCombatFamily(age) ||
        "unknown";

      if (!combatBuckets[family]) {
        combatBuckets[family] = [];
      }

      combatBuckets[family].push(
        competitor
      );
    });

    const proposals = [];

    Object.values(
      combatBuckets
    ).forEach(
      (combatBucket) => {
        const bandBuckets = {};

        combatBucket.forEach(
          (competitor) => {
            const band =
              getChildBand(
                getAge(competitor)
              ) ||
              "unknown";

            if (!bandBuckets[band]) {
              bandBuckets[band] = [];
            }

            bandBuckets[band].push(
              competitor
            );
          }
        );

        const completeBandGroups = [];
        const leftovers = [];

        Object.values(
          bandBuckets
        ).forEach(
          (bandBucket) => {
            const sorted =
              sortForAutomaticGrouping(
                bandBucket
              );

            /*
              Si la tranche contient au moins
              3 enfants, on essaie de la gérer
              seule.
            */
            if (
              sorted.length >=
              MIN_GROUP_SIZE
            ) {
              const sizes =
                calculateIdealGroupSizes(
                  sorted.length
                );

              const groups =
                splitBySizes(
                  sorted,
                  sizes
                );

              groups.forEach(
                (group) => {
                  if (
                    group.length >=
                    MIN_GROUP_SIZE
                  ) {
                    completeBandGroups.push(
                      group
                    );
                  } else {
                    leftovers.push(
                      ...group
                    );
                  }
                }
              );
            } else {
              leftovers.push(
                ...sorted
              );
            }
          }
        );

        completeBandGroups.forEach(
          (group) => {
            proposals.push(
              makeAutomaticProposal(
                group,
                proposals.length
              )
            );
          }
        );

        /*
          Les restants de plusieurs petites
          tranches peuvent être rapprochés.

          On reste :
          - Enfant
          - même sexe
          - même famille Randori/Ju Randori
        */
        if (
          leftovers.length > 0
        ) {
          const relaxedGroups =
            buildBalancedGroups(
              leftovers
            );

          relaxedGroups.forEach(
            (group) => {
              proposals.push(
                makeAutomaticProposal(
                  group,
                  proposals.length,
                  {
                    relaxedChildBand:
                      true,
                  }
                )
              );
            }
          );
        }
      }
    );

    return proposals;
  }

  function generateAutomaticGroups() {
    setSelectedIds([]);
    setCategoryName("");
    setSuggestionInfo(null);

    const usable =
      availableCompetitors.filter(
        (competitor) => {
          const age =
            getAge(competitor);

          if (age === null) {
            return false;
          }

          const ageClass =
            getAgeClass(age);

          if (!ageClass) {
            return false;
          }

          const sex =
            normalizeSex(
              competitor.sexe
            );

          if (
            sex !== "Homme" &&
            sex !== "Femme"
          ) {
            return false;
          }

          return true;
        }
      );

    if (usable.length === 0) {
      alert(
        "Aucun compétiteur disponible avec un âge et un sexe exploitables pour la génération automatique."
      );

      setAutomaticGroups([]);
      return;
    }

    /*
      Séparation absolue automatique :

      classe d'âge
      +
      sexe

      Un Junior n'est donc jamais mis avec
      un Senior ou un Vétéran.

      Homme et Femme restent séparés.
    */
    const buckets = {};

    usable.forEach(
      (competitor) => {
        const age =
          getAge(competitor);

        const ageClass =
          getAgeClass(age);

        const sex =
          normalizeSex(
            competitor.sexe
          );

        const key =
          `${ageClass}__${sex}`;

        if (!buckets[key]) {
          buckets[key] = [];
        }

        buckets[key].push(
          competitor
        );
      }
    );

    const proposals = [];

    Object.keys(buckets)
      .sort((keyA, keyB) => {
        const [
          classA,
          sexA,
        ] = keyA.split("__");

        const [
          classB,
          sexB,
        ] = keyB.split("__");

        const classDifference =
          (AGE_CLASS_ORDER[classA] ||
            99) -
          (AGE_CLASS_ORDER[classB] ||
            99);

        if (
          classDifference !== 0
        ) {
          return classDifference;
        }

        return sexA.localeCompare(
          sexB,
          "fr"
        );
      })
      .forEach((key) => {
        const bucket =
          buckets[key];

        const generated =
          buildAutomaticGroupsForBucket(
            bucket
          );

        proposals.push(
          ...generated
        );
      });

    /*
      Les participants non exploitables
      ne disparaissent pas.

      Ils restent dans la liste et pourront
      être traités manuellement.
    */
    setAutomaticGroups(
      proposals
    );

    if (
      proposals.length === 0
    ) {
      alert(
        "Aucun groupe automatique n'a pu être préparé."
      );
    }
  }

  function removeAutomaticGroup(
    proposalId
  ) {
    setAutomaticGroups(
      (current) =>
        current.filter(
          (proposal) =>
            !sameId(
              proposal.id,
              proposalId
            )
        )
    );
  }

  function editAutomaticGroupName(
    proposalId,
    value
  ) {
    setAutomaticGroups(
      (current) =>
        current.map(
          (proposal) =>
            sameId(
              proposal.id,
              proposalId
            )
              ? {
                  ...proposal,
                  nom: value,
                }
              : proposal
        )
    );
  }

  function validateAutomaticGroup(
    proposalId
  ) {
    const proposal =
      automaticGroups.find(
        (item) =>
          sameId(
            item.id,
            proposalId
          )
      );

    if (!proposal) {
      return;
    }

    const proposalCompetitors =
      proposal.competitorIds
        .map((id) =>
          getCompetitor(id)
        )
        .filter(Boolean);

    if (
      proposalCompetitors.length === 0
    ) {
      alert(
        "Cette proposition ne contient plus de compétiteur valide."
      );

      return;
    }

    /*
      Sécurité : classe d'âge identique.
    */
    if (
      !groupHasSameAgeClass(
        proposalCompetitors
      )
    ) {
      alert(
        "Validation impossible : cette proposition mélange plusieurs classes d'âge."
      );

      return;
    }

    /*
      Sécurité : sexe identique dans les
      propositions automatiques.
    */
    if (
      !groupHasSameSex(
        proposalCompetitors
      )
    ) {
      alert(
        "Validation impossible : une proposition automatique ne peut pas mélanger masculin et féminin."
      );

      return;
    }

    /*
      Sécurité Randori/Ju Randori.
    */
    if (
      (eventType === "randori" ||
        eventIsJuRandori()) &&
      !groupHasSameCombatFamily(
        proposalCompetitors
      )
    ) {
      alert(
        "Validation impossible : Randori et Ju Randori ne peuvent pas être mélangés."
      );

      return;
    }

    const conflict =
      proposal.competitorIds.some(
        (id) =>
          isAssignedToEvent(
            id,
            proposal.epreuve
          )
      );

    if (conflict) {
      alert(
        "Validation impossible : un compétiteur de cette proposition appartient déjà à une catégorie."
      );

      return;
    }

    if (
      proposal.competitorIds.length <
      MIN_GROUP_SIZE
    ) {
      const confirmed =
        window.confirm(
          `Cette proposition ne contient que ${proposal.competitorIds.length} compétiteur(s). Elle sera enregistrée comme « Regroupement à vérifier ». Continuer ?`
        );

      if (!confirmed) {
        return;
      }
    }

    const newCategory = {
      id: makeId(
        "category"
      ),

      nom:
        proposal.nom.trim() ||
        `${currentEvent.shortLabel} — ${proposal.ageClass || "Catégorie"}`,

      epreuve:
        proposal.epreuve,

      epreuveLabel:
        EVENT_DEFINITIONS[
          proposal.epreuve
        ]?.label ||
        proposal.epreuve,

      competitorIds: [
        ...proposal.competitorIds,
      ],

      statut:
        proposal.competitorIds
          .length >=
        MIN_GROUP_SIZE
          ? "Prête"
          : "Regroupement à vérifier",

      creationMode:
        "automatic-assistant",

      ageClass:
        proposal.ageClass,

      sexe:
        proposal.sexe,

      derogation:
        proposal.warnings.length > 0,
    };

    onUpdateCompetition({
      ...competition,

      categories: [
        ...categories,
        newCategory,
      ],
    });

    removeAutomaticGroup(
      proposalId
    );
  }

  function validateAllAutomaticGroups() {
    if (
      automaticGroups.length === 0
    ) {
      return;
    }

    /*
      On valide automatiquement uniquement
      les groupes d'au moins 3 compétiteurs.

      Les groupes de 1 ou 2 restent affichés
      pour décision de l'organisateur.
    */
    const readyGroups =
      automaticGroups.filter(
        (proposal) =>
          proposal.competitorIds
            .length >=
          MIN_GROUP_SIZE
      );

    const groupsToReview =
      automaticGroups.filter(
        (proposal) =>
          proposal.competitorIds
            .length <
          MIN_GROUP_SIZE
      );

    if (
      readyGroups.length === 0
    ) {
      alert(
        "Aucune proposition d'au moins 3 compétiteurs n'est prête à être validée."
      );

      return;
    }

    const confirmed =
      window.confirm(
        `Valider ${readyGroups.length} catégorie(s) prête(s) ?${
          groupsToReview.length > 0
            ? `\n\n${groupsToReview.length} proposition(s) de moins de 3 compétiteurs resteront à vérifier.`
            : ""
        }`
      );

    if (!confirmed) {
      return;
    }

    const alreadyAssigned = new Set();

    categories
      .filter(
        (category) =>
          category.epreuve ===
          eventType
      )
      .forEach((category) => {
        (
          category.competitorIds ||
          []
        ).forEach((id) =>
          alreadyAssigned.add(
            String(id)
          )
        );
      });

    const newCategories = [];

    readyGroups.forEach(
      (proposal) => {
        const hasConflict =
          proposal.competitorIds.some(
            (id) =>
              alreadyAssigned.has(
                String(id)
              )
          );

        if (hasConflict) {
          return;
        }

        const proposalCompetitors =
          proposal.competitorIds
            .map((id) =>
              getCompetitor(id)
            )
            .filter(Boolean);

        if (
          !groupHasSameAgeClass(
            proposalCompetitors
          ) ||
          !groupHasSameSex(
            proposalCompetitors
          )
        ) {
          return;
        }

        const newCategory = {
          id: makeId(
            "category"
          ),

          nom:
            proposal.nom.trim() ||
            `${currentEvent.shortLabel} — ${proposal.ageClass || "Catégorie"}`,

          epreuve:
            proposal.epreuve,

          epreuveLabel:
            EVENT_DEFINITIONS[
              proposal.epreuve
            ]?.label ||
            proposal.epreuve,

          competitorIds: [
            ...proposal.competitorIds,
          ],

          statut:
            "Prête",

          creationMode:
            "automatic-assistant",

          ageClass:
            proposal.ageClass,

          sexe:
            proposal.sexe,

          derogation:
            proposal.warnings.length > 0,
        };

        newCategories.push(
          newCategory
        );

        proposal.competitorIds.forEach(
          (id) =>
            alreadyAssigned.add(
              String(id)
            )
        );
      }
    );

    if (
      newCategories.length === 0
    ) {
      alert(
        "Aucune catégorie n'a pu être validée."
      );

      return;
    }

    onUpdateCompetition({
      ...competition,

      categories: [
        ...categories,
        ...newCategories,
      ],
    });

    const validatedProposalIds =
      new Set(
        readyGroups.map(
          (proposal) =>
            String(
              proposal.id
            )
        )
      );

    setAutomaticGroups(
      groupsToReview.filter(
        (proposal) =>
          !validatedProposalIds.has(
            String(
              proposal.id
            )
          )
      )
    );
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
        "Un ou plusieurs compétiteurs sélectionnés ne sont pas admissibles dans cette épreuve."
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
      currentLimits.maxWeightSpread !== null &&
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

    const sexes = [
      ...new Set(
        selectedCompetitors
          .map((competitor) =>
            normalizeSex(
              competitor.sexe
            )
          )
          .filter(Boolean)
      ),
    ];

    const newCategory = {
      id: makeId(
        "category"
      ),

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

      sexe:
        sexes.length === 1
          ? sexes[0]
          : "Mixte",

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
          .map((competitor) =>
            normalizeSex(
              competitor.sexe
            )
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

  /*
    Permet de signaler combien de personnes
    n'ont pas pu être utilisées automatiquement.
  */
  const automaticEligibleCount =
    availableCompetitors.filter(
      (competitor) => {
        const age =
          getAge(competitor);

        const sex =
          normalizeSex(
            competitor.sexe
          );

        return (
          age !== null &&
          (sex === "Homme" ||
            sex === "Femme")
        );
      }
    ).length;

  const automaticExcludedCount =
    availableCompetitors.length -
    automaticEligibleCount;

  return (
    <div className="categories-manager">
      <div className="manager-header">
        <div>
          <p className="surtitle">
            BÊTA 0.4
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
          défaut. Les classes d'âge sont : Enfant
          moins de 14 ans, Junior de 14 à 17 ans,
          Senior de 18 à 39 ans et Vétéran à partir
          de 40 ans. Les classes d'âge ne sont
          jamais mélangées automatiquement. Chez les
          enfants, l'assistant privilégie les
          tranches 6–7, 8–9, 10–11 et 12–13 ans,
          puis rapproche les tranches compatibles si
          l'effectif est insuffisant. Moins de
          10 ans : Randori. À partir de 10 ans :
          Ju Randori. Objectif : groupes de 4,
          minimum 3. L'assistant évite autant que
          possible les restes de 1 ou 2.
        </p>
      </div>

      <div className="competition-form">
        <h3>
          Préparer les catégories
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
                setAutomaticGroups([]);
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
            Nom de la catégorie manuelle

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
              ? "Les compétiteurs de 10 ans et plus sont admissibles. Junior, Senior et Vétéran restent obligatoirement dans des catégories distinctes."
              : "L'assistant sépare d'abord les classes d'âge et les sexes, puis recherche les regroupements les plus cohérents."}
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

            {automaticExcludedCount > 0 && (
              <p>
                {automaticExcludedCount} compétiteur
                {automaticExcludedCount > 1
                  ? "s"
                  : ""}{" "}
                sans âge ou sexe exploitable seront
                laissé
                {automaticExcludedCount > 1
                  ? "s"
                  : ""}{" "}
                au contrôle manuel.
              </p>
            )}
          </div>

          {eligibleCompetitors.length > 0 && (
            <div className="competition-actions">
              <button
                className="primary"
                type="button"
                onClick={
                  generateAutomaticGroups
                }
                disabled={
                  automaticEligibleCount ===
                  0
                }
              >
                Créer les groupes automatiquement
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

        {automaticGroups.length > 0 && (
          <section className="category-section">
            <div className="category-section-header">
              <div>
                <p className="surtitle">
                  ASSISTANT
                </p>

                <h3>
                  Propositions automatiques
                </h3>

                <p>
                  {automaticGroups.length} groupe
                  {automaticGroups.length > 1
                    ? "s"
                    : ""}{" "}
                  préparé
                  {automaticGroups.length > 1
                    ? "s"
                    : ""}
                  . Vérifie les propositions avant
                  validation.
                </p>
              </div>

              <div className="competition-actions">
                <button
                  className="primary"
                  type="button"
                  onClick={
                    validateAllAutomaticGroups
                  }
                >
                  Valider tous les groupes prêts
                </button>

                <button
                  className="delete-button"
                  type="button"
                  onClick={() =>
                    setAutomaticGroups([])
                  }
                >
                  Annuler les propositions
                </button>
              </div>
            </div>

            <div className="competition-list">
              {automaticGroups.map(
                (proposal) => (
                  <article
                    className="competition"
                    key={
                      proposal.id
                    }
                  >
                    <div>
                      <p className="surtitle">
                        {proposal.ageClass ||
                          "À vérifier"}
                        {" · "}
                        {proposal.sexe ||
                          "Sexe à vérifier"}
                      </p>

                      <input
                        value={
                          proposal.nom
                        }
                        onChange={(event) =>
                          editAutomaticGroupName(
                            proposal.id,
                            event.target.value
                          )
                        }
                      />

                      <p>
                        <strong>
                          {proposal.count} compétiteur
                          {proposal.count > 1
                            ? "s"
                            : ""}
                        </strong>
                        {" · "}
                        {proposal.statut}
                      </p>

                      <p>
                        Écart d'âge :{" "}
                        {proposal.ageSpread} an(s)

                        {currentEvent.useWeight
                          ? ` · Écart de poids : ${proposal.weightSpread} kg`
                          : ""}
                      </p>

                      {proposal.warnings.length > 0 && (
                        <div className="beta-note">
                          <strong>
                            Contrôle recommandé
                          </strong>

                          {proposal.warnings.map(
                            (warning) => (
                              <p
                                key={
                                  warning
                                }
                              >
                                {warning}
                              </p>
                            )
                          )}
                        </div>
                      )}

                      <div className="competitor-events">
                        {proposal.competitorIds.map(
                          (id) => {
                            const competitor =
                              getCompetitor(
                                id
                              );

                            if (!competitor) {
                              return null;
                            }

                            const age =
                              getAge(
                                competitor
                              );

                            const weight =
                              getWeight(
                                competitor
                              );

                            return (
                              <span
                                key={
                                  id
                                }
                              >
                                {competitor.nom}{" "}
                                {competitor.prenom}
                                {age !== null
                                  ? ` · ${age} ans`
                                  : ""}
                                {currentEvent.useWeight &&
                                weight !== null
                                  ? ` · ${weight} kg`
                                  : ""}
                                {competitor.grade
                                  ? ` · ${competitor.grade}`
                                  : ""}
                              </span>
                            );
                          }
                        )}
                      </div>
                    </div>

                    <div className="competition-actions">
                      <button
                        className="primary"
                        type="button"
                        onClick={() =>
                          validateAutomaticGroup(
                            proposal.id
                          )
                        }
                      >
                        Valider ce groupe
                      </button>

                      <button
                        className="delete-button"
                        type="button"
                        onClick={() =>
                          removeAutomaticGroup(
                            proposal.id
                          )
                        }
                      >
                        Retirer
                      </button>
                    </div>
                  </article>
                )
              )}
            </div>
          </section>
        )}

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
                        {competitor.prenom}
                      </h4>

                      <p>
                        {competitor.club ||
                          "Club non renseigné"}
                      </p>
                    </div>

                    <div className="category-data">
                      <span>
                        {normalizeSex(
                          competitor.sexe
                        )}
                      </span>

                      <span>
                        {age !== null
                          ? `${age} ans`
                          : "Âge non renseigné"}
                      </span>

                      <span>
                        {age !== null
                          ? getAgeClass(
                              age
                            )
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
              Proposition individuelle
            </strong>

            {suggestionInfo.ideal ? (
              <p>
                Groupe idéal de 4 compétiteurs
                proposé.
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
                contrôlé.
              </p>
            )}

            {suggestionInfo.relaxedChildBand && (
              <p>
                Effectif insuffisant dans la tranche
                enfant initiale : des âges voisins
                ont été recherchés.
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
          onClick={
            createCategory
          }
          disabled={
            selectedIds.length ===
            0
          }
        >
          Valider et créer la catégorie manuelle (
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

        {eventCategories.length === 0 ? (
          <div className="empty-state">
            <span className="empty-number">
              0
            </span>

            <h3>
              Aucune catégorie pour cette épreuve
            </h3>

            <p>
              Utilise le générateur automatique ou
              prépare une catégorie manuellement.
            </p>
          </div>
        ) : (
          <div className="competition-list">
            {eventCategories.map(
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

                      {category.sexe
                        ? ` · ${category.sexe}`
                        : ""}

                      {category.derogation
                        ? " · À contrôler"
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
                            <span
                              key={
                                id
                              }
                            >
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
