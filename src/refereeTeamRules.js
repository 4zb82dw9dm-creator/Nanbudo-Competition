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
