export const TABLE_REFEREE_SLOTS = ["Arbitre de table 1", "Arbitre de table 2", "Arbitre de table 3"];
export const KATA_FUKUSHIN_SLOTS = ["Fukushin 1", "Fukushin 2", "Fukushin 3", "Fukushin 4"];
export const COMBAT_FUKUSHIN_SLOTS = ["Fukushin 1", "Fukushin 2", "Fukushin 3"];
export const ALL_REFEREE_SLOTS = ["Shushin", ...KATA_FUKUSHIN_SLOTS, ...TABLE_REFEREE_SLOTS];

export function isKataRefereeTeam(discipline = "") {
  return String(discipline).startsWith("kata");
}

export function fukushinSlotsForDiscipline(discipline) {
  return isKataRefereeTeam(discipline) ? KATA_FUKUSHIN_SLOTS : COMBAT_FUKUSHIN_SLOTS;
}

export function refereeSlotsForDiscipline(discipline) {
  if (!discipline) return ALL_REFEREE_SLOTS;
  return ["Shushin", ...fukushinSlotsForDiscipline(discipline), ...TABLE_REFEREE_SLOTS];
}

export function effectiveRefereeAssignments(baseTeam = {}, overrides = {}) {
  return { ...baseTeam, ...overrides };
}

export function replaceMatchReferee(baseTeam = {}, overrides = {}, slot, refereeId) {
  const effectiveTeam = effectiveRefereeAssignments(baseTeam, overrides);
  const currentAssignment = effectiveTeam[slot] || { refereeId: "", manualName: "" };
  const replacementId = String(refereeId || "");
  const occupiedSlot = Object.entries(effectiveTeam).find(([otherSlot, assignment]) => (
    otherSlot !== slot && String(assignment?.refereeId || "") === replacementId
  ))?.[0];
  const nextOverrides = {
    ...overrides,
    [slot]: { refereeId: replacementId, manualName: "" },
  };

  // If the replacement is already on this match, truly interchange both
  // officials instead of accidentally assigning the same person twice.
  if (occupiedSlot) nextOverrides[occupiedSlot] = currentAssignment;
  return nextOverrides;
}

export function replaceCompetitionReferee(assignments = {}, tatami, slot, refereeId) {
  const targetTatami = String(tatami);
  const replacementId = String(refereeId || "");
  const currentAssignment = assignments[targetTatami]?.[slot] || { refereeId: "", manualName: "" };
  const nextAssignments = Object.fromEntries(Object.entries(assignments).map(([tatamiId, team]) => [tatamiId, { ...team }]));
  nextAssignments[targetTatami] = { ...(nextAssignments[targetTatami] || {}) };

  let occupiedPosition = null;
  if (replacementId) {
    Object.entries(assignments).some(([tatamiId, team]) => Object.entries(team || {}).some(([otherSlot, assignment]) => {
      if (tatamiId === targetTatami && otherSlot === slot) return false;
      if (String(assignment?.refereeId || "") !== replacementId) return false;
      occupiedPosition = { tatamiId, slot: otherSlot };
      return true;
    }));
  }

  nextAssignments[targetTatami][slot] = { refereeId: replacementId, manualName: "" };
  if (occupiedPosition) {
    nextAssignments[occupiedPosition.tatamiId] = { ...(nextAssignments[occupiedPosition.tatamiId] || {}) };
    nextAssignments[occupiedPosition.tatamiId][occupiedPosition.slot] = currentAssignment;
  }
  return nextAssignments;
}
