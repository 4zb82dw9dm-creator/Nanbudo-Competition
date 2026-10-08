import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { arbitrationDraftKey, deleteArbitrationDraft, hasDraftIdentity, loadArbitrationDraft, saveArbitrationDraft } from "./arbitrationDraftStorage";

// Keep an active scoring session uninterrupted by component remounts.
// A full page reload clears this set and still offers explicit draft recovery.
const activeDraftSessions = new Set();

export function useArbitrationDraft(match, payload, restore) {
  const identityKey = useMemo(() => hasDraftIdentity(match) ? arbitrationDraftKey(match) : "", [match.competitionId, match.discipline, match.poolId, match.id, match.tatami]);
  const [pendingDraft, setPendingDraft] = useState(null);
  const [editingEnabled, setEditingEnabled] = useState(false);
  const [dirty, setDirty] = useState(false);
  const payloadRef = useRef(payload);

  function writeNow(nextPayload) {
    if (!editingEnabled || !hasDraftIdentity(match) || match.statut === "Terminé") return;
    try { saveArbitrationDraft(localStorage, match, nextPayload); }
    catch (error) { console.error("Sauvegarde locale de la feuille d’arbitrage impossible", error); }
  }

  useEffect(() => {
    if (!identityKey) return;
    const saved = loadArbitrationDraft(localStorage, match);
    const isPristineDuplicate = saved?.payload && JSON.stringify(saved.payload) === JSON.stringify(payloadRef.current);
    if (isPristineDuplicate) {
      deleteArbitrationDraft(localStorage, match);
      setPendingDraft(null);
      setEditingEnabled(true);
      setDirty(false);
      return;
    }
    if (saved && activeDraftSessions.has(identityKey)) {
      restore(saved.payload);
      setPendingDraft(null);
      setEditingEnabled(true);
      setDirty(true);
      return;
    }
    setPendingDraft(saved);
    setEditingEnabled(!saved);
    if (!saved) activeDraftSessions.add(identityKey);
    setDirty(false);
  }, [identityKey, match.statut]);

  useLayoutEffect(() => {
    payloadRef.current = payload;
    if (dirty) writeNow(payload);
  }, [payload, dirty, editingEnabled, identityKey]);

  useEffect(() => {
    function flush() { if (dirty) writeNow(payloadRef.current); }
    function flushWhenHidden() { if (document.visibilityState === "hidden") flush(); }
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", flushWhenHidden);
    return () => { window.removeEventListener("pagehide", flush); document.removeEventListener("visibilitychange", flushWhenHidden); };
  }, [dirty, editingEnabled, identityKey]);

  function resume() { activeDraftSessions.add(identityKey); restore(pendingDraft.payload); setPendingDraft(null); setEditingEnabled(true); setDirty(true); }
  function abandon() { activeDraftSessions.add(identityKey); deleteArbitrationDraft(localStorage, match); setPendingDraft(null); setEditingEnabled(true); setDirty(false); }
  async function finalize(save) {
    const saved = await save();
    if (saved === true) { deleteArbitrationDraft(localStorage, match); activeDraftSessions.delete(identityKey); setDirty(false); }
    return saved;
  }

  return { pendingDraft, editingEnabled, saveNow: (nextPayload) => { setDirty(true); writeNow(nextPayload); }, markChanged: () => setDirty(true), resume, abandon, finalize };
}

export function DraftRecoveryNotice({ draft, onResume, onAbandon }) {
  if (!draft) return null;
  return <div className="draft-recovery" role="alert"><strong>Saisie de secours disponible</strong><p>Une saisie non finalisée a été sauvegardée sur cet appareil le {new Date(draft.savedAt).toLocaleString("fr-FR")}. Elle ne sera jamais envoyée automatiquement.</p><div><button className="primary" type="button" onClick={onResume}>Reprendre la saisie</button><button type="button" onClick={onAbandon}>Abandonner la sauvegarde</button></div></div>;
}
