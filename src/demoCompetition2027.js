const DEMO_COMPETITION_DATE = "2027-03-15";

const CLUBS = [
  ["UMSEP Marseille", "Provence-Alpes-Côte d’Azur"],
  ["Nanbudo Igny", "Île-de-France"],
  ["Nanbudo Bagneux", "Île-de-France"],
  ["Nanbudo Crest", "Auvergne-Rhône-Alpes"],
  ["Nanbudo Lyon", "Auvergne-Rhône-Alpes"],
  ["Nanbudo Toulouse", "Occitanie"],
  ["Nanbudo Bordeaux", "Nouvelle-Aquitaine"],
  ["Nanbudo Lille", "Hauts-de-France"],
  ["Nanbudo Nantes", "Pays de la Loire"],
  ["Nanbudo Nice", "Provence-Alpes-Côte d’Azur"],
];

const AGE_BANDS = [
  { label: "7 à 9 ans", ages: [7, 8, 9], count: 12, grades: ["6ème Kyu", "5ème Kyu", "4ème Kyu"], weights: [22, 25, 28, 31, 35], categorie: "Enfant", events: ["kata0", "randori"] },
  { label: "10 à 11 ans", ages: [10, 11], count: 12, grades: ["5ème Kyu", "4ème Kyu", "3ème Kyu"], weights: [28, 31, 35, 40, 45], categorie: "Benjamin", events: ["kata0", "kata1", "randori"] },
  { label: "12 à 13 ans", ages: [12, 13], count: 12, grades: ["4ème Kyu", "3ème Kyu", "2ème Kyu"], weights: [35, 40, 45, 50, 55], categorie: "Minime", events: ["kata1", "kata2", "randori"] },
  { label: "14 à 15 ans", ages: [14, 15], count: 12, grades: ["3ème Kyu", "2ème Kyu", "1er Kyu"], weights: [45, 50, 55, 60, 65], categorie: "Minime", events: ["kata1", "kata2", "juRandori1"] },
  { label: "16 à 17 ans", ages: [16, 17], count: 13, grades: ["2ème Kyu", "1er Kyu", "1er Dan"], weights: [50, 55, 60, 65, 70, 75], categorie: "Junior", events: ["kata2", "juRandori1", "juRandori2"] },
  { label: "18 à 20 ans", ages: [18, 19, 20], count: 13, grades: ["1er Kyu", "1er Dan", "2ème Dan"], weights: [55, 60, 65, 70, 75, 80], categorie: "Senior", events: ["kata2", "randori", "juRandori1"] },
  { label: "Seniors", ages: [21, 24, 28, 32, 36], count: 13, grades: ["1er Dan", "2ème Dan", "3ème Dan", "4ème Dan"], weights: [55, 60, 65, 70, 75, 80, 85, 90], categorie: "Senior", events: ["kata1", "kata2", "randori", "juRandori2"] },
  { label: "Vétérans jusqu’à 50 ans", ages: [40, 43, 46, 50], count: 13, grades: ["2ème Dan", "3ème Dan", "4ème Dan", "5ème Dan", "6ème Dan"], weights: [60, 65, 70, 75, 80, 85, 90, 95], categorie: "Vétéran", events: ["kata2", "juRandori1", "juRandori2"] },
];

