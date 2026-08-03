import { useEffect, useMemo, useState } from "react";
import { COMPETITIONS_STORAGE_KEY } from "./backupUtils";
import { KATA0_RANDORI0_RULE, calculateAge, canParticipateInKata0Randori0 } from "./competitorRules";

const STORAGE_KEY = "nanbudo-online-registrations-v2";
const REGISTRATIONS_CHANGED_EVENT = "nanbudo-registrations-changed";

const EVENTS = [
  ["kata0", "Kata 0 — Shihotai"],
  ["kata1", "Kata 1"],
  ["kata2", "Kata 2"],
  ["randori", "Randori"],
  ["juRandori1", "Ju Randori 1"],
  ["juRandori2", "Ju Randori 2"],
];

function normalizeCompetitionForRegistration(competition) {
  const registrationOpen =
    competition?.registrationOpen === true ||
    competition?.status === "open" ||
    competition?.statut === "Inscriptions ouvertes" ||
    competition?.inscriptionsOuvertes === true;

  return {
    ...competition,
    registrationOpen,
    status: registrationOpen ? "open" : competition?.status || "draft",
    inscriptionsOuvertes: registrationOpen,
  };
}

const initialForm = {
  competitionId: "",
  nom: "",
  prenom: "",
  club: "",
  licence: "",
  dateNaissance: "",
  sexe: "",
  grade: "",
  poids: "",
  email: "",
  telephone: "",
  epreuves: [],
};


