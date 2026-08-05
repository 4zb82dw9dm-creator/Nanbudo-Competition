export const DISCIPLINES = [
  { id: "kata", label: "Kata" },
  { id: "combat", label: "Combat" },
];

export function calculateAge(dateNaissance, referenceDate = new Date()) {
  if (!dateNaissance) return "";
  const birth = new Date(dateNaissance);
  let age = referenceDate.getFullYear() - birth.getFullYear();
  const monthDifference = referenceDate.getMonth() - birth.getMonth();
  if (monthDifference < 0 || (monthDifference === 0 && referenceDate.getDate() < birth.getDate())) age -= 1;
  return age;
}

export function ageBand(age) {
  if (age === "" || age === undefined) return "Âge à vérifier";
  if (age < 12) return "Poussins";
  if (age < 15) return "Benjamins / Minimes";
  if (age < 18) return "Cadets / Juniors";
  if (age < 36) return "Seniors";
  return "Vétérans";
}

export function gradeBand(grade = "") {
  const normalized = grade.toLowerCase();
  if (normalized.includes("dan")) return "Dan";
  if (normalized.includes("kyu")) return "Kyu";
  return grade.trim() || "Grade à vérifier";
}

export function disciplineLabel(discipline) {
  return discipline === "kata" ? "Kata" : "Combat";
}

export function getRegistrationCategories(inscription) {
  if (Array.isArray(inscription.categoriesInscription) && inscription.categoriesInscription.length > 0) return inscription.categoriesInscription;
  if (inscription.categorieInscription) return [inscription.categorieInscription];
  return getEligibleDisciplines(inscription).map(disciplineLabel);
}

export function getEligibleDisciplines(inscription) {
  if (inscription.discipline === "both") return ["kata", "combat"];
  if (inscription.discipline === "kata") return ["kata"];
  return ["combat"];
}

export function buildAutomaticCategories(inscriptions) {
  const groups = new Map();
  inscriptions.forEach((inscription) => {
    getRegistrationCategories(inscription).forEach((registrationCategory) => {
      const discipline = registrationCategory.startsWith("Kata") ? "kata" : "combat";
      const age = inscription.age ?? calculateAge(inscription.dateNaissance);
      const key = [registrationCategory, ageBand(age), inscription.sexe, gradeBand(inscription.grade)].join("|");
      if (!groups.has(key)) {
        groups.set(key, {
          id: `${discipline}-${key}`.replace(/\s+/g, "-").toLowerCase(),
          nom: `${registrationCategory} · ${ageBand(age)} · ${inscription.sexe} · ${gradeBand(inscription.grade)}`,
          discipline,
          registrationCategory,
          ageGroup: ageBand(age),
          sexe: inscription.sexe,
          gradeGroup: gradeBand(inscription.grade),
          competitorIds: [],
          statut: "À valider",
        });
      }
      groups.get(key).competitorIds.push(inscription.id);
    });
  });
  return Array.from(groups.values()).map((category, index) => ({ ...category, id: `${Date.now()}-${index}`, statut: category.competitorIds.length >= 2 ? "Prête" : "À fusionner" }));
}

export function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

export function generateMatches(competitorIds, category, poolIndex = 0) {
  const matches = [];
  for (let i = 0; i < competitorIds.length; i += 1) {
    for (let j = i + 1; j < competitorIds.length; j += 1) {
      matches.push({
        id: `${Date.now()}-${poolIndex}-${i}-${j}`,
        categoryId: category.id,
        discipline: category.discipline,
        akaId: competitorIds[i],
        shiroId: competitorIds[j],
        akaScore: null,
        shiroScore: null,
        winnerId: null,
        avertissementsAka: 0,
        avertissementsShiro: 0,
        penalitesAka: {},
        penalitesShiro: {},
        tatami: (matches.length % 3) + 1,
        ordre: matches.length + 1,
        horaire: "",
        statut: "À jouer",
      });
    }
  }
  return matches;
}

export function buildPoolsForCategory(category) {
  const shuffled = shuffle(category.competitorIds);
  const poolCount = Math.max(1, Math.ceil(shuffled.length / 4));
  const buckets = Array.from({ length: poolCount }, () => []);
  shuffled.forEach((id, index) => buckets[index % poolCount].push(id));
  return buckets.filter((ids) => ids.length > 0).map((ids, index) => ({
    id: `${Date.now()}-${category.id}-${index}`,
    categoryId: category.id,
    discipline: category.discipline,
    nom: `${category.nom} · Poule ${index + 1}`,
    competitorIds: ids,
    matches: generateMatches(ids, category, index),
    statut: "À valider",
    rankingLocked: [],
    podium: null,
  }));
}

export function calculateRanking(pool) {
  const ranking = pool.competitorIds.map((id) => ({ competitorId: id, victories: 0, defeats: 0, draws: 0, scoreFor: 0, scoreAgainst: 0, difference: 0 }));
  (pool.matches || []).forEach((match) => {
    if (match.statut !== "Terminé") return;
    const aka = ranking.find((item) => item.competitorId === match.akaId);
    const shiro = ranking.find((item) => item.competitorId === match.shiroId);
    if (!aka || !shiro) return;
    aka.scoreFor += match.akaScore || 0; aka.scoreAgainst += match.shiroScore || 0;
    shiro.scoreFor += match.shiroScore || 0; shiro.scoreAgainst += match.akaScore || 0;
    if (match.winnerId === match.akaId) { aka.victories += 1; shiro.defeats += 1; }
    else if (match.winnerId === match.shiroId) { shiro.victories += 1; aka.defeats += 1; }
    else { aka.draws += 1; shiro.draws += 1; }
  });
  ranking.forEach((item) => { item.difference = item.scoreFor - item.scoreAgainst; });
  return ranking.sort((a, b) => b.victories - a.victories || b.difference - a.difference || b.scoreFor - a.scoreFor);
}

export function podiumFromPool(pool) {
  const ranking = calculateRanking(pool);
  return { firstId: ranking[0]?.competitorId || null, secondId: ranking[1]?.competitorId || null, thirdId: ranking[2]?.competitorId || null };
}
