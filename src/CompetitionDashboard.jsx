import { useState } from "react";
import CategoriesManager from "./CategoriesManager";
import PoolsManager from "./PoolsManager";
import ArbitrationManager from "./ArbitrationManager";
import ResultsManager from "./ResultsManager";function CompetitionDashboard({

  competition,
  onBack,
  onUpdateCompetition,
}) {  const [view, setView] = useState("dashboard");
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    nom: "",
    prenom: "",
    club: "",
    sexe: "Homme",
    dateNaissance: "",
    poids: "",
    grade: "",
    kata: true,
randori: false,
juRandori1: false,
juRandori2: false,  });

  const competitors = competition.competitors || [];

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function calculateAge(dateNaissance) {
    if (!dateNaissance) return "";

    const birth = new Date(dateNaissance);
    const today = new Date();

    let age = today.getFullYear() - birth.getFullYear();

    const monthDifference =
      today.getMonth() - birth.getMonth();

    if (
      monthDifference < 0 ||
      (monthDifference === 0 &&
        today.getDate() < birth.getDate())
    ) {
      age--;
    }

    return age;
  }

  function addCompetitor(event) {
    event.preventDefault();

    if (!form.nom.trim() || !form.prenom.trim()) {
      alert("Le nom et le prénom sont obligatoires.");
      return;
    }

    if (
  !form.kata &&
  !form.randori &&
  !form.juRandori1 &&
  !form.juRandori2
) {
  alert("Sélectionne au moins une épreuve.");
  return;
}
    const competitor = {
      id: Date.now(),
      nom: form.nom.trim().toUpperCase(),
      prenom: form.prenom.trim(),
      club: form.club.trim(),
      sexe: form.sexe,
      dateNaissance: form.dateNaissance,
      age: calculateAge(form.dateNaissance),
      poids: form.poids ? Number(form.poids) : "",
      grade: form.grade.trim(),
      epreuves: {
  kata: form.kata,
  randori: form.randori,
  juRandori1: form.juRandori1,
  juRandori2: form.juRandori2,
},    };

    onUpdateCompetition({
      ...competition,
      competitors: [...competitors, competitor],
    });

    setForm({
      nom: "",
      prenom: "",
      club: "",
      sexe: "Homme",
      dateNaissance: "",
      poids: "",
      grade: "",
      kata: true,
      juRandori: true,
    });

    setShowForm(false);
  }

  function deleteCompetitor(id) {
    const confirmed = window.confirm(
      "Supprimer ce compétiteur ?"
    );

    if (!confirmed) return;

    onUpdateCompetition({
      ...competition,
      competitors: competitors.filter(
        (competitor) => competitor.id !== id
      ),
    });
  }
function loadTestCompetitors() {
  if (competitors.length > 0) {
    const confirmed = window.confirm(
      "Des compétiteurs sont déjà enregistrés. Ajouter quand même les données test ?"
    );

    if (!confirmed) return;
  }

  const currentYear = new Date().getFullYear();

  const testData = [
    ["MARTIN", "Lucas", "Marseille", "Homme", 17, 63, "1er Kyu", true, true],
    ["BERNARD", "Hugo", "Lyon", "Homme", 18, 67, "1er Dan", true, true],
    ["ROBERT", "Enzo", "Paris", "Homme", 17, 65, "2e Kyu", false, true],

    ["DUBOIS", "Emma", "Marseille", "Femme", 17, 54, "1er Kyu", true, true],
    ["THOMAS", "Léa", "Toulouse", "Femme", 18, 57, "1er Dan", true, true],
    ["PETIT", "Chloé", "Lyon", "Femme", 17, 52, "2e Kyu", true, false],

    ["DURAND", "Thomas", "Marseille", "Homme", 25, 68, "1er Dan", true, true],
    ["LEROY", "Nicolas", "Paris", "Homme", 29, 71, "2e Dan", false, true],
    ["MOREAU", "Julien", "Lyon", "Homme", 31, 69, "1er Dan", true, true],
    ["SIMON", "Alexandre", "Toulouse", "Homme", 27, 82, "2e Dan", false, true],
    ["LAURENT", "Maxime", "Bordeaux", "Homme", 34, 85, "3e Dan", true, true],
    ["MICHEL", "Romain", "Marseille", "Homme", 30, 80, "1er Dan", false, true],

    ["GARCIA", "Camille", "Paris", "Femme", 24, 55, "1er Dan", true, true],
    ["DAVID", "Manon", "Marseille", "Femme", 28, 58, "2e Dan", true, true],
    ["BERTRAND", "Julie", "Lyon", "Femme", 32, 56, "1er Dan", false, true],
    ["ROUX", "Clara", "Toulouse", "Femme", 26, 66, "1er Dan", true, true],
    ["VINCENT", "Sarah", "Bordeaux", "Femme", 30, 64, "2e Dan", false, true],
    ["FOURNIER", "Alice", "Marseille", "Femme", 29, 67, "1er Dan", true, false],

    ["GIRARD", "Philippe", "Paris", "Homme", 44, 78, "2e Dan", true, true],
    ["ANDRE", "Laurent", "Marseille", "Homme", 48, 81, "3e Dan", true, true],
    ["MERCIER", "Stéphane", "Lyon", "Homme", 52, 83, "2e Dan", false, true],

    ["BONNET", "Sophie", "Marseille", "Femme", 43, 60, "2e Dan", true, true],
    ["FRANCOIS", "Nathalie", "Paris", "Femme", 49, 63, "3e Dan", true, true],
    ["MARTINEZ", "Isabelle", "Toulouse", "Femme", 51, 61, "2e Dan", true, false],
  ];

  const testCompetitors = testData.map(
    (
      [
        nom,
        prenom,
        club,
        sexe,
        age,
        poids,
        grade,
        kata,
        juRandori,
      ],
      index
    ) => ({
      id: Date.now() + index,
      nom,
      prenom,
      club,
      sexe,

      // Date fictive permettant de conserver
      // la structure actuelle de l'application.
      dateNaissance: `${currentYear - age}-01-01`,

      age,
      poids,
      grade,

      epreuves: {
        kata,
        juRandori,
      },

      testData: true,
    })
  );

  onUpdateCompetition({
    ...competition,
    competitors: [
      ...competitors,
      ...testCompetitors,
    ],
  });

  alert("24 compétiteurs test ont été ajoutés.");
}

