export const COMPETITIONS_STORAGE_KEY = "nanbudo_competitions";
export const BACKUP_FORMAT_TYPE = "nanbudo-competition-backup";
export const BACKUP_FORMAT_VERSION = 1;

export const BACKUP_KINDS = {
  singleCompetition: "single-competition",
  allCompetitions: "all-competitions",
};

export function buildBackup(kind, data) {
  return {
    type: BACKUP_FORMAT_TYPE,
    version: BACKUP_FORMAT_VERSION,
    kind,
    createdAt: new Date().toISOString(),
    app: "Nanbudo Competition",
    data,
  };
}

export function downloadJsonFile(content, filename) {
  const blob = new Blob([JSON.stringify(content, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function createBackupFilename(scope, competition) {
  const parts = ["nanbudo-competition", "sauvegarde"];

  if (competition?.nom) {
    parts.push(competition.nom);
  } else {
    parts.push(scope);
  }

  if (competition?.date) {
    parts.push(competition.date);
  }

  parts.push(new Date().toISOString().slice(0, 10));

  const safeName = parts
    .join("-")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  return `${safeName}.json`;
}

export function validateBackupEnvelope(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Le fichier ne contient pas une sauvegarde JSON valide.");
  }

  if (value.type !== BACKUP_FORMAT_TYPE) {
    throw new Error("Ce fichier n'est pas une sauvegarde Nanbudo Competition.");
  }

  if (value.version !== BACKUP_FORMAT_VERSION) {
    throw new Error(
      `Version de sauvegarde non prise en charge : ${value.version || "inconnue"}.`
    );
  }

  if (!Object.values(BACKUP_KINDS).includes(value.kind)) {
    throw new Error("Type de sauvegarde Nanbudo Competition inconnu.");
  }

  if (!value.data) {
    throw new Error("La sauvegarde ne contient aucune donnée à restaurer.");
  }

  return value;
}

export function validateCompetition(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("La compétition sauvegardée est invalide.");
  }

  if (value.id === undefined || value.id === null || value.id === "") {
    throw new Error("La compétition sauvegardée n'a pas d'identifiant.");
  }

  if (typeof value.nom !== "string" || value.nom.trim() === "") {
    throw new Error("La compétition sauvegardée n'a pas de nom.");
  }

  if (!Array.isArray(value.competitors)) {
    throw new Error("La liste des compétiteurs est absente ou invalide.");
  }

  if (!Array.isArray(value.categories)) {
    throw new Error("La liste des catégories est absente ou invalide.");
  }

  return value;
}

export function parseBackupFileContent(content) {
  let parsed;

  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("Le fichier sélectionné n'est pas un JSON valide.");
  }

  const backup = validateBackupEnvelope(parsed);

  if (backup.kind === BACKUP_KINDS.singleCompetition) {
    validateCompetition(backup.data.competition);
  }

  if (backup.kind === BACKUP_KINDS.allCompetitions) {
    if (!Array.isArray(backup.data.competitions)) {
      throw new Error("La sauvegarde complète ne contient pas de liste de compétitions.");
    }

    backup.data.competitions.forEach(validateCompetition);
  }

  return backup;
}

export function cloneForStorage(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createCompetitionCopy(competition) {
  return {
    ...cloneForStorage(competition),
    id: Date.now(),
    nom: `${competition.nom} (restaurée)`,
    restoredFromId: competition.id,
    restoredAt: new Date().toISOString(),
  };
}
