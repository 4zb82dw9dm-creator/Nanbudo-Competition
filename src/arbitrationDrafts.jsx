import { useEffect, useState } from "react";

const STORAGE_PREFIX = "nanbudo-arbitration-draft:v1";
const draftKey = (match) => [STORAGE_PREFIX, match.competitionId, match.discipline, match.poolId, match.id, match.tatami || "none"].map(encodeURIComponent).join(":");

function readDraft(match) {
  if (match.statut === "Terminé") return null;
  try {
    const draft = JSON.parse(localStorage.getItem(draftKey(match)));
    return draft?.version === 1 && draft.payload ? draft : null;
  } catch { return null; }
}

function removeDraft(match) {
  try { localStorage.removeItem(draftKey(match)); }
  catch (error) { console.error("Suppression de la sauvegarde locale impossible", error); }
}

export function useArbitrationDraft(match, payload, restore) {
  const [pendingDraft, setPendingDraft] = useState(() => readDraft(match));
  const [editingEnabled, setEditingEnabled] = useState(() => !readDraft(match));
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!editingEnabled || !dirty || match.statut === "Terminé") return;
    try { localStorage.setItem(draftKey(match), JSON.stringify({ version: 1, savedAt: new Date().toISOString(), payload })); }
    catch (error) { console.error("Sauvegarde locale de la feuille d’arbitrage impossible", error); }
  }, [dirty, editingEnabled, match, payload]);

  function resume() { restore(pendingDraft.payload); setPendingDraft(null); setEditingEnabled(true); setDirty(true); }
  function abandon() { removeDraft(match); setPendingDraft(null); setEditingEnabled(true); setDirty(false); }
  async function finalize(save) {
    const saved = await save();
    if (saved === true) { removeDraft(match); setDirty(false); }
    return saved;
  }
  return { pendingDraft, editingEnabled, markChanged: () => setDirty(true), resume, abandon, finalize };
}

export function DraftRecoveryNotice({ draft, onResume, onAbandon }) {
  if (!draft) return null;
  return <div className="draft-recovery" role="alert"><strong>Saisie de secours disponible</strong><p>Une saisie non finalisée a été sauvegardée sur cet appareil le {new Date(draft.savedAt).toLocaleString("fr-FR")}. Elle ne sera jamais envoyée automatiquement.</p><div><button className="primary" type="button" onClick={onResume}>Reprendre la saisie</button><button type="button" onClick={onAbandon}>Abandonner la sauvegarde</button></div></div>;
}