function readJsonFromStorage(key, fallback) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function RegistrationManager() {
  const [form, setForm] = useState(initialForm);
  const [registrations, setRegistrations] = useState(() =>
    readJsonFromStorage(STORAGE_KEY, []),
  );
  const [competitions, setCompetitions] = useState(() =>
    readJsonFromStorage(COMPETITIONS_STORAGE_KEY, []).map(normalizeCompetitionForRegistration),
  );
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(registrations));
    window.dispatchEvent(new Event(REGISTRATIONS_CHANGED_EVENT));
  }, [registrations]);

  useEffect(() => {
    function refreshCompetitions() {
      setCompetitions(
        readJsonFromStorage(COMPETITIONS_STORAGE_KEY, []).map(normalizeCompetitionForRegistration),
      );
    }

    window.addEventListener("storage", refreshCompetitions);
    window.addEventListener("nanbudo-competitions-changed", refreshCompetitions);

    return () => {
      window.removeEventListener("storage", refreshCompetitions);
      window.removeEventListener("nanbudo-competitions-changed", refreshCompetitions);
    };
  }, []);

  const openCompetitions = useMemo(
    () => competitions.filter((competition) => competition.registrationOpen === true || competition.status === "open"),
    [competitions],
  );

  const editedRegistration = useMemo(
    () => registrations.find((registration) => String(registration.id) === String(editingId)),
    [registrations, editingId],
  );

  const selectableCompetitions = useMemo(() => {
    if (!editedRegistration) {
      return openCompetitions;
    }

    const currentCompetition = competitions.find(
      (competition) => String(competition.id) === String(editedRegistration.competitionId),
    );
    const currentAlreadyOpen = openCompetitions.some(
      (competition) => String(competition.id) === String(currentCompetition?.id),
    );

    if (currentCompetition && !currentAlreadyOpen) {
      return [currentCompetition, ...openCompetitions];
    }

    return openCompetitions;
  }, [competitions, editedRegistration, openCompetitions]);

  const canSubmit = useMemo(
    () =>
      form.competitionId &&
      form.nom.trim() &&
      form.prenom.trim() &&
      form.club.trim() &&
      form.dateNaissance &&
      form.sexe &&
      form.email.trim() &&
      form.epreuves.length > 0,
    [form],
  );

  const competitionName = (id) =>
    competitions.find((competition) => String(competition.id) === String(id))?.nom ||
    "Compétition inconnue";

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return registrations;
    }

    return registrations.filter((registration) =>
      [
        registration.nom,
        registration.prenom,
        registration.club,
        registration.licence,
        registration.email,
        competitionName(registration.competitionId),
      ].some((value) => String(value || "").toLowerCase().includes(query)),
    );
  }, [competitions, registrations, search]);

  function updateField(event) {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
    setMessage("");
  }

  function toggleEvent(id) {
    setForm((currentForm) => ({
      ...currentForm,
      epreuves: currentForm.epreuves.includes(id)
        ? currentForm.epreuves.filter((eventId) => eventId !== id)
        : [...currentForm.epreuves, id],
    }));
  }

  function resetForm() {
    setForm(initialForm);
    setEditingId(null);
  }

  function submitRegistration(event) {
    event.preventDefault();

    if (!canSubmit) {
      setMessage("Vérifiez les champs obligatoires et sélectionnez au moins une épreuve.");
      return;
    }

    if ((form.epreuves.includes("kata0") || form.epreuves.includes("randori")) && !canParticipateInKata0Randori0({
      dateNaissance: form.dateNaissance,
      age: calculateAge(form.dateNaissance),
      grade: form.grade,
    })) {
      setMessage(KATA0_RANDORI0_RULE.rejectionMessage);
      return;
    }

    const now = new Date().toISOString();
    const registration = {
      id: editingId || `inscription-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      ...form,
      competitionId: String(form.competitionId),
      competitionNom: competitionName(form.competitionId),
      nom: form.nom.trim().toUpperCase(),
      prenom: form.prenom.trim(),
      club: form.club.trim(),
      licence: form.licence.trim(),
      email: form.email.trim(),
      telephone: form.telephone.trim(),
      poids: form.poids !== "" ? Number(form.poids) : "",
      updatedAt: now,
    };

    setRegistrations((currentRegistrations) => {
      if (editingId) {
        return currentRegistrations.map((currentRegistration) =>
          String(currentRegistration.id) === String(editingId)
            ? { ...currentRegistration, ...registration }
            : currentRegistration,
        );
      }

      return [...currentRegistrations, { ...registration, createdAt: now }];
    });

    setMessage(editingId ? "Inscription modifiée et enregistrée." : "Inscription enregistrée.");
    resetForm();
  }

  function editRegistration(registration) {
    setEditingId(registration.id);
    setForm({
      ...initialForm,
      ...registration,
      competitionId: String(registration.competitionId || ""),
      poids: registration.poids ?? "",
      epreuves: Array.isArray(registration.epreuves) ? registration.epreuves : [],
    });
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function deleteRegistration(id) {
    if (!window.confirm("Supprimer cette inscription ?")) {
      return;
    }

    setRegistrations((currentRegistrations) =>
      currentRegistrations.filter((registration) => String(registration.id) !== String(id)),
    );

    if (String(editingId) === String(id)) {
      resetForm();
    }
  }

  function downloadJson(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function exportRegistrations() {
    if (!registrations.length) {
      return;
    }

    downloadJson(
      {
        format: "nanbudo-competition-inscriptions",
        version: 2,
        exportedAt: new Date().toISOString(),
        competitors: registrations,
      },
      `inscriptions-nanbudo-${new Date().toISOString().slice(0, 10)}.json`,
    );
  }

  function handleImport(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result || ""));
        const incomingRegistrations = Array.isArray(data) ? data : data.competitors;

        if (!Array.isArray(incomingRegistrations)) {
          throw new Error("Invalid registrations file");
        }

        const cleanRegistrations = incomingRegistrations.map((registration, index) => ({
          ...initialForm,
          ...registration,
          id: registration.id || `import-${Date.now()}-${index}`,
          competitionId: String(registration.competitionId || ""),
          epreuves: Array.isArray(registration.epreuves) ? registration.epreuves : [],
        }));

        setRegistrations(cleanRegistrations);
        setMessage(`${cleanRegistrations.length} inscription(s) importée(s).`);
      } catch {
        alert("Fichier d'inscriptions invalide.");
      } finally {
        event.target.value = "";
      }
    };

    reader.readAsText(file, "UTF-8");
  }

  return (
    <section className="registration-manager">
      <div className="manager-header">
        <div>
          <p className="surtitle">INSCRIPTIONS</p>
          <h2>Inscriptions en ligne</h2>
          <p>Choisissez la compétition puis inscrivez le compétiteur.</p>
        </div>
        <div className="category-total">
          <strong>{registrations.length}</strong>
          <span>inscription{registrations.length > 1 ? "s" : ""}</span>
        </div>
      </div>

      <form className="competition-form" onSubmit={submitRegistration}>
        <h3>{editingId ? "Modifier l'inscription" : "Nouvelle inscription"}</h3>

        <label>
          Compétition *
          <select name="competitionId" value={form.competitionId} onChange={updateField} required>
            <option value="">Sélectionner une compétition</option>
            {selectableCompetitions.map((competition) => (
              <option key={competition.id} value={String(competition.id)}>
                {competition.nom}
                {competition.lieu ? ` — ${competition.lieu}` : ""}
                {competition.date ? ` — ${competition.date}` : ""}
              </option>
            ))}
          </select>
        </label>

        {!editingId && openCompetitions.length === 0 && (
          <div className="beta-note">
            <strong>Aucune inscription ouverte</strong>
            <p>
              La Commission doit ouvrir les inscriptions d'une compétition avant qu'elle apparaisse ici.
            </p>
          </div>
        )}

        <div className="form-row">
          <label>
            Nom *
            <input name="nom" value={form.nom} onChange={updateField} required />
          </label>
          <label>
            Prénom *
            <input name="prenom" value={form.prenom} onChange={updateField} required />
          </label>
        </div>

        <div className="form-row">
          <label>
            Club *
            <input name="club" value={form.club} onChange={updateField} required />
          </label>
          <label>
            N° de licence
            <input name="licence" value={form.licence} onChange={updateField} />
          </label>
        </div>

        <div className="form-row">
          <label>
            Date de naissance *
            <input
              type="date"
              name="dateNaissance"
              value={form.dateNaissance}
              onChange={updateField}
              required
            />
          </label>
          <label>
            Sexe *
            <select name="sexe" value={form.sexe} onChange={updateField} required>
              <option value="">Sélectionner</option>
              <option value="F">Féminin</option>
              <option value="M">Masculin</option>
            </select>
          </label>
        </div>

        <div className="form-row">
          <label>
            Grade
            <input name="grade" value={form.grade} onChange={updateField} />
          </label>
          <label>
            Poids (kg)
            <input
              type="number"
              min="0"
              step="0.1"
              name="poids"
              value={form.poids}
              onChange={updateField}
            />
          </label>
        </div>

        <div className="form-row">
          <label>
            E-mail responsable du club *
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={updateField}
              required
            />
          </label>
          <label>
            Téléphone
            <input type="tel" name="telephone" value={form.telephone} onChange={updateField} />
          </label>
        </div>

        <fieldset className="event-selection">
          <legend>Épreuves *</legend>
          {EVENTS.map(([id, label]) => (
            <label key={id}>
              <input
                type="checkbox"
                checked={form.epreuves.includes(id)}
                onChange={() => toggleEvent(id)}
              />
              {label}
            </label>
          ))}
        </fieldset>

        <div className="competitor-actions">
          <button className="primary" type="submit" disabled={!canSubmit}>
            {editingId ? "Enregistrer les modifications" : "Enregistrer l'inscription"}
          </button>
          {editingId && (
            <button className="back-button" type="button" onClick={resetForm}>
              Annuler
            </button>
          )}
          {message && <span>{message}</span>}
        </div>
      </form>

      <div className="manager-header registration-list-header">
        <div>
          <p className="surtitle">LISTE</p>
          <h3>Inscriptions enregistrées</h3>
        </div>
        <div className="competitor-actions">
          <label className="manage-button registration-import-label">
            Importer un fichier
            <input type="file" accept="application/json,.json" onChange={handleImport} hidden />
          </label>
          <button
            type="button"
            className="manage-button"
            disabled={!registrations.length}
            onClick={exportRegistrations}
          >
            Générer le fichier d'import
          </button>
        </div>
      </div>

      {registrations.length > 0 && (
        <div className="registration-toolbar">
          <input
            type="search"
            placeholder="Rechercher nom, club, compétition…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <span>
            {filtered.length} affichée{filtered.length > 1 ? "s" : ""}
          </span>
        </div>
      )}

      {registrations.length === 0 ? (
        <div className="empty-state">
          <h3>Aucune inscription</h3>
        </div>
      ) : (
        <div className="competitor-list">
          {filtered.map((registration) => (
            <article className="competitor-card" key={registration.id}>
              <div>
                <h3>
                  {registration.nom} {registration.prenom}
                </h3>
                <p>{registration.club}</p>
                <p>
                  <strong>
                    {registration.competitionNom || competitionName(registration.competitionId)}
                  </strong>
                </p>
              </div>

              <div className="competitor-details">
                {registration.licence && <span>Licence {registration.licence}</span>}
                <span>{registration.dateNaissance}</span>
                <span>{registration.sexe === "F" ? "Féminin" : "Masculin"}</span>
                {registration.grade && <span>{registration.grade}</span>}
                {registration.poids !== "" && registration.poids !== undefined && (
                  <span>{registration.poids} kg</span>
                )}
              </div>

              <div className="competitor-events">
                {registration.epreuves.map((id) => (
                  <span key={id}>{EVENTS.find(([eventId]) => eventId === id)?.[1] || id}</span>
                ))}
              </div>

              <div className="competition-actions">
                <button
                  className="manage-button"
                  type="button"
                  onClick={() => editRegistration(registration)}
                >
                  Modifier
                </button>
                <button
                  className="delete-button"
                  type="button"
                  onClick={() => deleteRegistration(registration.id)}
                >
                  Supprimer
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default RegistrationManager;
