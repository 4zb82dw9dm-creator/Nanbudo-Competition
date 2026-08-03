export const COMPETITORS_STORAGE_KEY = "nanbudo-competitors-afdp-v1";
export const COMPETITORS_CHANGED_EVENT = "nanbudo-competitors-changed";

export function readCompetitorsFromStorage(fallback = []) {
  try {
    const stored = JSON.parse(localStorage.getItem(COMPETITORS_STORAGE_KEY) || "null");
    return Array.isArray(stored) ? stored : fallback;
  } catch {
    return fallback;
  }
}

export function writeCompetitorsToStorage(competitors) {
  localStorage.setItem(COMPETITORS_STORAGE_KEY, JSON.stringify(competitors));
  window.dispatchEvent(new Event(COMPETITORS_CHANGED_EVENT));
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeLicence(value) {
  return normalizeText(value).replace(/\s+/g, "");
}

function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

export function findCompetitorIndex(competitors, data) {
  const licence = normalizeLicence(data.numeroLicence || data.licence);

  if (licence) {
    const byLicence = competitors.findIndex(
      (competitor) => normalizeLicence(competitor.numeroLicence || competitor.licence) === licence,
    );

    if (byLicence >= 0) {
      return byLicence;
    }
  }

  const nom = normalizeText(data.nom);
  const prenom = normalizeText(data.prenom);
  const dateNaissance = normalizeText(data.dateNaissance);

  if (!nom || !prenom || !dateNaissance) {
    return -1;
  }

  return competitors.findIndex(
    (competitor) =>
      normalizeText(competitor.nom) === nom &&
      normalizeText(competitor.prenom) === prenom &&
      normalizeText(competitor.dateNaissance) === dateNaissance,
  );
}

export function mapRegistrationToCompetitor(registration) {
  return {
    nom: registration.nom,
    prenom: registration.prenom,
    sexe: registration.sexe,
    dateNaissance: registration.dateNaissance,
    club: registration.club,
    region: registration.region || "",
    numeroLicence: registration.numeroLicence || registration.licence || "",
    grade: registration.grade,
    poids: registration.poids,
    categoriePoids: registration.categoriePoids || registration.poids || "",
    coach: registration.coach || "",
    telephone: registration.telephone,
    email: registration.email,
    certificatMedical: registration.certificatMedical || "Non",
    autorisationParentale: registration.autorisationParentale || "Non",
  };
}

export function upsertCompetitorFromRegistration(registration) {
  const competitors = readCompetitorsFromStorage([]);
  const now = new Date().toISOString();
  const incoming = mapRegistrationToCompetitor(registration);
  const existingIndex = findCompetitorIndex(competitors, incoming);

  if (existingIndex >= 0) {
    const existing = competitors[existingIndex];
    const updated = { ...existing, updatedAt: now };

    Object.entries(incoming).forEach(([key, value]) => {
      if (hasValue(value) && existing[key] !== value) {
        updated[key] = value;
      }
    });

    const nextCompetitors = competitors.map((competitor, index) =>
      index === existingIndex ? updated : competitor,
    );
    writeCompetitorsToStorage(nextCompetitors);
    return updated;
  }

  const created = {
    id: `competiteur-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    ...incoming,
    source: "inscription-publique",
    createdAt: now,
    updatedAt: now,
  };
  writeCompetitorsToStorage([...competitors, created]);
  return created;
}
