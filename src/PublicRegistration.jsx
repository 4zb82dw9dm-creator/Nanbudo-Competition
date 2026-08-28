import { useEffect, useState } from "react";
import { INITIAL_REGISTRATION_FORM, RegistrationForm, createEmptyParticipantRows, isParticipantRowEmpty, normalizeCompetitor, normalizeParticipantTypeChange } from "./CompetitionDashboard";
import { validateRegistrationForm } from "./registrationProcessing";
import { findCompetitionByPublicSlug } from "./routing";
import { isSupabaseConfigured, loadCompetitions, submitPublicRegistration, SupabaseUnavailableError } from "./supabase";

function locallyStoredCompetitions() {
  try {
    const competitions = JSON.parse(localStorage.getItem("nanbudo_competitions") || "[]");
    return Array.isArray(competitions) ? competitions : [];
  } catch {
    return [];
  }
}

function registrationsAreOpen(competition) {
  return String(competition?.statut || "").trim().replace(/\s+/g, " ").toLocaleLowerCase("fr") === "inscriptions ouvertes";
}

export default function PublicRegistration({ slug }) {
  const [competition, setCompetition] = useState(null);
  const [form, setForm] = useState(INITIAL_REGISTRATION_FORM);
  const [status, setStatus] = useState("loading");
  useEffect(() => {
    let active = true;
    setCompetition(null);
    setStatus("loading");

    async function resolveCompetition() {
      const localCompetitions = locallyStoredCompetitions();
      let competitions = localCompetitions;

      if (isSupabaseConfigured) {
        try {
          competitions = await loadCompetitions();
        } catch (error) {
          const localMatch = findCompetitionByPublicSlug(localCompetitions, slug);
          if (!localMatch) throw error;
        }
      }

      if (!active) return;
      const foundCompetition = findCompetitionByPublicSlug(competitions, slug);
      if (!foundCompetition) return setStatus("missing");
      setCompetition(foundCompetition);
      setStatus(registrationsAreOpen(foundCompetition) ? "ready" : "closed");
    }

    resolveCompetition().catch((error) => {
      console.error("Impossible de charger la compétition publique", error);
      if (active) setStatus("unavailable");
    });
    return () => { active = false; };
  }, [slug]);
  function changeClub(event) { const { name, value } = event.target; setForm((current) => ({ ...current, [name]: value })); }
  function changeParticipant(index, field, value) { setForm((current) => ({ ...current, participants: current.participants.map((row, i) => i !== index ? row : field === "typeInscription" ? normalizeParticipantTypeChange(row, value) : { ...row, [field]: value }) })); }
  async function submit(event) {
    event.preventDefault();
    const error = validateRegistrationForm(form); if (error) return alert(error);
    setStatus("submitting");
    try {
      const competitors = form.participants.filter((row) => !isParticipantRowEmpty(row)).map((participant) => normalizeCompetitor({ ...form, participant }));
      await submitPublicRegistration(slug, competitors);
      setForm(INITIAL_REGISTRATION_FORM); setStatus("success");
    } catch (submissionError) { console.error("Échec de l’inscription publique", submissionError); alert(submissionError instanceof SupabaseUnavailableError ? "Le service d’inscription est temporairement indisponible." : submissionError.message); setStatus("ready"); }
  }
  if (status === "loading") return <PublicShell><p>Chargement de la compétition…</p></PublicShell>;
  if (status === "missing") return <PublicShell><h2>Lien d’inscription indisponible</h2><p>Cette compétition n’existe pas.</p></PublicShell>;
  if (status === "closed") return <PublicShell><h2>Lien d’inscription indisponible</h2><p>Les inscriptions à cette compétition sont actuellement fermées.</p></PublicShell>;
  if (status === "unavailable") return <PublicShell><h2>Service indisponible</h2><p>Le service d’inscription est temporairement indisponible.</p></PublicShell>;
  return <PublicShell><div className="public-event"><p className="surtitle">PORTAIL D’INSCRIPTION CLUB</p><h1>{competition.nom}</h1><p>📍 {competition.lieu || "Lieu à définir"} · 📅 {competition.date || "Date à définir"}</p>{competition.publicInfo && <p>{competition.publicInfo}</p>}</div>{status === "success" && <div className="confirmation" role="status"><strong>Inscription envoyée.</strong><p>Votre club a bien été inscrit à {competition.nom}.</p></div>}<RegistrationForm form={form} onClubChange={changeClub} onParticipantChange={changeParticipant} onClearRows={() => setForm((current) => ({ ...current, participants: createEmptyParticipantRows(15) }))} onAddRows={(count) => setForm((current) => ({ ...current, participants: [...current.participants, ...createEmptyParticipantRows(count)] }))} onSubmit={submit} submitLabel={status === "submitting" ? "Envoi…" : "Envoyer l’inscription"} /></PublicShell>;
}

function PublicShell({ children }) { return <main className="public-portal"><header><img src={`${import.meta.env.BASE_URL}assets/logo-afdp.png`} alt="AFDP Nanbudo" /></header>{children}</main>; }
