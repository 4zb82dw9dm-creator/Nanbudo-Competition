import { useMemo, useRef, useState } from "react";
import {
  BACKUP_FORMAT_TYPE,
  BACKUP_FORMAT_VERSION,
  COMPETITIONS_STORAGE_KEY,
  createBackupFilename,
  downloadJsonFile,
} from "./backupUtils";
import { COMPETITORS_STORAGE_KEY } from "./CompetitorManager";

const REGISTRATIONS_STORAGE_KEY = "nanbudo-online-registrations-v2";
const MAINTENANCE_BACKUP_KIND = "full-application";
const NANBUDO_KEY_PREFIXES = ["nanbudo", "Nanbudo"];

function waitForAsyncTurn() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function readJsonFromStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJsonToStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function isTestText(value) {
  return /test/i.test(String(value || ""));
}

function isTestCompetitor(competitor) {
  return competitor?.isTest === true || isTestText(competitor?.nom) || isTestText(competitor?.prenom);
}

function isTestCompetition(competition) {
  return competition?.isTest === true || isTestText(competition?.nom) || isTestText(competition?.lieu) || isTestText(competition?.description);
}

function getNanbudoStorageKeys() {
  return Object.keys(localStorage).filter((key) => NANBUDO_KEY_PREFIXES.some((prefix) => key.startsWith(prefix)));
}

async function deleteIndexedDatabases() {
  if (!window.indexedDB?.databases) return [];
  const databases = await window.indexedDB.databases();
  const names = databases.map((database) => database.name).filter(Boolean);

  await Promise.all(
    names.map(
      (name) =>
        new Promise((resolve) => {
          const request = window.indexedDB.deleteDatabase(name);
          request.onsuccess = resolve;
          request.onerror = resolve;
          request.onblocked = resolve;
        }),
    ),
  );

  return names;
}

function buildFullBackup() {
  const localStorageData = Object.fromEntries(getNanbudoStorageKeys().map((key) => [key, readJsonFromStorage(key, localStorage.getItem(key))]));

  return {
    type: BACKUP_FORMAT_TYPE,
    version: BACKUP_FORMAT_VERSION,
    kind: MAINTENANCE_BACKUP_KIND,
    createdAt: new Date().toISOString(),
    app: "Nanbudo Competition",
    data: {
      localStorage: localStorageData,
    },
  };
}

function validateFullBackup(backup) {
  if (!backup || typeof backup !== "object" || Array.isArray(backup)) {
    throw new Error("Le fichier ne contient pas une sauvegarde JSON valide.");
  }

  if (backup.type !== BACKUP_FORMAT_TYPE || backup.version !== BACKUP_FORMAT_VERSION || backup.kind !== MAINTENANCE_BACKUP_KIND) {
    throw new Error("Ce fichier n'est pas une sauvegarde complète Nanbudo Competition compatible.");
  }

  if (!backup.data || typeof backup.data !== "object" || Array.isArray(backup.data) || !backup.data.localStorage) {
    throw new Error("La sauvegarde complète ne contient pas les données attendues.");
  }

  return backup;
}

function restoreLocalStorage(localStorageData) {
  getNanbudoStorageKeys().forEach((key) => localStorage.removeItem(key));

  Object.entries(localStorageData).forEach(([key, value]) => {
    if (typeof value === "string") localStorage.setItem(key, value);
    else writeJsonToStorage(key, value);
  });
}

function createMinimalData() {
  writeJsonToStorage(COMPETITORS_STORAGE_KEY, []);
  writeJsonToStorage(COMPETITIONS_STORAGE_KEY, []);
  writeJsonToStorage(REGISTRATIONS_STORAGE_KEY, []);
}