const MEN = ["Lucas", "Hugo", "Enzo", "Nathan", "Louis", "Gabriel", "Noah", "Maël", "Tom", "Sacha", "Nolan", "Paul", "Alexis", "Antoine", "Maxime", "Baptiste", "Mathis", "Romain", "Victor", "Yanis", "Karim", "Adrien", "Théo", "Eliott", "Raphaël", "Jules", "Léo", "Arthur", "Noé", "Ilyes", "Martin", "Clément", "Malo", "Nicolas", "Samuel", "Quentin", "Alexandre", "Laurent", "Philippe", "Stéphane", "Olivier", "Julien", "Mathieu", "Benoît", "Damien", "Cédric", "Félix", "Gabin", "Naël", "Timéo"];
const WOMEN = ["Emma", "Lina", "Chloé", "Inès", "Manon", "Camille", "Sarah", "Zoé", "Léa", "Alice", "Lou", "Eva", "Jade", "Mila", "Rose", "Anna", "Clara", "Julie", "Laura", "Nina", "Elise", "Amélie", "Sophie", "Maëlle", "Océane", "Léna", "Jeanne", "Louise", "Ambre", "Romane", "Nour", "Alicia", "Nora", "Agathe", "Lucie", "Margaux", "Nathalie", "Isabelle", "Caroline", "Sandrine", "Aurélie", "Marine", "Élodie", "Amandine", "Céline", "Maeva", "Salomé", "Anaïs", "Lola", "Iris"];
const NAMES = ["MARTIN", "BERNARD", "DUBOIS", "THOMAS", "ROBERT", "RICHARD", "PETIT", "DURAND", "LEROY", "MOREAU", "SIMON", "LAURENT", "LEFEBVRE", "MICHEL", "GARCIA", "DAVID", "BERTRAND", "ROUX", "VINCENT", "FOURNIER", "MOREL", "GIRARD", "ANDRE", "LEFEVRE", "MERCIER", "DUPONT", "LAMBERT", "BONNET", "FRANCOIS", "MARTINEZ", "LEGRAND", "GARNIER", "FAURE", "ROUSSEAU", "BLANC", "GUERIN", "MULLER", "HENRY", "ROUSSEL", "NICOLAS", "PERRIN", "MORIN", "MATHIEU", "CLEMENT", "GAUTHIER", "DUMONT", "LOPEZ", "FONTAINE", "CHEVALIER", "ROBIN"];

function birthDateForAge(age, index) {
  const month = String((index % 12) + 1).padStart(2, "0");
  const day = String(((index * 3) % 24) + 1).padStart(2, "0");
  return `${2027 - age}-${month}-${day}`;
}

function weightCategory(weight) {
  if (weight > 90) return "+90 kg";
  return `-${Math.ceil(weight / 5) * 5} kg`;
}

function eventObject(events) {
  return {
    kata0: events.includes("kata0"),
    kata1: events.includes("kata1"),
    kata2: events.includes("kata2"),
    randori: events.includes("randori"),
    juRandori1: events.includes("juRandori1"),
    juRandori2: events.includes("juRandori2"),
  };
}

export function buildDemoCompetition2027(idPrefix = "demo-2027") {
  let globalIndex = 0;
  const participants = AGE_BANDS.flatMap((band, bandIndex) => Array.from({ length: band.count }, (_, indexInBand) => {
    const index = globalIndex++;
    const isFemale = indexInBand % 2 === 1;
    const age = band.ages[indexInBand % band.ages.length];
    const [club, region] = CLUBS[index % CLUBS.length];
    const prenom = isFemale ? WOMEN[index % WOMEN.length] : MEN[index % MEN.length];
    const nom = NAMES[(index + bandIndex) % NAMES.length];
    const poids = band.weights[(indexInBand + bandIndex) % band.weights.length];
    const epreuves = eventObject(band.events);
    return {
      id: `${idPrefix}-competitor-${String(index + 1).padStart(3, "0")}`,
      nom,
      prenom,
      sexe: isFemale ? "Femme" : "Homme",
      dateNaissance: birthDateForAge(age, index),
      age,
      club,
      region,
      licence: `AFDP-2027-${String(index + 1).padStart(4, "0")}`,
      numeroLicence: `AFDP-2027-${String(index + 1).padStart(4, "0")}`,
      grade: band.grades[(indexInBand + bandIndex) % band.grades.length],
      poids,
      categoriePoids: weightCategory(poids),
      categorie: band.categorie,
      categorieAge: band.label,
      email: `${prenom}.${nom}.${index + 1}@example.test`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
      telephone: `06 ${String(10 + (index % 80)).padStart(2, "0")} ${String(20 + (index % 70)).padStart(2, "0")} ${String(30 + (index % 60)).padStart(2, "0")} ${String(40 + (index % 50)).padStart(2, "0")}`,
      certificatMedical: true,
      autorisationParentale: age < 18,
      badgeVert: true,
      epreuves,
      ...epreuves,
      statut: "Validé",
      inscriptionValide: true,
    };
  }));

  return {
    nom: "Coupe de France Test 2027",
    organisateur: "AFDP Nanbudo France",
    lieu: "Marseille",
    ville: "Marseille",
    date: DEMO_COMPETITION_DATE,
    type: "Coupe de France",
    statut: "Ouverte",
    status: "open",
    registrationOpen: true,
    inscriptionsOuvertes: true,
    nombreTatamis: 4,
    participants,
    competitors: participants,
    clubs: CLUBS.map(([nom, region]) => ({ nom, region })),
    demoData: true,
    importReport: { imported: participants.length, rejected: [], skippedDuplicates: 0 },
  };
}
