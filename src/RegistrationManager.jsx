import { useMemo, useState } from "react";

const EVENTS = [
  ["kata0", "Kata 0 — Shihotai"],
  ["kata1", "Kata 1"],
  ["kata2", "Kata 2"],
  ["randori", "Randori"],
  ["juRandori1", "Ju Randori 1"],
  ["juRandori2", "Ju Randori 2"],
];

const initialForm = {
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

function RegistrationManager() {
  const [form, setForm] = useState(initialForm);
  const [registrations, setRegistrations] = useState([]);
  const [message, setMessage] = useState("");

  const canSubmit = useMemo(
    () =>
      form.nom.trim() &&
      form.prenom.trim() &&
      form.club.trim() &&
      form.dateNaissance &&
      form.sexe &&
      form.epreuves.length > 0,
    [form]
  );

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function toggleEvent(eventId) {
    setForm((current) => ({
      ...current,
      epreuves: current.epreuves.includes(eventId)
        ? current.epreuves.filter((id) => id !== eventId)
        : [...current.epreuves, eventId],
    }));
  }

  function submitRegistration(event) {
    event.preventDefault();
    if (!canSubmit) return;

    const registration = {
      id: `inscription-${Date.now()}`,
      ...form,
      nom: form.nom.trim().toUpperCase(),
      prenom: form.prenom.trim(),
      club: form.club.trim(),
      poids: form.poids ? Number(form.poids) : "",
      createdAt: new Date().toISOString(),
    };

    setRegistrations((current) => [...current, registration]);
    setForm(initialForm);
    setMessage("Inscription enregistrée.");
  }

  function exportRegistrations() {
    if (!registrations.length) return;

    const payload = {
      format: "nanbudo-competition-inscriptions",
      version: 1,
      exportedAt: new Date().toISOString(),
      competitors: registrations,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `inscriptions-nanbudo-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="registration-manager">
      <div className="manager-header">
        <div>
          <p className="surtitle">INSCRIPTIONS</p>
          <h2>Inscriptions en ligne</h2>
          <p>
            Saisir les compétiteurs puis générer un fichier d'import pour
            Nanbudo Competition.
          </p>
        </div>
        <div className="category-total">
          <strong>{registrations.length}</strong>
          <span>inscription{registrations.length > 1 ? "s" : ""}</span>
        </div>
      </div>

      <form className="competition-form" onSubmit={submitRegistration}>
        <h3>Nouvelle inscription</h3>

        <div className="form-row">
          <label>
            Nom *
            <input name="nom" value={form.nom} onChange={updateField} required />
          </label>
          <label>
            Prénom *
            <input
              name="prenom"
              value={form.prenom}
              onChange={updateField}
              required
            />
          </label>
        </div>

        <div className="form-row">
          <label>
            Club *
            <input name="club" value={form.club} onChange={updateField} required />
          </label>
          <label>
            N° de licence
            <input
              name="licence"
              value={form.licence}
              onChange={updateField}
            />
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
            E-mail
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={updateField}
            />
          </label>
          <label>
            Téléphone
            <input
              type="tel"
              name="telephone"
              value={form.telephone}
              onChange={updateField}
            />
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
            Enregistrer l'inscription
          </button>
          {message && <span className="registration-message">{message}</span>}
        </div>
      </form>

      <div className="manager-header registration-list-header">
        <div>
          <p className="surtitle">LISTE</p>
          <h3>Inscriptions enregistrées</h3>
        </div>
        <button
          type="button"
          className="manage-button"
          disabled={!registrations.length}
          onClick={exportRegistrations}
        >
          Générer le fichier d'import
        </button>
      </div>

      {registrations.length === 0 ? (
        <div className="empty-state">
          <h3>Aucune inscription</h3>
          <p>Les inscriptions enregistrées apparaîtront ici.</p>
        </div>
      ) : (
        <div className="competitor-list">
          {registrations.map((registration) => (
            <article className="competitor-card" key={registration.id}>
              <div>
                <h3>
                  {registration.nom} {registration.prenom}
                </h3>
                <p>{registration.club}</p>
              </div>
              <div className="competitor-details">
                {registration.licence && <span>Licence {registration.licence}</span>}
                <span>{registration.dateNaissance}</span>
                {registration.grade && <span>{registration.grade}</span>}
                {registration.poids && <span>{registration.poids} kg</span>}
              </div>
              <div className="competitor-events">
                {registration.epreuves.map((eventId) => (
                  <span key={eventId}>
                    {EVENTS.find(([id]) => id === eventId)?.[1] || eventId}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default RegistrationManager;
