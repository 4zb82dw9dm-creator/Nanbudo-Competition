import { useRef, useState } from "react";
import CategoriesManager from "./CategoriesManager";
import PoolsManager from "./PoolsManager";
import ArbitrationManager from "./ArbitrationManager";
import ResultsManager from "./ResultsManager";
import PlanningManager from "./PlanningManager";
import ControlCenter from "./ControlCenter";
import LiveCompetitionManager from "./LiveCompetitionManager";
import SimulationManager from "./SimulationManager";
import CompetitionHealthManager from "./CompetitionHealthManager";
import {
  buildCompetitionTestCompetitors,
  COMPETITION_TEST_COMPETITORS,
} from "./competitionTestCompetitors";

const EMPTY_FORM = {
  nom: "",
  prenom: "",
  club: "",
  sexe: "Homme",
  dateNaissance: "",
  poids: "",
  grade: "",
  kata0: false,
  kata1: false,
  kata2: false,
  randori: false,
  juRandori1: false,
  juRandori2: false,
};

function CompetitionDashboard({
  competition,
  onBack,
  onUpdateCompetition,
}) {
  const [view, setView] = useState("dashboard");
  const [showForm, setShowForm] = useState(false);
  const [editingCompetitorId, setEditingCompetitorId] =
    useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const importFileRef = useRef(null);

  const competitors = competition.competitors || [];
  const categories = competition.categories || [];
  const pools = competition.pools || [];

  function resetForm() {
    setForm({ ...EMPTY_FORM });
    setEditingCompetitorId(null);
    setShowForm(false);
  }

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function calculateAge(dateNaissance) {
    if (!dateNaissance) return "";

    const birth = new Date(`${dateNaissance}T00:00:00`);

    if (Number.isNaN(birth.getTime())) {
      return "";
    }

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

  function normalizeText(value) {
    return String(value || "").trim().toLocaleLowerCase("fr");
  }

  function isSameCompetitor(
    competitor,
    candidate,
    ignoredId = null
  ) {
    if (
      ignoredId !== null &&
      String(competitor.id) === String(ignoredId)
    ) {
      return false;
    }

    const sameName =
      normalizeText(competitor.nom) ===
      normalizeText(candidate.nom);

    const sameFirstName =
      normalizeText(competitor.prenom) ===
      normalizeText(candidate.prenom);

    if (!sameName || !sameFirstName) {
      return false;
    }

    /*
      Si les deux dates de naissance sont renseignées,
      elles doivent aussi correspondre.

      Si une date manque, nom + prénom suffisent pour
      déclencher l'avertissement.
    */
    if (
      competitor.dateNaissance &&
      candidate.dateNaissance
    ) {
      return (
        competitor.dateNaissance ===
        candidate.dateNaissance
      );
    }

    return true;
  }

  function validateEvents(values) {
    const nombreKatas = [
      values.kata0,
      values.kata1,
      values.kata2,
    ].filter(Boolean).length;

    if (nombreKatas > 1) {
      alert(
        "Un compétiteur ne peut être inscrit que dans une seule catégorie Kata."
      );
      return false;
    }

    const nombreCombats = [
      values.randori,
      values.juRandori1,
      values.juRandori2,
    ].filter(Boolean).length;

    if (nombreCombats > 1) {
      alert(
        "Un compétiteur ne peut être inscrit que dans une seule catégorie de combat."
      );
      return false;
    }

    if (nombreKatas === 0 && nombreCombats === 0) {
      alert("Sélectionne au moins une épreuve.");
      return false;
    }

    return true;
  }

  function competitorIsInCategory(id) {
    return categories.some((category) =>
      (category.competitorIds || []).some(
        (competitorId) =>
          String(competitorId) === String(id)
      )
    );
  }

  function competitorIsInPool(id) {
    return pools.some((pool) => {
      const inPool = (pool.competitorIds || []).some(
        (competitorId) =>
          String(competitorId) === String(id)
      );

      const inMatches = (pool.matches || []).some(
        (match) =>
          String(match.akaId) === String(id) ||
          String(match.shiroId) === String(id) ||
          String(match.winnerId) === String(id)
      );

      const inPassages = (pool.passages || []).some(
        (passage) =>
          String(passage.competitorId) === String(id)
      );

      const inFinalMatches = (
        pool.finalMatches || []
      ).some(
        (match) =>
          String(match.akaId) === String(id) ||
          String(match.shiroId) === String(id) ||
          String(match.winnerId) === String(id)
      );

      const inFinalPassages = (
        pool.finalPassages || []
      ).some(
        (passage) =>
          String(passage.competitorId) === String(id)
      );

      const inRanking = (
        pool.rankingLocked || []
      ).some(
        (item) =>
          String(item.competitorId) === String(id)
      );

      const podium = pool.podium || {};

      const inPodium = [
        podium.firstId,
        podium.secondId,
        podium.thirdId,
        podium.fourthId,
      ].some(
        (competitorId) =>
          competitorId !== null &&
          competitorId !== undefined &&
          String(competitorId) === String(id)
      );

      return (
        inPool ||
        inMatches ||
        inPassages ||
        inFinalMatches ||
        inFinalPassages ||
        inRanking ||
        inPodium
      );
    });
  }

  function startAddCompetitor() {
    setEditingCompetitorId(null);
    setForm({ ...EMPTY_FORM });
    setShowForm(true);
  }

  function startEditCompetitor(competitor) {
    setEditingCompetitorId(competitor.id);

    setForm({
      nom: competitor.nom || "",
      prenom: competitor.prenom || "",
      club: competitor.club || "",
      sexe: competitor.sexe || "Homme",
      dateNaissance: competitor.dateNaissance || "",
      poids:
        competitor.poids === "" ||
        competitor.poids === undefined ||
        competitor.poids === null
          ? ""
          : String(competitor.poids),
      grade: competitor.grade || "",
      kata0: Boolean(competitor.epreuves?.kata0),
      kata1: Boolean(competitor.epreuves?.kata1),
      kata2: Boolean(competitor.epreuves?.kata2),
      randori: Boolean(
        competitor.epreuves?.randori
      ),
      juRandori1: Boolean(
        competitor.epreuves?.juRandori1
      ),
      juRandori2: Boolean(
        competitor.epreuves?.juRandori2
      ),
    });

    setShowForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function saveCompetitor(event) {
    event.preventDefault();

    const nom = form.nom.trim();
    const prenom = form.prenom.trim();

    if (!nom || !prenom) {
      alert("Le nom et le prénom sont obligatoires.");
      return;
    }

    if (!validateEvents(form)) {
      return;
    }

    const poids =
      form.poids === ""
        ? ""
        : Number(String(form.poids).replace(",", "."));

    if (
      poids !== "" &&
      (!Number.isFinite(poids) || poids <= 0)
    ) {
      alert("Le poids indiqué n'est pas valide.");
      return;
    }

    const candidate = {
      nom,
      prenom,
      dateNaissance: form.dateNaissance,
    };

    const duplicate = competitors.find((competitor) =>
      isSameCompetitor(
        competitor,
        candidate,
        editingCompetitorId
      )
    );

    if (duplicate) {
      alert(
        `Un compétiteur similaire existe déjà : ${duplicate.nom} ${duplicate.prenom}.`
      );
      return;
    }

    const competitorData = {
      nom: nom.toUpperCase(),
      prenom,
      club: form.club.trim(),
      sexe: form.sexe,
      dateNaissance: form.dateNaissance,
      age: calculateAge(form.dateNaissance),
      poids,
      grade: form.grade.trim(),

      epreuves: {
        kata0: form.kata0,
        kata1: form.kata1,
        kata2: form.kata2,
        randori: form.randori,
        juRandori1: form.juRandori1,
        juRandori2: form.juRandori2,
      },
    };

    if (editingCompetitorId !== null) {
      const existingCompetitor = competitors.find(
        (competitor) =>
          String(competitor.id) ===
          String(editingCompetitorId)
      );

      if (!existingCompetitor) {
        alert("Compétiteur introuvable.");
        resetForm();
        return;
      }

      /*
        IMPORTANT :
        l'ID existant est conservé.
        Les catégories, poules, matchs et résultats
        continuent donc de référencer la même personne.
      */
      const updatedCompetitors = competitors.map(
        (competitor) =>
          String(competitor.id) ===
          String(editingCompetitorId)
            ? {
                ...competitor,
                ...competitorData,
                id: competitor.id,
              }
            : competitor
      );

      onUpdateCompetition({
        ...competition,
        competitors: updatedCompetitors,
      });

      resetForm();
      return;
    }

    const competitor = {
      id: Date.now(),
      ...competitorData,
    };

    onUpdateCompetition({
      ...competition,
      competitors: [...competitors, competitor],
    });

    resetForm();
  }

  function deleteCompetitor(id) {
    if (competitorIsInPool(id)) {
      alert(
        "Suppression impossible : ce compétiteur est déjà utilisé dans une poule, un match, un passage, un classement ou un résultat."
      );
      return;
    }

    if (competitorIsInCategory(id)) {
      alert(
        "Suppression impossible : ce compétiteur appartient déjà à une catégorie. Supprime ou modifie d'abord la catégorie concernée."
      );
      return;
    }

    const confirmed = window.confirm(
      "Supprimer ce compétiteur ?"
    );

    if (!confirmed) return;

    onUpdateCompetition({
      ...competition,
      competitors: competitors.filter(
        (competitor) =>
          String(competitor.id) !== String(id)
      ),
    });

    if (
      editingCompetitorId !== null &&
      String(editingCompetitorId) === String(id)
    ) {
      resetForm();
    }
  }

  function handleImportFile(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".csv")) {
      alert("Sélectionne un fichier CSV.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const content = String(reader.result || "");

      const lines = content
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line !== "");

      if (lines.length < 2) {
        alert(
          "Le fichier CSV ne contient aucun compétiteur."
        );
        return;
      }

      const dataLines = lines.slice(1);
      const importedCompetitors = [];
      const errors = [];

      dataLines.forEach((line, index) => {
        const columns = line
          .split(";")
          .map((value) => value.trim());

        if (columns.length !== 13) {
          errors.push(
            `Ligne ${index + 2} : 13 colonnes attendues.`
          );
          return;
        }

        const [
          nom,
          prenom,
          club,
          sexe,
          dateNaissance,
          poids,
          grade,
          kata0,
          kata1,
          kata2,
          randori,
          juRandori1,
          juRandori2,
        ] = columns;

        if (!nom || !prenom) {
          errors.push(
            `Ligne ${index + 2} : nom ou prénom manquant.`
          );
          return;
        }

        const epreuves = {
          kata0: kata0 === "1",
          kata1: kata1 === "1",
          kata2: kata2 === "1",
          randori: randori === "1",
          juRandori1: juRandori1 === "1",
          juRandori2: juRandori2 === "1",
        };

        const nombreKatas = [
          epreuves.kata0,
          epreuves.kata1,
          epreuves.kata2,
        ].filter(Boolean).length;

        if (nombreKatas > 1) {
          errors.push(
            `Ligne ${index + 2} : plusieurs catégories Kata sélectionnées.`
          );
          return;
        }

        const nombreCombats = [
          epreuves.randori,
          epreuves.juRandori1,
          epreuves.juRandori2,
        ].filter(Boolean).length;

        if (nombreCombats > 1) {
          errors.push(
            `Ligne ${index + 2} : plusieurs catégories de combat sélectionnées.`
          );
          return;
        }

        if (nombreKatas === 0 && nombreCombats === 0) {
          errors.push(
            `Ligne ${index + 2} : aucune épreuve sélectionnée.`
          );
          return;
        }

        const parsedWeight = poids
          ? Number(poids.replace(",", "."))
          : "";

        if (
          parsedWeight !== "" &&
          (!Number.isFinite(parsedWeight) ||
            parsedWeight <= 0)
        ) {
          errors.push(
            `Ligne ${index + 2} : poids invalide.`
          );
          return;
        }

        const candidate = {
          nom,
          prenom,
          dateNaissance,
        };

        const duplicateExisting = competitors.some(
          (competitor) =>
            isSameCompetitor(
              competitor,
              candidate
            )
        );

        const duplicateImport =
          importedCompetitors.some((competitor) =>
            isSameCompetitor(
              competitor,
              candidate
            )
          );

        if (duplicateExisting || duplicateImport) {
          errors.push(
            `Ligne ${index + 2} : doublon détecté pour ${nom} ${prenom}.`
          );
          return;
        }

        importedCompetitors.push({
          id: `${Date.now()}-import-${index}`,
          nom: nom.toUpperCase(),
          prenom,
          club,
          sexe: sexe || "Homme",
          dateNaissance,
          age: calculateAge(dateNaissance),
          poids: parsedWeight,
          grade,
          epreuves,
          imported: true,
        });
      });

      if (errors.length > 0) {
        alert(
          `Import annulé.\n\n${errors.length} erreur(s) détectée(s) :\n\n${errors.join(
            "\n"
          )}`
        );
        return;
      }

      onUpdateCompetition({
        ...competition,
        competitors: [
          ...competitors,
          ...importedCompetitors,
        ],
      });

      alert(
        `${importedCompetitors.length} compétiteur(s) importé(s) avec succès.`
      );
    };

    reader.onerror = () => {
      alert("Impossible de lire le fichier.");
    };

    reader.readAsText(file, "UTF-8");

    event.target.value = "";
  }

  function loadTestCompetitors() {
    if (competitors.length > 0) {
      const confirmed = window.confirm(
        "Des compétiteurs sont déjà enregistrés. Ajouter quand même les données test ?"
      );

      if (!confirmed) return;
    }

    const currentYear = new Date().getFullYear();

    const testCompetitors =
      buildCompetitionTestCompetitors(currentYear);

    onUpdateCompetition({
      ...competition,
      competitors: [
        ...competitors,
        ...testCompetitors,
      ],
    });

    alert(
      `${COMPETITION_TEST_COMPETITORS.length} compétiteurs test ont été ajoutés.`
    );
  }

  function deleteTestCompetitors() {
    const testCompetitors = competitors.filter(
      (competitor) => competitor.testData
    );

    if (testCompetitors.length === 0) {
      alert("Aucune donnée test à supprimer.");
      return;
    }

    const protectedTestCompetitors =
      testCompetitors.filter(
        (competitor) =>
          competitorIsInCategory(competitor.id) ||
          competitorIsInPool(competitor.id)
      );

    if (protectedTestCompetitors.length > 0) {
      alert(
        `Suppression impossible : ${protectedTestCompetitors.length} compétiteur(s) test sont utilisés dans une catégorie ou une poule.`
      );
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
  }

  return (
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
          className={view === "control" ? "active" : ""}
          onClick={() => setView("control")}
        >
          Centre de contrôle
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
          className={view === "planning" ? "active" : ""}
          onClick={() => setView("planning")}
        >
          Planning
        </button>

        <button
          className={view === "live" ? "active" : ""}
          onClick={() => setView("live")}
        >
          Compétition Live
        </button>

        <button
          className={view === "results" ? "active" : ""}
          onClick={() => setView("results")}
        >
          Résultats
        </button>

        <button
          className={view === "simulation" ? "active" : ""}
          onClick={() => setView("simulation")}
        >
          Simulation
        </button>

        <button
          className={view === "health" ? "active" : ""}
          onClick={() => setView("health")}
        >
          Santé
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
                {categories.length}
              </span>

              <h3>Catégories</h3>
              <p>Catégories préparées</p>
            </div>

            <div className="card">
              <span className="number">
                {pools.reduce(
                  (total, pool) =>
                    total +
                    (pool.matches?.length || 0),
                  0
                )}
              </span>

              <h3>Combats</h3>
              <p>Rencontres générées</p>
            </div>
          </div>

          <div className="beta-note">
            <strong>Compétition en préparation</strong>

            <p>
              Enregistre les compétiteurs, prépare les
              catégories puis génère les poules.
            </p>
          </div>
        </div>
      )}

      {view === "control" && (
        <ControlCenter competition={competition} />
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
              <input
                ref={importFileRef}
                type="file"
                accept=".csv"
                onChange={handleImportFile}
                style={{ display: "none" }}
              />

              <button
                className="manage-button"
                type="button"
                onClick={() =>
                  importFileRef.current?.click()
                }
              >
                Importer des compétiteurs
              </button>

              <button
                className="primary"
                type="button"
                onClick={() => {
                  if (showForm) {
                    resetForm();
                  } else {
                    startAddCompetitor();
                  }
                }}
              >
                {showForm
                  ? "Annuler"
                  : "+ Ajouter un compétiteur"}
              </button>
            </div>
          </div>

          <div className="test-tools">
            <button
              className="manage-button"
              type="button"
              onClick={loadTestCompetitors}
            >
              Charger {COMPETITION_TEST_COMPETITORS.length} compétiteurs test
            </button>

            <button
              className="delete-button"
              type="button"
              onClick={deleteTestCompetitors}
            >
              Effacer les données test
            </button>
          </div>

          {showForm && (
            <form
              className="competition-form"
              onSubmit={saveCompetitor}
            >
              <h3>
                {editingCompetitorId !== null
                  ? "Modifier le compétiteur"
                  : "Inscription d'un compétiteur"}
              </h3>

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
                    min="0.1"
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
                    name="kata0"
                    type="checkbox"
                    checked={form.kata0}
                    onChange={handleChange}
                    disabled={form.kata1 || form.kata2}
                  />
                  Kata 0
                </label>

                <label>
                  <input
                    name="kata1"
                    type="checkbox"
                    checked={form.kata1}
                    onChange={handleChange}
                    disabled={form.kata0 || form.kata2}
                  />
                  Kata 1
                </label>

                <label>
                  <input
                    name="kata2"
                    type="checkbox"
                    checked={form.kata2}
                    onChange={handleChange}
                    disabled={form.kata0 || form.kata1}
                  />
                  Kata 2
                </label>

                <label>
                  <input
                    name="randori"
                    type="checkbox"
                    checked={form.randori}
                    onChange={handleChange}
                    disabled={
                      form.juRandori1 ||
                      form.juRandori2
                    }
                  />
                  Randori
                </label>

                <label>
                  <input
                    name="juRandori1"
                    type="checkbox"
                    checked={form.juRandori1}
                    onChange={handleChange}
                    disabled={
                      form.randori ||
                      form.juRandori2
                    }
                  />
                  Ju Randori 1
                </label>

                <label>
                  <input
                    name="juRandori2"
                    type="checkbox"
                    checked={form.juRandori2}
                    onChange={handleChange}
                    disabled={
                      form.randori ||
                      form.juRandori1
                    }
                  />
                  Ju Randori 2
                </label>
              </fieldset>

              <div className="competition-actions">
                <button
                  className="primary"
                  type="submit"
                >
                  {editingCompetitorId !== null
                    ? "Enregistrer les modifications"
                    : "Enregistrer le compétiteur"}
                </button>

                {editingCompetitorId !== null && (
                  <button
                    className="manage-button"
                    type="button"
                    onClick={resetForm}
                  >
                    Annuler la modification
                  </button>
                )}
              </div>
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
              {competitors.map((competitor) => {
                const protectedCompetitor =
                  competitorIsInCategory(competitor.id) ||
                  competitorIsInPool(competitor.id);

                return (
                  <article
                    className="competitor-card"
                    key={competitor.id}
                  >
                    <div>
                      <h3>
                        {competitor.nom}{" "}
                        {competitor.prenom}
                      </h3>

                      <p>
                        {competitor.club ||
                          "Club non renseigné"}
                      </p>
                    </div>

                    <div className="competitor-details">
                      <span>{competitor.sexe}</span>

                      {competitor.age !== "" &&
                        competitor.age !== undefined && (
                          <span>
                            {competitor.age} ans
                          </span>
                        )}

                      {competitor.poids !== "" &&
                        competitor.poids !== undefined && (
                          <span>
                            {competitor.poids} kg
                          </span>
                        )}

                      {competitor.grade && (
                        <span>{competitor.grade}</span>
                      )}
                    </div>

                    <div className="competitor-events">
                      {competitor.epreuves?.kata0 && (
                        <span>Kata 0</span>
                      )}

                      {competitor.epreuves?.kata1 && (
                        <span>Kata 1</span>
                      )}

                      {competitor.epreuves?.kata2 && (
                        <span>Kata 2</span>
                      )}

                      {competitor.epreuves?.randori && (
                        <span>Randori</span>
                      )}

                      {competitor.epreuves?.juRandori1 && (
                        <span>Ju Randori 1</span>
                      )}

                      {competitor.epreuves?.juRandori2 && (
                        <span>Ju Randori 2</span>
                      )}
                    </div>

                    {protectedCompetitor && (
                      <p className="info">
                        Utilisé dans l'organisation de la
                        compétition : suppression protégée.
                      </p>
                    )}

                    <div className="competition-actions">
                      <button
                        className="manage-button"
                        type="button"
                        onClick={() =>
                          startEditCompetitor(competitor)
                        }
                      >
                        Modifier
                      </button>

                      <button
                        className="delete-button"
                        type="button"
                        onClick={() =>
                          deleteCompetitor(competitor.id)
                        }
                      >
                        Supprimer
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {view === "categories" && (
        <CategoriesManager
          competition={competition}
          onUpdateCompetition={onUpdateCompetition}
        />
      )}

      {view === "poules" && (
        <PoolsManager
          competition={competition}
          onUpdateCompetition={onUpdateCompetition}
        />
      )}

      {view === "arbitrage" && (
        <ArbitrationManager
          competition={competition}
          onUpdateCompetition={onUpdateCompetition}
        />
      )}

      {view === "planning" && (
        <PlanningManager competition={competition} />
      )}

      {view === "live" && (
        <LiveCompetitionManager
          competition={competition}
          onUpdateCompetition={onUpdateCompetition}
        />
      )}

      {view === "results" && (
        <ResultsManager competition={competition} />
      )}

      {view === "simulation" && (
        <SimulationManager competition={competition} />
      )}

      {view === "health" && (
        <CompetitionHealthManager
          competition={competition}
          onUpdateCompetition={onUpdateCompetition}
        />
      )}
    </section>
  );
}

export default CompetitionDashboard;
