export const REGISTRATION_LOG_STEPS = {
  FORM_RECEIVED: "Formulaire reçu",
  VALIDATION_OK: "Validation OK",
  DATABASE_OK: "Enregistrement base OK",
  COMPETITOR_CREATED_OK: "Création du compétiteur OK",
  MAIL_OK: "Envoi du mail OK",
  NOTIFICATION_OK: "Notification envoyée",
  FINISHED: "Fin du traitement",
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STORAGE_KEY = "nanbudo_competitions";

export function isValidEmail(email) {
  return EMAIL_PATTERN.test(String(email || "").trim());
}

export function isParticipantRowEmpty(row) {
  return Object.values(row).every((value) => !String(value || "").trim());
}

export function validateRegistrationForm(form) {
  if (!Array.isArray(form.participants)) {
    if (!form.nom?.trim() || !form.prenom?.trim() || !form.age || !form.ceinture || !form.club?.trim() || !form.categoriesInscription?.length) return "Veuillez renseigner tous les champs obligatoires.";
    if (!isValidEmail(form.email)) return "Veuillez renseigner un e-mail du responsable du club valide.";
    return "";
  }

  if (!form.club?.trim() || !form.responsableClub?.trim()) return "Veuillez renseigner le nom du club et le responsable du club.";
  if (!isValidEmail(form.email)) return "Veuillez renseigner un e-mail du responsable du club valide.";

  const filledRows = (form.participants || []).filter((row) => !isParticipantRowEmpty(row));
  if (filledRows.length === 0) return "Veuillez renseigner au moins une ligne participant.";

  for (const [index, row] of filledRows.entries()) {
    if (!row.nom?.trim() || !row.prenom?.trim() || !row.sexe || !row.dateNaissance || !row.ceinture || !row.typeInscription) return `La ligne ${index + 1} est incomplète : nom, prénom, sexe, date de naissance, grade et type d’inscription sont obligatoires.`;
  }

  return "";
}

function logRegistrationStep(step, details = {}) {
  console.info(`[Inscription] ${step}`, details);
}

function logRegistrationError(step, error) {
  console.error(`[Inscription] Échec - ${step}`, error);
}

export function persistCompetitions(competitions, { notify = false } = {}) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(competitions));
  const persistedCompetitions = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

  if (!Array.isArray(persistedCompetitions)) {
    throw new Error("La base locale des compétitions est illisible après écriture.");
  }

  if (notify) window.dispatchEvent(new CustomEvent("nanbudo:competitions-updated", { detail: persistedCompetitions }));
  return persistedCompetitions;
}

export async function sendRegistrationConfirmation({ competition, competitor, competitors }) {
  const emailEndpoint = import.meta.env.VITE_CONFIRMATION_EMAIL_API_URL;

  if (!emailEndpoint) {
    throw new Error("Service SMTP non configuré : renseignez VITE_CONFIRMATION_EMAIL_API_URL pour envoyer l'e-mail de confirmation.");
  }

  const response = await fetch(emailEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to: (competitor || competitors?.[0])?.email,
      competitionId: competition.id,
      competitionName: competition.nom,
      competitor,
      competitors,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Erreur SMTP ${response.status}: ${errorBody}`);
  }

  return { sent: true };
}

export async function processRegistration({ competitions, competition, form, createCompetitor, sendConfirmation = sendRegistrationConfirmation }) {
  logRegistrationStep(REGISTRATION_LOG_STEPS.FORM_RECEIVED, { competitionId: competition?.id, publicToken: competition?.publicToken });

  const validationError = validateRegistrationForm(form);
  if (validationError) {
    throw new Error(validationError);
  }

  logRegistrationStep(REGISTRATION_LOG_STEPS.VALIDATION_OK, { email: form.email });
  const competitor = createCompetitor(form);
  const updatedCompetition = {
    ...competition,
    competitors: [...(competition.competitors || []), competitor],
  };
  const updatedCompetitions = competitions.map((item) => item.id === competition.id ? updatedCompetition : item);
  const persistedCompetitions = persistCompetitions(updatedCompetitions, { notify: true });
  const persistedCompetition = persistedCompetitions.find((item) => item.id === competition.id);
  const persistedCompetitor = persistedCompetition?.competitors?.find((item) => item.id === competitor.id);

  if (!persistedCompetitor) {
    throw new Error("Le compétiteur n'a pas été retrouvé dans la base après l'enregistrement.");
  }

  logRegistrationStep(REGISTRATION_LOG_STEPS.DATABASE_OK, { competitionId: competition.id, competitorId: competitor.id });
  logRegistrationStep(REGISTRATION_LOG_STEPS.COMPETITOR_CREATED_OK, persistedCompetitor);

  await sendConfirmation({ competition: updatedCompetition, competitor: persistedCompetitor });
  logRegistrationStep(REGISTRATION_LOG_STEPS.MAIL_OK, { recipient: persistedCompetitor.email });
  logRegistrationStep(REGISTRATION_LOG_STEPS.NOTIFICATION_OK, { competitionId: competition.id, competitorId: competitor.id });
  logRegistrationStep(REGISTRATION_LOG_STEPS.FINISHED, { competitionId: competition.id, competitorId: competitor.id });

  return { updatedCompetitions, updatedCompetition, competitor: persistedCompetitor };
}

export function reportRegistrationFailure(step, error) {
  logRegistrationError(step, error);
}

export async function processBulkRegistration({ competitions, competition, form, createCompetitor, sendConfirmation = sendRegistrationConfirmation }) {
  logRegistrationStep(REGISTRATION_LOG_STEPS.FORM_RECEIVED, { competitionId: competition?.id, publicToken: competition?.publicToken });
  const validationError = validateRegistrationForm(form);
  if (validationError) throw new Error(validationError);

  const filledRows = (form.participants || []).filter((row) => !isParticipantRowEmpty(row));
  logRegistrationStep(REGISTRATION_LOG_STEPS.VALIDATION_OK, { email: form.email, participants: filledRows.length });
  const competitors = filledRows.map((participant) => createCompetitor({ ...form, participant }));
  const updatedCompetition = { ...competition, competitors: [...(competition.competitors || []), ...competitors] };
  const updatedCompetitions = competitions.map((item) => item.id === competition.id ? updatedCompetition : item);
  const persistedCompetitions = persistCompetitions(updatedCompetitions, { notify: true });
  const persistedCompetition = persistedCompetitions.find((item) => item.id === competition.id);
  const persistedCompetitors = competitors.map((competitor) => persistedCompetition?.competitors?.find((item) => item.id === competitor.id)).filter(Boolean);
  if (persistedCompetitors.length !== competitors.length) throw new Error("Toutes les inscriptions n'ont pas été retrouvées dans la base après l'enregistrement.");

  logRegistrationStep(REGISTRATION_LOG_STEPS.DATABASE_OK, { competitionId: competition.id, competitors: persistedCompetitors.length });
  await sendConfirmation({ competition: updatedCompetition, competitor: persistedCompetitors?.[0], competitors: persistedCompetitors });
  logRegistrationStep(REGISTRATION_LOG_STEPS.MAIL_OK, { recipient: form.email, competitors: persistedCompetitors.length });
  logRegistrationStep(REGISTRATION_LOG_STEPS.FINISHED, { competitionId: competition.id, competitors: persistedCompetitors.length });

  return { updatedCompetitions, updatedCompetition, competitors: persistedCompetitors };
}
