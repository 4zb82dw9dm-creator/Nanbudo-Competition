import { useEffect, useState } from "react";
import CompetitionDashboard from "./CompetitionDashboard";

const STORAGE_KEY = "nanbudo_competitions";
const REGISTRATION_KEY = "nanbudo_registrations";
const STATUSES = ["Préparation", "Inscriptions ouvertes", "Inscriptions closes", "Terminée"];

function CompetitionManager() {
  const [competitions, setCompetitions] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; }
  });
  const [showForm, setShowForm] = useState(false);
  const [selectedCompetitionId, setSelectedCompetitionId] = useState(null);
  const [form, setForm] = useState({ nom: "", date: "", lieu: "", type: "Coupe régionale", saison: "2026-2027" });

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(competitions)); }, [competitions]);

  function handleChange(e) { const { name, value } = e.target; setForm(c => ({ ...c, [name]: value })); }
  function createCompetition(e) {
    e.preventDefault();
    if (!form.nom.trim()) return;
    setCompetitions(c => [...c, { id: Date.now(), ...form, nom: form.nom.trim(), lieu: form.lieu.trim(), statut: "Préparation", competitors: [], categories: [] }]);
    setForm({ nom: "", date: "", lieu: "", type: "Coupe régionale", saison: "2026-2027" }); setShowForm(false);
  }
  function updateCompetition(updated) { setCompetitions(c => c.map(x => x.id === updated.id ? updated : x)); }
  function deleteCompetition(id) { if (window.confirm("Supprimer cette compétition ?")) setCompetitions(c => c.filter(x => x.id !== id)); }

  const selected = competitions.find(x => x.id === selectedCompetitionId);
  if (selected) return <CompetitionDashboard competition={selected} onBack={() => setSelectedCompetitionId(null)} onUpdateCompetition={updateCompetition} />;

  return <section className="competition-manager">
    <div className="manager-header"><div><p className="surtitle">BÊTA 0.2</p><h2>Gestion des compétitions</h2><p>Créez une compétition, ouvrez les inscriptions puis gérez les inscrits.</p></div><button className="primary" onClick={() => setShowForm(v => !v)}>{showForm ? "Annuler" : "+ Nouvelle compétition"}</button></div>
    {showForm && <form className="competition-form" onSubmit={createCompetition}><h3>Nouvelle compétition</h3><label>Nom<input name="nom" value={form.nom} onChange={handleChange} required /></label><div className="form-row"><label>Date<input name="date" type="date" value={form.date} onChange={handleChange}/></label><label>Lieu<input name="lieu" value={form.lieu} onChange={handleChange}/></label></div><div className="form-row"><label>Type<select name="type" value={form.type} onChange={handleChange}><option>Coupe régionale</option><option>Coupe de France</option><option>Championnat</option><option>Compétition test</option><option>Autre</option></select></label><label>Saison<input name="saison" value={form.saison} onChange={handleChange}/></label></div><button className="primary">Créer la compétition</button></form>}
    {competitions.length === 0 ? <div className="empty-state"><h3>Aucune compétition</h3></div> : <div className="managed-competitions">{competitions.map(c => <article className="managed-competition" key={c.id}><div className="competition-main"><span className="status">{c.statut}</span><h3>{c.nom}</h3><p>{c.type}{c.lieu ? ` · ${c.lieu}` : ""}</p><p>{c.date || "Date à définir"} · Saison {c.saison}</p><label>Statut <select value={c.statut} onChange={e => updateCompetition({ ...c, statut: e.target.value })}>{STATUSES.map(s => <option key={s}>{s}</option>)}</select></label></div><div className="competition-stats"><div><strong>{(c.competitors || []).length}</strong><span>Compétiteurs</span></div></div><div className="competition-actions"><button className="manage-button" onClick={() => setSelectedCompetitionId(c.id)}>Gérer</button><button className="delete-button" onClick={() => deleteCompetition(c.id)}>Supprimer</button></div></article>)}</div>}
    <PublicRegistration competitions={competitions}/>
  </section>;
}

function PublicRegistration({ competitions }) {
  const open = competitions.filter(c => c.statut === "Inscriptions ouvertes");
  const [form, setForm] = useState({ competitionId: "", nom: "", prenom: "", club: "", sexe: "Homme", dateNaissance: "", poids: "", grade: "", kata: true, juRandori: true });
  useEffect(() => { if (open.length && !open.some(c => String(c.id) === form.competitionId)) setForm(f => ({ ...f, competitionId: String(open[0].id) })); }, [competitions]);
  function change(e) { const {name,value,type,checked}=e.target; setForm(f=>({...f,[name]:type==="checkbox"?checked:value})); }
  function submit(e) { e.preventDefault(); if (!form.competitionId || !form.nom.trim() || !form.prenom.trim()) return; let all=[]; try { all=JSON.parse(localStorage.getItem(REGISTRATION_KEY))||[]; } catch {} all.push({ ...form, id: Date.now(), competitionId: Number(form.competitionId), statut: "À importer", createdAt: new Date().toISOString() }); localStorage.setItem(REGISTRATION_KEY, JSON.stringify(all)); alert("Inscription enregistrée."); setForm(f=>({...f,nom:"",prenom:"",club:"",dateNaissance:"",poids:"",grade:""})); }
  return <div className="beta-note"><strong>Formulaire public — test</strong>{open.length===0 ? <p>Aucune compétition n'accepte actuellement les inscriptions.</p> : <form className="competition-form" onSubmit={submit}><label>Compétition<select name="competitionId" value={form.competitionId} onChange={change}>{open.map(c=><option key={c.id} value={c.id}>{c.nom}</option>)}</select></label><div className="form-row"><label>Nom<input name="nom" value={form.nom} onChange={change} required/></label><label>Prénom<input name="prenom" value={form.prenom} onChange={change} required/></label></div><label>Club<input name="club" value={form.club} onChange={change}/></label><div className="form-row"><label>Sexe<select name="sexe" value={form.sexe} onChange={change}><option>Homme</option><option>Femme</option></select></label><label>Date de naissance<input type="date" name="dateNaissance" value={form.dateNaissance} onChange={change}/></label></div><div className="form-row"><label>Poids<input type="number" name="poids" value={form.poids} onChange={change}/></label><label>Grade<input name="grade" value={form.grade} onChange={change}/></label></div><fieldset className="event-selection"><legend>Épreuves</legend><label><input type="checkbox" name="kata" checked={form.kata} onChange={change}/> Kata individuel</label><label><input type="checkbox" name="juRandori" checked={form.juRandori} onChange={change}/> Ju Randori individuel</label></fieldset><button className="primary">Envoyer l'inscription</button></form>}</div>;
}
export default CompetitionManager;
