export const ARBITRATION_DRAFT_VERSION = 2;
const STORAGE_PREFIX = `nanbudo-arbitration-draft:v${ARBITRATION_DRAFT_VERSION}`;
const stablePart = (value) => encodeURIComponent(String(value ?? ""));

export function arbitrationDraftKey(identity) {
  return [STORAGE_PREFIX, `competition=${stablePart(identity.competitionId)}`, `discipline=${stablePart(identity.discipline)}`, `pool=${stablePart(identity.poolId)}`, `passage=${stablePart(identity.id)}`, `tatami=${stablePart(identity.tatami || "none")}`].join(":");
}

export function hasDraftIdentity(identity) {
  return Boolean(identity?.competitionId && identity?.discipline && identity?.poolId && identity?.id);
}

export function loadArbitrationDraft(storage, identity) {
  if (!hasDraftIdentity(identity) || identity.statut === "Terminé") return null;
  try {
    const draft = JSON.parse(storage.getItem(arbitrationDraftKey(identity)));
    return draft?.version === ARBITRATION_DRAFT_VERSION && draft.payload ? draft : null;
  } catch { return null; }
}

export function saveArbitrationDraft(storage, identity, payload, savedAt = new Date().toISOString()) {
  if (!hasDraftIdentity(identity) || identity.statut === "Terminé") return false;
  storage.setItem(arbitrationDraftKey(identity), JSON.stringify({ version: ARBITRATION_DRAFT_VERSION, savedAt, payload }));
  return true;
}

export function deleteArbitrationDraft(storage, identity) {
  if (hasDraftIdentity(identity)) storage.removeItem(arbitrationDraftKey(identity));
}
