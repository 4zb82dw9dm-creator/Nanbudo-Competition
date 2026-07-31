import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "nanbudo-online-registrations-v2";
const EVENTS = [
  ["kata0", "Kata 0 — Shihotai"], ["kata1", "Kata 1"], ["kata2", "Kata 2"],
  ["randori", "Randori"], ["juRandori1", "Ju Randori 1"], ["juRandori2", "Ju Randori 2"],
];
const initialForm = { nom:"", prenom:"", club:"", licence:"", dateNaissance:"", sexe:"", grade:"", poids:"", email:"", telephone:"", epreuves:[] };

function RegistrationManager() {
  const [form, setForm] = useState(initialForm);
  const [registrations, setRegistrations] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
  });
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(registrations)); }, [registrations]);

  const canSubmit = useMemo(() => form.nom.trim() && form.prenom.trim() && form.club.trim() && form.dateNaissance && form.sexe && form.epreuves.length > 0, [form]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return registrations;
    return registrations.filter((r) => [r.nom,r.prenom,r.club,r.licence].some((v) => String(v || "").toLowerCase().includes(q)));
  }, [registrations, search]);

  function updateField(e) { const {name,value}=e.target; setForm((f)=>({...f,[name]:value})); setMessage(""); }
  function toggleEvent(id) { setForm((f)=>({...f,epreuves:f.epreuves.includes(id)?f.epreuves.filter((x)=>x!==id):[...f.epreuves,id]})); }
  function resetForm() { setForm(initialForm); setEditingId(null); }

  function submitRegistration(e) {
    e.preventDefault(); if (!canSubmit) return;
    const item = { id: editingId || `inscription-${Date.now()}-${Math.random().toString(36).slice(2,7)}`, ...form, nom:form.nom.trim().toUpperCase(), prenom:form.prenom.trim(), club:form.club.trim(), licence:form.licence.trim(), poids:form.poids?Number(form.poids):"", updatedAt:new Date().toISOString() };
    setRegistrations((list)=> editingId ? list.map((r)=>r.id===editingId?{...r,...item}:r) : [...list,{...item,createdAt:new Date().toISOString()}]);
    setMessage(editingId ? "Inscription modifiée." : "Inscription enregistrée."); resetForm();
  }

  function editRegistration(r) { setEditingId(r.id); setForm({...initialForm,...r,poids:r.poids || ""}); setMessage(""); window.scrollTo({top:0,behavior:"smooth"}); }
  function deleteRegistration(id) { if (window.confirm("Supprimer cette inscription ?")) { setRegistrations((list)=>list.filter((r)=>r.id!==id)); if(editingId===id) resetForm(); } }

  function downloadJson(data, filename) {
    const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json;charset=utf-8"}); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }
  function exportRegistrations() {
    if(!registrations.length) return;
    downloadJson({format:"nanbudo-competition-inscriptions",version:2,exportedAt:new Date().toISOString(),competitors:registrations},`inscriptions-nanbudo-${new Date().toISOString().slice(0,10)}.json`);
  }
  function handleImport(e) {
    const file=e.target.files?.[0]; if(!file) return;
    const reader=new FileReader(); reader.onload=()=>{ try { const data=JSON.parse(String(reader.result||"")); const incoming=Array.isArray(data)?data:data.competitors; if(!Array.isArray(incoming)) throw new Error(); const clean=incoming.map((r,i)=>({...initialForm,...r,id:r.id||`import-${Date.now()}-${i}`,epreuves:Array.isArray(r.epreuves)?r.epreuves:[]})); setRegistrations(clean); setMessage(`${clean.length} inscription(s) importée(s).`); } catch { alert("Fichier d'inscriptions invalide."); } finally { e.target.value=""; } }; reader.readAsText(file,"UTF-8");
  }

  return <section className="registration-manager">
    <div className="manager-header"><div><p className="surtitle">INSCRIPTIONS</p><h2>Inscriptions en ligne</h2><p>Saisir, contrôler et exporter les compétiteurs pour Nanbudo Competition.</p></div><div className="category-total"><strong>{registrations.length}</strong><span>inscription{registrations.length>1?"s":""}</span></div></div>

    <form className="competition-form" onSubmit={submitRegistration}>
      <h3>{editingId ? "Modifier l'inscription" : "Nouvelle inscription"}</h3>
      <div className="form-row"><label>Nom *<input name="nom" value={form.nom} onChange={updateField} required /></label><label>Prénom *<input name="prenom" value={form.prenom} onChange={updateField} required /></label></div>
      <div className="form-row"><label>Club *<input name="club" value={form.club} onChange={updateField} required /></label><label>N° de licence<input name="licence" value={form.licence} onChange={updateField} /></label></div>
      <div className="form-row"><label>Date de naissance *<input type="date" name="dateNaissance" value={form.dateNaissance} onChange={updateField} required /></label><label>Sexe *<select name="sexe" value={form.sexe} onChange={updateField} required><option value="">Sélectionner</option><option value="F">Féminin</option><option value="M">Masculin</option></select></label></div>
      <div className="form-row"><label>Grade<input name="grade" value={form.grade} onChange={updateField} /></label><label>Poids (kg)<input type="number" min="0" step="0.1" name="poids" value={form.poids} onChange={updateField} /></label></div>
      <div className="form-row"><label>E-mail<input type="email" name="email" value={form.email} onChange={updateField} /></label><label>Téléphone<input type="tel" name="telephone" value={form.telephone} onChange={updateField} /></label></div>
      <fieldset className="event-selection"><legend>Épreuves *</legend>{EVENTS.map(([id,label])=><label key={id}><input type="checkbox" checked={form.epreuves.includes(id)} onChange={()=>toggleEvent(id)} />{label}</label>)}</fieldset>
      <div className="competitor-actions"><button className="primary" type="submit" disabled={!canSubmit}>{editingId?"Enregistrer les modifications":"Enregistrer l'inscription"}</button>{editingId&&<button className="back-button" type="button" onClick={resetForm}>Annuler la modification</button>}{message&&<span className="registration-message">{message}</span>}</div>
    </form>

    <div className="manager-header registration-list-header"><div><p className="surtitle">LISTE</p><h3>Inscriptions enregistrées</h3><p>Contrôle avant import dans la compétition.</p></div><div className="competitor-actions"><label className="manage-button registration-import-label">Importer un fichier<input type="file" accept="application/json,.json" onChange={handleImport} hidden /></label><button type="button" className="manage-button" disabled={!registrations.length} onClick={exportRegistrations}>Générer le fichier d'import</button></div></div>
    {registrations.length>0&&<div className="registration-toolbar"><input type="search" placeholder="Rechercher nom, club ou licence…" value={search} onChange={(e)=>setSearch(e.target.value)} /><span>{filtered.length} affichée{filtered.length>1?"s":""}</span></div>}

    {registrations.length===0?<div className="empty-state"><h3>Aucune inscription</h3><p>Les inscriptions enregistrées apparaîtront ici.</p></div>:filtered.length===0?<div className="empty-state"><h3>Aucun résultat</h3><p>Aucune inscription ne correspond à cette recherche.</p></div>:<div className="competitor-list">{filtered.map((r)=><article className="competitor-card" key={r.id}><div><h3>{r.nom} {r.prenom}</h3><p>{r.club}</p></div><div className="competitor-details">{r.licence&&<span>Licence {r.licence}</span>}<span>{r.dateNaissance}</span><span>{r.sexe==="F"?"Féminin":"Masculin"}</span>{r.grade&&<span>{r.grade}</span>}{r.poids&&<span>{r.poids} kg</span>}</div><div className="competitor-events">{r.epreuves.map((id)=><span key={id}>{EVENTS.find(([x])=>x===id)?.[1]||id}</span>)}</div><div className="competition-actions"><button className="manage-button" type="button" onClick={()=>editRegistration(r)}>Modifier</button><button className="delete-button" type="button" onClick={()=>deleteRegistration(r.id)}>Supprimer</button></div></article>)}</div>}
  </section>;
}
export default RegistrationManager;
