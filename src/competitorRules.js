export const GRADES = [
  "Blanche",
  "Jaune",
  "Orange",
  "Verte",
  "Bleue",
  "Marron",
  "Noire 1er Dan",
  "Noire 2e Dan",
  "Noire 3e Dan",
  "Noire 4e Dan",
  "Noire 5e Dan",
  "Noire 6e Dan",
];

export const WEIGHT_CATEGORIES = [
  "-30 kg",
  "-35 kg",
  "-40 kg",
  "-45 kg",
  "-50 kg",
  "-55 kg",
  "-60 kg",
  "-65 kg",
  "-70 kg",
  "-75 kg",
  "-80 kg",
  "+80 kg",
];

export const REQUIRED_COMPETITOR_COLUMNS = [
  "id",
  "nom",
  "prenom",
  "sexe",
  "dateNaissance",
  "club",
  "region",
  "numeroLicence",
  "grade",
  "categoriePoids",
  "coach",
  "certificatMedical",
  "autorisationParentale",
];

export function calculateAge(dateNaissance, referenceDate = new Date()) {
  const birthDate = new Date(`${dateNaissance}T00:00:00`);

  if (Number.isNaN(birthDate.getTime()) || birthDate > referenceDate) {
    return null;
  }

  let age = referenceDate.getFullYear() - birthDate.getFullYear();
  const monthDelta = referenceDate.getMonth() - birthDate.getMonth();

  if (monthDelta < 0 || (monthDelta === 0 && referenceDate.getDate() < birthDate.getDate())) {
    age -= 1;
  }

  return age;
}

export function getAgeCategory(age) {
  if (age >= 7 && age <= 10) return "Enfants";
  if (age >= 11 && age <= 15) return "Benjamins / Minimes";
  if (age >= 16 && age <= 18) return "Juniors";
  if (age >= 19 && age <= 39) return "Seniors";
  if (age >= 40) return "Vétérans";
  return "Hors catégorie";
}

export function getAllowedGrades(age) {
  if (age >= 7 && age <= 10) return GRADES.slice(0, 4);
  if (age >= 11 && age <= 15) return GRADES.slice(0, 6);
  if (age >= 16 && age <= 18) return GRADES.slice(4, 8);
  if (age >= 19) return GRADES;
  return [];
}

export function normalizeCompetitor(rawCompetitor) {
  const age = calculateAge(rawCompetitor.dateNaissance);
  const categorieAge = getAgeCategory(age);

  return {
    ...rawCompetitor,
    id: rawCompetitor.id || `competiteur-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    nom: String(rawCompetitor.nom || "").trim().toUpperCase(),
    prenom: String(rawCompetitor.prenom || rawCompetitor.prénom || "").trim(),
    sexe: String(rawCompetitor.sexe || "").trim().toUpperCase(),
    dateNaissance: String(rawCompetitor.dateNaissance || "").trim(),
    age,
    club: String(rawCompetitor.club || "").trim(),
    region: String(rawCompetitor.region || rawCompetitor.région || "").trim(),
    numeroLicence: String(rawCompetitor.numeroLicence || rawCompetitor.numéroLicence || "").trim(),
    grade: String(rawCompetitor.grade || "").trim(),
    categorieAge,
    categoriePoids: String(rawCompetitor.categoriePoids || rawCompetitor.catégoriePoids || "").trim(),
    coach: String(rawCompetitor.coach || "").trim(),
    certificatMedical: String(rawCompetitor.certificatMedical || "Non").trim(),
    autorisationParentale: String(rawCompetitor.autorisationParentale || "Non").trim(),
  };
}

export function validateCompetitor(rawCompetitor, existingLicences = new Set()) {
  const competitor = normalizeCompetitor(rawCompetitor);
  const errors = [];

  REQUIRED_COMPETITOR_COLUMNS.forEach((column) => {
    if (column !== "id" && !String(competitor[column] || "").trim()) {
      errors.push(`Colonne obligatoire manquante : ${column}.`);
    }
  });

  if (!competitor.age) errors.push("Date de naissance invalide ou âge impossible à calculer.");
  if (competitor.age !== null && competitor.age < 7) errors.push("Le compétiteur doit avoir au moins 7 ans.");
  if (!GRADES.includes(competitor.grade)) errors.push(`Grade inconnu : ${competitor.grade || "non renseigné"}.`);
  if (!getAllowedGrades(competitor.age).includes(competitor.grade)) {
    errors.push(`Grade non autorisé pour la catégorie ${competitor.categorieAge} : ${competitor.grade}.`);
  }
  if (!WEIGHT_CATEGORIES.includes(competitor.categoriePoids)) {
    errors.push(`Catégorie de poids invalide : ${competitor.categoriePoids || "non renseignée"}.`);
  }
  if (!['F', 'M'].includes(competitor.sexe)) errors.push("Sexe invalide : utilisez F ou M.");
  if (competitor.age < 18 && competitor.autorisationParentale !== "Oui") {
    errors.push("Autorisation parentale obligatoire pour les mineurs.");
  }
  if (competitor.certificatMedical !== "Oui") errors.push("Certificat médical obligatoire.");
  if (existingLicences.has(competitor.numeroLicence)) errors.push(`Doublon de licence : ${competitor.numeroLicence}.`);

  return { ...competitor, statut: errors.length ? "En attente" : "Validé", errors };
}
