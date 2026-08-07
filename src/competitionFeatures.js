import { buildPlanning } from "./planningLogic.js";

export const BACKUP_FORMAT = "nanbudo-competition-backup";
export const BACKUP_VERSION = 1;

export function orderedPassages(competition, tatami) {
  const pools = competition.pools || [];
  const categoryStarts = new Map(buildPlanning(competition).entries.map((entry) => [String(entry.categoryId), entry.start]));
  return pools.flatMap((pool, poolIndex) => (pool.matches || []).map((match, matchIndex) => ({ pool, match, poolIndex, matchIndex })))
    .filter(({ match, pool }) => Number(match.tatami || pool.tatami) === Number(tatami))
    .sort((a, b) => (categoryStarts.get(String(a.pool.categoryId || a.pool.id)) ?? 0) - (categoryStarts.get(String(b.pool.categoryId || b.pool.id)) ?? 0)
      || Number(a.match.ordre || a.matchIndex) - Number(b.match.ordre || b.matchIndex) || a.poolIndex - b.poolIndex);
}

export function nextPassage(competition, poolId, matchId) {
  const pool = (competition.pools || []).find((item) => item.id === poolId);
  const match = pool?.matches?.find((item) => item.id === matchId);
  if (!match) return null;
  const passages = orderedPassages(competition, match.tatami || pool.tatami);
  const index = passages.findIndex((item) => item.pool.id === poolId && item.match.id === matchId);
  return index >= 0 ? passages[index + 1] || null : null;
}

export function clubRanking(competition) {
  const competitors = new Map((competition.competitors || []).map((item) => [String(item.id), item]));
  const clubs = new Map();
  const add = (id, medal, points) => {
    const club = competitors.get(String(id))?.club;
    if (!club) return;
    const row = clubs.get(club) || { club, gold: 0, silver: 0, bronze: 0, points: 0 };
    row[medal] += 1; row.points += points; clubs.set(club, row);
  };
  (competition.pools || []).filter((pool) => pool.podium).forEach((pool) => { add(pool.podium.firstId, "gold", 5); add(pool.podium.secondId, "silver", 3); add(pool.podium.thirdId, "bronze", 1); });
  const rows = [...clubs.values()].sort((a, b) => b.points - a.points || b.gold - a.gold || b.silver - a.silver || b.bronze - a.bronze || a.club.localeCompare(b.club, "fr"));
  let previous = null;
  return rows.map((row, index) => { const same = previous && ["points", "gold", "silver", "bronze"].every((key) => previous[key] === row[key]); const rank = same ? previous.rank : index + 1; previous = { ...row, rank }; return { ...row, rank }; });
}

export function competitionStatistics(competition) {
  const people = competition.competitors || [];
  const competitors = people.filter((person) => person.typeInscription !== "Arbitre");
  const referees = people.filter((person) => person.typeInscription === "Arbitre" || person.typeInscription === "Compétiteur + Arbitre");
  const matches = (competition.pools || []).flatMap((pool) => pool.matches || []);
  const kata = matches.filter((match) => String(match.discipline).startsWith("kata"));
  const combats = matches.filter((match) => !String(match.discipline).startsWith("kata"));
  const countBy = (items, value) => items.reduce((result, item) => { const key = value(item) || "Non renseigné"; result[key] = (result[key] || 0) + 1; return result; }, {});
  return { competitors: competitors.length, clubs: new Set(competitors.map((item) => item.club).filter(Boolean)).size, referees: referees.length,
    categories: (competition.categories || []).length, kata: kata.length, combats: combats.length,
    finished: combats.filter((match) => match.statut === "Terminé").length, remaining: combats.filter((match) => match.statut !== "Terminé").length,
    sex: countBy(competitors, (item) => item.sexe), ages: countBy(competitors, (item) => item.age ? `${Math.floor(Number(item.age) / 10) * 10}-${Math.floor(Number(item.age) / 10) * 10 + 9} ans` : ""),
    disciplines: countBy(competitors.flatMap((item) => item.categoriesInscription || []), (item) => item),
    tatamis: Object.fromEntries([1, 2, 3].map((tatami) => [tatami, matches.filter((match) => Number(match.tatami) === tatami && match.statut === "Terminé").length])),
    duration: competition.startedAt && competition.finishedAt ? Math.round((new Date(competition.finishedAt) - new Date(competition.startedAt)) / 60000) : null,
    averageFightDuration: null, medals: clubRanking(competition) };
}

export function createBackup(competition) { return { format: BACKUP_FORMAT, version: BACKUP_VERSION, createdAt: new Date().toISOString(), competition: structuredClone(competition) }; }
export function validateBackup(value) {
  if (!value || value.format !== BACKUP_FORMAT || value.version !== BACKUP_VERSION || !value.competition?.id || !value.competition?.nom || !Array.isArray(value.competition.pools) || !Array.isArray(value.competition.competitors)) throw new Error("Ce fichier n’est pas une sauvegarde Nanbudo Competition valide.");
  return value;
}