function deleteTestCompetitors() {
  const testCompetitors = competitors.filter(
    (competitor) => competitor.testData
  );

  if (testCompetitors.length === 0) {
    alert("Aucune donnée test à supprimer.");
    return;
  }

  const confirmed = window.confirm(
    `Supprimer les ${testCompetitors.length} compétiteurs test ?`
  );

  if (!confirmed) return;

  onUpdateCompetition({
    ...competition,
    competitors: competitors.filter(
      (competitor) => !competitor.testData
    ),
  });
}  return (
    <section className="competition-dashboard">
      <button
        className="back-button"
        type="button"
        onClick={onBack}
      >
        ← Retour aux compétitions
      </button>

      <div className="competition-dashboard-header">
        <div>
          <p className="surtitle">BÊTA 0.1</p>

          <h2>{competition.nom}</h2>

          <p>
            {competition.lieu || "Lieu à définir"}
            {" · "}
            {competition.date || "Date à définir"}
          </p>
        </div>

        <span className="status">
          {competition.statut}
        </span>
      </div>

      <nav className="competition-menu">
        <button
          className={view === "dashboard" ? "active" : ""}
          onClick={() => setView("dashboard")}
        >
          Tableau de bord
        </button>

        <button
          className={view === "competitors" ? "active" : ""}
          onClick={() => setView("competitors")}
        >
          Compétiteurs
        </button>

        <button
          className={view === "categories" ? "active" : ""}
          onClick={() => setView("categories")}
        >
          Catégories
        </button>

        <button
          className={view === "poules" ? "active" : ""}
          onClick={() => setView("poules")}
        >
          Poules
        </button>

        <button
          className={view === "arbitrage" ? "active" : ""}
          onClick={() => setView("arbitrage")}
        >
          Arbitrage
        </button>

        <button
          className={view === "results" ? "active" : ""}
          onClick={() => setView("results")}
        >
          Résultats
        </button>
      </nav>

      {view === "dashboard" && (
        <div className="competition-dashboard-content">
          <div className="dashboard">
            <div className="card">
              <span className="number">
                {competitors.length}
              </span>

              <h3>Compétiteurs</h3>

              <p>Participants enregistrés</p>
            </div>

            <div className="card">
              <span className="number">
                {competition.categories?.length || 0}
              </span>

              <h3>Catégories</h3>

              <p>Catégories préparées</p>
            </div>

            <div className="card">
              <span className="number">0</span>

              <h3>Combats</h3>

              <p>Rencontres enregistrées</p>
            </div>
          </div>

          <div className="beta-note">
            <strong>Compétition en préparation</strong>

            <p>
              Commence par enregistrer les compétiteurs.
              Les catégories et les poules seront générées
              dans les prochaines étapes.
            </p>
          </div>
        </div>
      )}

      {view === "competitors" && (
        <div className="competitors-module">
          <div className="manager-header">
            <div>
              <p className="surtitle">INSCRIPTIONS</p>
              <h2>Compétiteurs</h2>

              <p>
                {competitors.length} compétiteur
                {competitors.length > 1 ? "s" : ""} enregistré
                {competitors.length > 1 ? "s" : ""}
              </p>
            </div>

            <div className="competitor-actions">
  <button
    className="manage-button"
    type="button"
  >
    Importer des compétiteurs
  </button>

  <button
    className="primary"
    type="button"
    onClick={() =>
      setShowForm((current) => !current)
    }
  >
    {showForm
      ? "Annuler"
      : "+ Ajouter un compétiteur"}
  </button>
</div>          </div>
<div className="test-tools">
  <button
    className="manage-button"
    type="button"
    onClick={loadTestCompetitors}
  >
    Charger 24 compétiteurs test
  </button>

  <button
    className="delete-button"
    type="button"
    onClick={deleteTestCompetitors}
  >
    Effacer les données test
  </button>
</div>          {showForm && (
            <form
              className="competition-form"
              onSubmit={addCompetitor}
            >
              <h3>Inscription d'un compétiteur</h3>

              <div className="form-row">
                <label>
                  Nom

                  <input
                    name="nom"
                    value={form.nom}
                    onChange={handleChange}
                    placeholder="DUPONT"
                    required
                  />
                </label>

                <label>
                  Prénom

                  <input
                    name="prenom"
                    value={form.prenom}
                    onChange={handleChange}
                    placeholder="Jean"
                    required
                  />
                </label>
              </div>

              <label>
                Club

                <input
                  name="club"
                  value={form.club}
                  onChange={handleChange}
                  placeholder="Nom du club"
                />
              </label>

              <div className="form-row">
                <label>
                  Sexe

                  <select
                    name="sexe"
                    value={form.sexe}
                    onChange={handleChange}
                  >
                    <option>Homme</option>
                    <option>Femme</option>
                  </select>
                </label>

                <label>
                  Date de naissance

                  <input
                    name="dateNaissance"
                    type="date"
                    value={form.dateNaissance}
                    onChange={handleChange}
                  />
                </label>
              </div>

              <div className="form-row">
                <label>
                  Poids (kg)

                  <input
                    name="poids"
                    type="number"
                    min="0"
                    step="0.1"
                    value={form.poids}
                    onChange={handleChange}
                    placeholder="70"
                  />
                </label>

                <label>
                  Grade

                  <input
                    name="grade"
                    value={form.grade}
                    onChange={handleChange}
                    placeholder="Ex. 1er Kyu"
                  />
                </label>
              </div>

              <fieldset className="event-selection">
                <legend>Épreuves</legend>

                <label>
                  <input
                    name="kata"
                    type="checkbox"
                    checked={form.kata}
                    onChange={handleChange}
                  />

                  Kata individuel
                </label>

                <label>
                  <input
                    name="juRandori"
                    type="checkbox"
                    checked={form.juRandori}
                    onChange={handleChange}
                  />

                  Ju Randori individuel
                </label>
              </fieldset>

              <button
                className="primary"
                type="submit"
              >
                Enregistrer le compétiteur
              </button>
            </form>
          )}

          {competitors.length === 0 ? (
            <div className="empty-state">
              <span className="empty-number">0</span>

              <h3>Aucun compétiteur</h3>

              <p>
                Ajoute quelques compétiteurs pour commencer
                le test.
              </p>
            </div>
          ) : (
            <div className="competitor-list">
              {competitors.map((competitor) => (
                <article
                  className="competitor-card"
                  key={competitor.id}
                >
                  <div>
                    <h3>
                      {competitor.nom} {competitor.prenom}
                    </h3>

                    <p>
                      {competitor.club || "Club non renseigné"}
                    </p>
                  </div>

                  <div className="competitor-details">
                    <span>{competitor.sexe}</span>

                    {competitor.age !== "" && (
                      <span>{competitor.age} ans</span>
                    )}

                    {competitor.poids !== "" && (
                      <span>{competitor.poids} kg</span>
                    )}

                    {competitor.grade && (
                      <span>{competitor.grade}</span>
                    )}
                  </div>

                  <div className="competitor-events">
                    {competitor.epreuves.kata && (
                      <span>Kata</span>
                    )}

                    {competitor.epreuves.juRandori && (
                      <span>Ju Randori</span>
                    )}
                  </div>

                  <button
                    className="delete-button"
                    type="button"
                    onClick={() =>
                      deleteCompetitor(competitor.id)
                    }
                  >
                    Supprimer
                  </button>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {view === "categories" && (
  <CategoriesManager
  competition={competition}
  onUpdateCompetition={onUpdateCompetition}
/>)}
      {view === "poules" && (
  <PoolsManager
    competition={competition}
    onUpdateCompetition={onUpdateCompetition}
  />
)}      {view === "arbitrage" && (
  <ArbitrationManager
    competition={competition}
    onUpdateCompetition={onUpdateCompetition}
  />
)}
           {view === "results" && (
        <ResultsManager
          competition={competition}
        />
      )}
    </section>
  );
}

export default CompetitionDashboard;
