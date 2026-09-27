import { saveMatchResult } from "./supabase";

const QUEUE_KEY = "nanbudo-pending-match-results:v1";
export const OFFLINE_QUEUE_CHANGED_EVENT = "nanbudo:offline-queue-changed";

function readQueue() {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]"); } catch { return []; }
}

function writeQueue(items) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(OFFLINE_QUEUE_CHANGED_EVENT, { detail: { count: items.length } }));
}

export function pendingMatchResultCount() { return readQueue().length; }

export function queueMatchResult(competitionId, poolId, match) {
  const item = { competitionId: String(competitionId), poolId: String(poolId), match, queuedAt: new Date().toISOString() };
  const key = `${item.competitionId}::${item.poolId}::${String(match.id)}`;
  const items = readQueue().filter((entry) => `${entry.competitionId}::${entry.poolId}::${String(entry.match?.id)}` !== key);
  writeQueue([...items, item]);
}

export async function syncPendingMatchResults() {
  if (!navigator.onLine) return { synced: 0, pending: pendingMatchResultCount() };
  const items = readQueue();
  if (!items.length) return { synced: 0, pending: 0 };
  const remaining = [];
  let synced = 0;
  for (const item of items) {
    try {
      const saved = await saveMatchResult(item.competitionId, item.poolId, item.match);
      if (saved) synced += 1; else remaining.push(item);
    } catch {
      remaining.push(item);
    }
  }
  writeQueue(remaining);
  return { synced, pending: remaining.length };
}
