import { useEffect, useState } from "react";
import CompetitionDashboard from "./CompetitionDashboard";
function CompetitionManager() {
  const [competitions, setCompetitions] = useState(() => {
    try {
      const saved = localStorage.getItem("nanbudo_competitions");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [showForm, setShowForm] = useState(false);
  const [selectedCompetitionId, setSelectedCompetitionId] = useState(null);
  const [form, setForm] = useState({
    nom: "",
    date: "",
    lieu: "",
    type: "Coupe régionale",
    saison: "2026-2027",
  });

  useEffect(() => {
    localStorage.setItem(
      "nanbudo_competitions",
      JSON.stringify(competitions)
    );
  }, [competitions]);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function createCompetition(event) {
    event.preventDefault();

    if (!form.nom.trim()) {
      alert("Indique le nom de la compétition.");
      return;
    }

    const newCompetition = {
      id: Date.now(),
      nom: form.nom.trim(),
      date: form.date,
      lieu: form.lieu.trim(),
      type: form.type,
      saison: form.saison,
      statut: "Préparation",
      competitors: [],
      categories: [],
    };

    setCompetitions((current) => [
      ...current,
      newCompetition,
    ]);

    setForm({
      nom: "",
      date: "",
      lieu: "",
      type: "Coupe régionale",
      saison: "2026-2027",
    });

    setShowForm(false);
  }

  function deleteCompetition(id) {
    const confirmed = window.confirm(
      "Supprimer cette compétition ?"
    );

    if (!confirmed) return;

    setCompetitions((current) =>
      current.filter((competition) => competition.id !== id)
    );
  }
function updateCompetition(updatedCompetition) {
  setCompetitions((current) =>
    current.map((competition) =>
      competition.id === updatedCompetition.id
        ? updatedCompetition
        : competition
    )
  );
}

const selectedCompetition = competitions.find(
  (competition) => competition.id === selectedCompetitionId
);

if (selectedCompetition) {
  return (
    <CompetitionDashboard
      competition={selectedCompetition}
      onBack={() => setSelectedCompetitionId(null)}
      onUpdateCompetition={updateCompetition}
    />
  );
}  
  return (
    <section className="competition-manager">
      <div className="manager-header">
        <div>
          <p className="surtitle">BÊTA 0.1</p>
          <h2>Gestion des compétitions</h2>
          <p>
            Créez une compétition puis accédez à sa gestion.
          </p>
        </div>

        <button
          className="primary"
          onClick={() => setShowForm((current) => !current)}
        >
          {showForm ? "Annuler" : "+ Nouvelle compétition"}
        </button>
      </div>

      {showForm && (
        <form
          className="competition-form"
          onSubmit={createCompetition}
        >
          <h3>Nouvelle compétition</h3>

          <label>
            Nom de la compétition

            <input
              name="nom"
              type="text"
              value={form.nom}
              onChange={handleChange}
              placeholder="Ex. Coupe régionale Sud"
              required
            />
          </label>

          <div className="form-row">
            <label>
              Date

              <input
                name="date"
                type="date"
                value={form.date}
                onChange={handleChange}
              />
            </label>

            <label>
              Lieu

              <input
                name="lieu"
                type="text"
                value={form.lieu}
                onChange={handleChange}
                placeholder="Ex. Marseille"
              />
            </label>
          </div>

          <div className="form-row">
            <label>
              Type

              <select
                name="type"
                value={form.type}
                onChange={handleChange}
              >
                <option>Coupe régionale</option>
                <option>Coupe de France</option>
                <option>Championnat</option>
                <option>Compétition test</option>
                <option>Autre</option>
              </select>
            </label>

            <label>
              Saison

              <input
                name="saison"
                type="text"
                value={form.saison}
                onChange={handleChange}
                placeholder="2026-2027"
              />
            </label>
          </div>

          <button className="primary" type="submit">
            Créer la compétition
          </button>
        </form>
      )}

      {competitions.length === 0 ? (
        <div className="empty-state">
          <span className="empty-number">0</span>

          <h3>Aucune compétition</h3>

          <p>
            Créez votre première compétition pour commencer
            le test de l'application.
          </p>
        </div>
      ) : (
        <div className="managed-competitions">
          {competitions.map((competition) => (
            <article
              className="managed-competition"
              key={competition.id}
            >
              <div className="competition-main">
                <span className="status">
                  {competition.statut}
                </span>

                <h3>{competition.nom}</h3>

                <p>
                  {competition.type}
                  {competition.lieu
                    ? ` · ${competition.lieu}`
                    : ""}
                </p>

                <p className="competition-date">
                  {competition.date || "Date à définir"}
                  {" · "}
                  Saison {competition.saison}
                </p>
              </div>

              <div className="competition-stats">
                <div>
                  <strong>
                    {competition.competitors?.length || 0}                  </strong>
                  <span>Compétiteurs</span>
                </div>

                <div>
                  <strong>
                    {competition.categories?.length || 0}                  </strong>
                  <span>Catégories</span>
                </div>
              </div>

              <div className="competition-actions">
                <button
                  className="manage-button"
                  type="button"
                  onClick={() =>
  setSelectedCompetitionId(competition.id)
}                >
                  Gérer
                </button>

                <button
                  className="delete-button"
                  type="button"
                  onClick={() =>
                    deleteCompetition(competition.id)
                  }
                >
                  Supprimer
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="beta-note">
        <strong>Mode bêta</strong>

        <p>
          Les données sont enregistrées localement sur cet
          appareil. N'utilisez pas encore cette version comme
          sauvegarde officielle d'une compétition.
        </p>
      </div>
    </section>
  );
}

export default CompetitionManager;
