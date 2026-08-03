export const DOCUMENT_TYPES = {
  OFFICIAL_PLANNING: "official-planning",
};

export const DOCUMENT_REGISTRY = {
  [DOCUMENT_TYPES.OFFICIAL_PLANNING]: {
    type: DOCUMENT_TYPES.OFFICIAL_PLANNING,
    title: "Planning officiel de la compétition",
    emptyMessage: "Aucun planning généré pour cette compétition.",
    isPrimary: true,
    canPrint: true,
  },
};

export function getDocumentDefinition(type) {
  return DOCUMENT_REGISTRY[type] || {
    type,
    title: "Document de compétition",
    emptyMessage: "Aucun document généré pour cette compétition.",
    isPrimary: false,
    canPrint: false,
  };
}

export function normalizeCompetitionDocument(document = {}, competition = {}) {
  const definition = getDocumentDefinition(document.type);
  return {
    ...document,
    competitionId: document.competitionId || competition.id || null,
    title: document.title || definition.title,
    printable: document.printable ?? definition.canPrint,
  };
}

export function getCompetitionDocuments(competition = {}) {
  return (competition.documents || []).map((document) => normalizeCompetitionDocument(document, competition));
}

export function getOfficialPlanningDocument(competition = {}) {
  return getCompetitionDocuments(competition).find((document) => document.type === DOCUMENT_TYPES.OFFICIAL_PLANNING) || null;
}

export function buildDocumentCardMeta(document) {
  const definition = getDocumentDefinition(document.type);
  return {
    title: document.title || definition.title,
    description: document.description || (document.printable ? "Consultable et imprimable" : "Consultable"),
    generatedAt: document.generatedAt || null,
  };
}

export function escapeDocumentHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
