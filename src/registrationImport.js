import { KATA0_RANDORI0_RULE, sanitizeRestrictedEventsForCompetitor } from "./competitorRules.js";
const EVENT_KEYS = [
  "kata0",
  "kata1",
  "kata2",
  "randori",
  "juRandori1",
  "juRandori2",
];

function normalizeText(value) {
  return String(value || "").trim().toLocaleLowerCase("fr");
}

function calculateAge(dateNaissance, referenceDate = new Date()) {
  if (!dateNaissance) return "";
  const birth = new Date(`${dateNaissance}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return "";

  let age = referenceDate.getFullYear() - birth.getFullYear();
  const monthDifference = referenceDate.getMonth() - birth.getMonth();
  if (
    monthDifference < 0 ||
    (monthDifference === 0 && referenceDate.getDate() < birth.getDate())
  ) {
    age -= 1;
  }
  return age;
}

function normalizeSex(value) {
  const sex = normalizeText(value);
  if (["f", "femme", "féminin", "feminin"].includes(sex)) return "Femme";
  if (["m", "h", "homme", "masculin"].includes(sex)) return "Homme";
  return String(value || "").trim() || "Homme";
}

function normalizeEvents(value) {
  if (Array.isArray(value)) {
    return Object.fromEntries(EVENT_KEYS.map((key) => [key, value.includes(key)]));
  }

  const source = value && typeof value === "object" ? value : {};
  return Object.fromEntries(EVENT_KEYS.map((key) => [key, source[key] === true]));
}

function sameCompetitor(a, b) {
  if (normalizeText(a.nom) !== normalizeText(b.nom)) return false;
  if (normalizeText(a.prenom) !== normalizeText(b.prenom)) return false;
  if (a.dateNaissance && b.dateNaissance) return a.dateNaissance === b.dateNaissance;
  return true;
}

export function parseRegistrationExport(text, existingCompetitors = []) {
  let payload;
  try {
    payload = JSON.parse(String(text || ""));
  } catch {
    throw new Error("Le fichier n'est pas un JSON valide.");
  }

  if (
    !payload ||
    payload.format !== "nanbudo-competition-inscriptions" ||
    Number(payload.version) !== 2 ||
    !Array.isArray(payload.competitors)
  ) {
    throw new Error("Ce fichier n'est pas un export d'inscriptions Nanbudo Competition compatible.");
  }

  const imported = [];
  const rejected = [];
  const now = Date.now();

  payload.competitors.forEach((registration, index) => {
    const line = index + 1;
    const nom = String(registration?.nom || "").trim();
    const prenom = String(registration?.prenom || "").trim();
    const club = String(registration?.club || "").trim();
    const dateNaissance = String(registration?.dateNaissance || "").trim();
    const rawEpreuves = normalizeEvents(registration?.epreuves);
    const epreuves = sanitizeRestrictedEventsForCompetitor(
      {
        dateNaissance,
        age: calculateAge(dateNaissance),
        grade: String(registration?.grade || "").trim(),
        epreuves: rawEpreuves,
      },
    ).epreuves;
    const selectedEvents = EVENT_KEYS.filter((key) => epreuves[key]);

    if (!nom || !prenom) {
      rejected.push(`Inscription ${line} : nom ou prénom manquant.`);
      return;
    }

    if (selectedEvents.length === 0) {
      rejected.push(`Inscription ${line} : aucune épreuve sélectionnée pour ${nom} ${prenom}. ${KATA0_RANDORI0_RULE.rejectionMessage}`);
      return;
    }

    const kataCount = [epreuves.kata0, epreuves.kata1, epreuves.kata2].filter(Boolean).length;
    const combatCount = [epreuves.randori, epreuves.juRandori1, epreuves.juRandori2].filter(Boolean).length;
    if (kataCount > 1 || combatCount > 1) {
      rejected.push(`Inscription ${line} : épreuves incompatibles pour ${nom} ${prenom}.`);
      return;
    }

    const poids = registration?.poids === "" || registration?.poids == null
      ? ""
      : Number(String(registration.poids).replace(",", "."));
    if (poids !== "" && (!Number.isFinite(poids) || poids <= 0)) {
      rejected.push(`Inscription ${line} : poids invalide pour ${nom} ${prenom}.`);
      return;
    }

    const candidate = { nom, prenom, dateNaissance };
    if (existingCompetitors.some((item) => sameCompetitor(item, candidate)) || imported.some((item) => sameCompetitor(item, candidate))) {
      rejected.push(`Inscription ${line} : doublon détecté pour ${nom} ${prenom}.`);
      return;
    }

    imported.push({
      id: `registration-${now}-${index}`,
      registrationId: registration.id || null,
      licence: String(registration?.licence || "").trim(),
      email: String(registration?.email || "").trim(),
      telephone: String(registration?.telephone || "").trim(),
      nom: nom.toUpperCase(),
      prenom,
      club,
      sexe: normalizeSex(registration?.sexe),
      dateNaissance,
      age: calculateAge(dateNaissance),
      poids,
      grade: String(registration?.grade || "").trim(),
      epreuves,
      imported: true,
      importSource: "inscriptions-v2",
    });
  });

  return {
    competitors: imported,
    rejected,
    sourceCount: payload.competitors.length,
    exportedAt: payload.exportedAt || null,
  };
}