function MaintenanceManager({ onResetComplete }) {
  const [status, setStatus] = useState(null);
  const [busyAction, setBusyAction] = useState(null);
  const fileInputRef = useRef(null);

  const stats = useMemo(() => {
    const competitors = readJsonFromStorage(COMPETITORS_STORAGE_KEY, []);
    const competitions = readJsonFromStorage(COMPETITIONS_STORAGE_KEY, []);
    return {
      competitors: Array.isArray(competitors) ? competitors.length : 0,
      testCompetitors: Array.isArray(competitors) ? competitors.filter(isTestCompetitor).length : 0,
      competitions: Array.isArray(competitions) ? competitions.length : 0,
      testCompetitions: Array.isArray(competitions) ? competitions.filter(isTestCompetition).length : 0,
    };
  }, [status, busyAction]);

  async function runAction(actionName, action) {
    setBusyAction(actionName);
    setStatus(null);
    try {
      await waitForAsyncTurn();
      const message = await action();
      window.dispatchEvent(new Event("nanbudo-maintenance-updated"));
      setStatus({ type: "success", message });
    } catch (error) {
      setStatus({ type: "error", message: error?.message || "Une erreur est survenue pendant l'opération." });
    } finally {
      setBusyAction(null);
    }
  }

  function deleteTestCompetitors() {
    runAction("competitors", async () => {
      const competitors = readJsonFromStorage(COMPETITORS_STORAGE_KEY, []);
      if (!Array.isArray(competitors)) throw new Error("La liste des compétiteurs est illisible.");
      const kept = competitors.filter((competitor) => !isTestCompetitor(competitor));
      writeJsonToStorage(COMPETITORS_STORAGE_KEY, kept);
      return `${competitors.length - kept.length} compétiteur(s) de test supprimé(s).`;
    });
  }

  function deleteTestCompetitions() {
    runAction("competitions", async () => {
      const competitions = readJsonFromStorage(COMPETITIONS_STORAGE_KEY, []);
      if (!Array.isArray(competitions)) throw new Error("La liste des compétitions est illisible.");
      const kept = competitions.filter((competition) => !isTestCompetition(competition));
      writeJsonToStorage(COMPETITIONS_STORAGE_KEY, kept);
      return `${competitions.length - kept.length} compétition(s) de test et données associées supprimée(s).`;
    });
  }

  function resetApplication() {
    const firstConfirmation = window.confirm("Réinitialiser complètement l'application ? Toutes les données seront supprimées.");
    if (!firstConfirmation) return;
    const secondConfirmation = window.confirm("Confirmation finale : cette action est irréversible. Continuer ?");
    if (!secondConfirmation) return;

    runAction("reset", async () => {
      getNanbudoStorageKeys().forEach((key) => localStorage.removeItem(key));
      await deleteIndexedDatabases();
      createMinimalData();
      setTimeout(() => onResetComplete?.(), 0);
      return "Application réinitialisée avec une base minimale.";
    });
  }

  function exportData() {
    runAction("export", async () => {
      const backup = buildFullBackup();
      downloadJsonFile(backup, createBackupFilename("maintenance-complete"));
      return "Export JSON complet généré.";
    });
  }

  function importData(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    runAction("import", async () => {
      const content = await file.text();
      const backup = validateFullBackup(JSON.parse(content));
      const confirmed = window.confirm("Remplacer toutes les données existantes par cette sauvegarde ?");
      if (!confirmed) return "Import annulé.";
      restoreLocalStorage(backup.data.localStorage);
      return "Sauvegarde importée avec succès.";
    });
    event.target.value = "";
  }

  const isBusy = Boolean(busyAction);

  return (
    <section className="registration-manager maintenance-module">
      <div className="manager-header">
        <div>
          <p className="surtitle">PARAMÈTRES</p>
          <h2>Maintenance</h2>
          <p>Nettoyage des données de test, sauvegarde complète et remise à zéro de l'application.</p>
        </div>
        <div className="category-total"><strong>{stats.competitors + stats.competitions}</strong><span>éléments</span></div>
      </div>

      {status && <div className={`validation-panel ${status.type === "error" ? "invalid" : "valid"}`}><strong>{status.type === "error" ? "Erreur" : "Confirmation"}</strong><span>{status.message}</span></div>}

      <div className="action-grid maintenance-grid">
        <div className="action-card"><h3>Compétiteurs de test</h3><p>{stats.testCompetitors} détecté(s) sur {stats.competitors} compétiteur(s).</p><button className="manage-button" type="button" disabled={isBusy} onClick={deleteTestCompetitors}>Supprimer les compétiteurs de test</button></div>
        <div className="action-card"><h3>Compétitions de test</h3><p>{stats.testCompetitions} détectée(s) sur {stats.competitions} compétition(s).</p><button className="manage-button" type="button" disabled={isBusy} onClick={deleteTestCompetitions}>Supprimer les compétitions de test</button></div>
        <div className="action-card"><h3>Export des données</h3><p>Génère un fichier JSON contenant toute la base locale.</p><button className="manage-button" type="button" disabled={isBusy} onClick={exportData}>Exporter les données</button></div>
        <div className="action-card"><h3>Import des données</h3><p>Remplace les données après contrôle du format et confirmation.</p><button className="manage-button" type="button" disabled={isBusy} onClick={() => fileInputRef.current?.click()}>Importer une sauvegarde</button><input ref={fileInputRef} type="file" accept="application/json,.json" onChange={importData} hidden /></div>
      </div>

      <div className="danger-zone"><div><p className="surtitle">ZONE DANGEREUSE</p><h3>Réinitialisation complète</h3><p>Supprime compétiteurs, compétitions, catégories, tableaux, combats, résultats, classements, statistiques, LocalStorage et IndexedDB.</p></div><button className="delete-button reset-button" type="button" disabled={isBusy} onClick={resetApplication}>Réinitialiser l'application</button></div>
    </section>
  );
}

export default MaintenanceManager;
