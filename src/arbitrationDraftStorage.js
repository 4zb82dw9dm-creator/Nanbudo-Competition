export const ARBITRATION_DRAFT_VERSION = 2;
const STORAGE_PREFIX = `nanbudo-arbitration-draft:v${ARBITRATION_DRAFT_VERSION}`;
const stablePart = (value) => encodeURIComponent(String(value ?? ""));

export function arbitrationDraftKey(identity) {
  return [STORAGE_PREFIX, `competition=${stablePart(identity.competitionId)}`, `discipline=${stablePart(identity.discipline)}`, `pool=${stablePart(identity.poolId)}`, `passage=${stablePart(identity.id)}`, `tatami=${stablePart(identity.tatami || "none")}`].join(":");
}

export function arbitrationSheetKey(identity) {
  return ["competition", stablePart(identity?.competitionId), "pool", stablePart(identity?.poolId), "match", stablePart(identity?.id)].join(":");
}

export function hasDraftIdentity(identity) {
  return Boolean(identity?.competitionId && identity?.discipline && identity?.poolId && identity?.id);
}

function hasMeaningfulDraftPayload(payload) {
  if (!payload || typeof payload !== "object") return false;
  return Object.values(payload).some((value) => {
    if (Array.isArray(value)) return value.some((item) => {
      if (item && typeof item === "object" && Array.isArray(item.votes)) {
        return item.votes.some((vote) => vote !== "" && vote !== null && vote !== undefined && vote !== false && vote !== 0);
      }
      if (item && typeof item === "object") return true;
      return item !== "" && item !== null && item !== undefined && item !== false && item !== 0;
    });
    if (value && typeof value === "object") return hasMeaningfulDraftPayload(value);
    return value !== "" && value !== null && value !== undefined && value !== false && value !== 0;
  });
}

export function loadArbitrationDraft(storage, identity) {
  if (!hasDraftIdentity(identity) || identity.statut === "Terminé") return null;
  try {
    const draft = JSON.parse(storage.getItem(arbitrationDraftKey(identity)));
    if (draft?.version !== ARBITRATION_DRAFT_VERSION || !draft.payload) return null;
    if (!hasMeaningfulDraftPayload(draft.payload)) {
      storage.removeItem(arbitrationDraftKey(identity));
      return null;
    }
    return draft;
  } catch { return null; }
}

export function saveArbitrationDraft(storage, identity, payload, savedAt = new Date().toISOString()) {
  if (!hasDraftIdentity(identity) || identity.statut === "Terminé" || !hasMeaningfulDraftPayload(payload)) return false;
  storage.setItem(arbitrationDraftKey(identity), JSON.stringify({ version: ARBITRATION_DRAFT_VERSION, savedAt, payload }));
  return true;
}

export function deleteArbitrationDraft(storage, identity) {
  if (hasDraftIdentity(identity)) storage.removeItem(arbitrationDraftKey(identity));
}
