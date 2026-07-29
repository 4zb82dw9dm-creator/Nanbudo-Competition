import { useEffect, useRef, useState } from "react";
import CompetitionDashboard from "./CompetitionDashboard";
import {
  BACKUP_KINDS,
  COMPETITIONS_STORAGE_KEY,
  buildBackup,
  cloneForStorage,
  createBackupFilename,
  downloadJsonFile,
  parseBackupFileContent,
} from "./backupUtils";
function CompetitionManager() {
  const importFileRef = useRef(null);
  const [competitions, setCompetitions] = useState(() => {
    try {
      const saved = localStorage.getItem(COMPETITIONS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [showForm, setShowForm] = useState(false);
  const importCompetitionRef = useRef(null);
  const importAllRef = useRef(null);
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
      COMPETITIONS_STORAGE_KEY,
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

  function importCompetition(importedCompetition) {
    setCompetitions((current) => {
      const conflictIndex = current.findIndex(
        (competition) =>
          String(competition.id) === String(importedCompetition.id)
      );

      if (conflictIndex === -1) {
        return [...current, importedCompetition];
      }

      const confirmed = window.confirm(
        "Une compétition avec le même identifiant existe déjà. La remplacer ?"
      );

      if (!confirmed) {
        alert("Import annulé.");
        return current;
      }

      return current.map((competition, index) =>
        index === conflictIndex ? importedCompetition : competition
      );
    });
  }

  function handleImportFile(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const importedCompetition = JSON.parse(reader.result);

        if (!importedCompetition?.id) {
          alert("Import impossible : identifiant de compétition manquant.");
          return;
        }

        importCompetition(importedCompetition);
      } catch {
        alert("Import impossible : fichier invalide.");
      } finally {
        event.target.value = "";
      }
    };

    reader.readAsText(file);
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


  function exportCompetition(competition) {
    const backup = buildBackup(BACKUP_KINDS.singleCompetition, {
      competition: cloneForStorage(competition),
    });

    downloadJsonFile(
      backup,
      createBackupFilename("competition", competition)
    );
  }

  function exportAllCompetitions() {
    if (competitions.length === 0) {
      alert("Aucune compétition à sauvegarder.");
      return;
    }

    const backup = buildBackup(BACKUP_KINDS.allCompetitions, {
      competitions: cloneForStorage(competitions),
    });

    downloadJsonFile(
      backup,
      createBackupFilename("toutes-les-competitions")
    );
  }

  function importCompetitionBackup(file) {
    const reader = new FileReader();

    reader.onload = () => {
      try {
        const backup = parseBackupFileContent(String(reader.result || ""));

        if (backup.kind !== BACKUP_KINDS.singleCompetition) {
          alert("Ce fichier n'est pas une sauvegarde d'une compétition seule.");
          return;
        }

        const importedCompetition = cloneForStorage(
          backup.data.competition
        );
        const conflictingCompetition = competitions.find(
          (competition) =>
            String(competition.id) === String(importedCompetition.id)
        );

        if (conflictingCompetition) {
          const replace = window.confirm(
            `Une compétition avec le même identifiant existe déjà : ${conflictingCompetition.nom}.\n\nOK : remplacer cette compétition.\nAnnuler : annuler totalement l'import.`
          );

          if (!replace) {
            alert("Import annulé. Aucune donnée existante n'a été modifiée.");
            return;
          }

          setCompetitions((current) =>
            current.map((competition) =>
              String(competition.id) === String(importedCompetition.id)
                ? importedCompetition
                : competition
            )
          );
          alert("Compétition restaurée en remplaçant l'ancienne version.");
          return;
        }

        setCompetitions((current) => [...current, importedCompetition]);
        alert("Compétition restaurée avec succès.");
      } catch (error) {
        alert(`Import refusé : ${error.message}`);
      }
    };

    reader.onerror = () => {
      alert("Impossible de lire le fichier de sauvegarde.");
    };

    reader.readAsText(file, "UTF-8");
  }

  function importAllCompetitionsBackup(file) {
    const reader = new FileReader();

    reader.onload = () => {
      try {
        const backup = parseBackupFileContent(String(reader.result || ""));

        if (backup.kind !== BACKUP_KINDS.allCompetitions) {
          alert("Ce fichier n'est pas une sauvegarde complète.");
          return;
        }

        const importedCompetitions = cloneForStorage(
          backup.data.competitions
        );
        const confirmed = window.confirm(
          `Restaurer cette sauvegarde complète de ${importedCompetitions.length} compétition(s) ?\n\nLes compétitions actuellement présentes seront remplacées uniquement après cette confirmation.`
        );

        if (!confirmed) return;

        setCompetitions(importedCompetitions);
        setSelectedCompetitionId(null);
        alert("Sauvegarde complète restaurée avec succès.");
      } catch (error) {
        alert(`Restauration refusée : ${error.message}`);
      }
    };

    reader.onerror = () => {
      alert("Impossible de lire le fichier de sauvegarde.");
    };

    reader.readAsText(file, "UTF-8");
  }

  function handleBackupFile(event, importer) {
    const file = event.target.files?.[0];

    if (!file) return;

    importer(file);
    event.target.value = "";
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

        <input
          ref={importFileRef}
          type="file"
          accept="application/json,.json"
          onChange={handleImportFile}
          hidden
        />

        <button
          className="secondary"
          type="button"
          onClick={() => importFileRef.current?.click()}
        >
          Importer une compétition
        </button>
      </div>

      <section className="backup-panel" aria-labelledby="backup-title">
        <div>
          <p className="surtitle">SAUVEGARDE</p>
          <h3 id="backup-title">Sauvegarde et restauration</h3>
          <p>
            Exportez les données locales avant une compétition ou
            restaurez une sauvegarde JSON Nanbudo Competition.
          </p>
        </div>

        <div className="backup-actions">
          <input
            ref={importCompetitionRef}
            type="file"
            accept="application/json,.json"
            onChange={(event) =>
              handleBackupFile(event, importCompetitionBackup)
            }
            style={{ display: "none" }}
          />
          <input
            ref={importAllRef}
            type="file"
            accept="application/json,.json"
            onChange={(event) =>
              handleBackupFile(event, importAllCompetitionsBackup)
            }
            style={{ display: "none" }}
          />

          <button
            className="manage-button"
            type="button"
            onClick={() => importCompetitionRef.current?.click()}
          >
            Restaurer une compétition
          </button>

          <button
            className="manage-button"
            type="button"
            onClick={exportAllCompetitions}
          >
            Sauvegarder toutes les compétitions
          </button>

          <button
            className="delete-button"
            type="button"
            onClick={() => importAllRef.current?.click()}
          >
            Restaurer une sauvegarde complète
          </button>
        </div>
      </section>

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
                    {competition.competitors.length}
                  </strong>
                  <span>Compétiteurs</span>
                </div>

                <div>
                  <strong>
                    {competition.categories.length}
                  </strong>
                  <span>Catégories</span>
                </div>
              </div>

              <div className="competition-actions">
                <button
                  className="manage-button"
                  type="button"
                  onClick={() => exportCompetition(competition)}
                >
                  Sauvegarder
                </button>

                <button
                  className="manage-button"
                  type="button"
                  onClick={() =>
                    setSelectedCompetitionId(competition.id)
                  }
                >
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
