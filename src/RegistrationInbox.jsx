import { useEffect, useMemo, useState } from "react";
import { parseRegistrationExport } from "./registrationImport";

const REGISTRATIONS_KEY = "nanbudo-online-registrations-v2";
const REGISTRATIONS_CHANGED_EVENT = "nanbudo-registrations-changed";

function readRegistrations(){try{return JSON.parse(localStorage.getItem(REGISTRATIONS_KEY)||"[]")}catch{return[]}}

export default function RegistrationInbox({competition,onUpdateCompetition}){
 const [allRegistrations,setAllRegistrations]=useState(readRegistrations);
 useEffect(()=>{
  const refresh=()=>setAllRegistrations(readRegistrations());
  window.addEventListener("storage",refresh);
  window.addEventListener(REGISTRATIONS_CHANGED_EVENT,refresh);
  refresh();
  return()=>{window.removeEventListener("storage",refresh);window.removeEventListener(REGISTRATIONS_CHANGED_EVENT,refresh)};
 },[competition.id]);
 const registrations=useMemo(()=>allRegistrations.filter(r=>String(r.competitionId)===String(competition.id)),[allRegistrations,competition.id]);
 const alreadyImported=new Set((competition.competitors||[]).map(c=>String(c.registrationId||"")));
 const pending=registrations.filter(r=>!alreadyImported.has(String(r.id)));
 function importPending(){
  if(!pending.length){alert("Aucune nouvelle inscription à importer pour cette compétition.");return}
  try{
   const payload=JSON.stringify({format:"nanbudo-competition-inscriptions",version:2,competitors:pending});
   const result=parseRegistrationExport(payload,competition.competitors||[]);
   if(result.competitors.length){onUpdateCompetition({...competition,competitors:[...(competition.competitors||[]),...result.competitors]})}
   const details=result.rejected.length?`\n\nRefusées :\n${result.rejected.join("\n")}`:"";
   alert(`${result.competitors.length} inscription(s) importée(s).${result.rejected.length?` ${result.rejected.length} refusée(s).`:""}${details}`);
  }catch(error){alert(`Import impossible : ${error.message}`)}
 }
 return <section className="backup-panel"><div><p className="surtitle">INSCRIPTIONS EN LIGNE</p><h3>{registrations.length} inscription{registrations.length>1?"s":""} pour cette compétition</h3><p>{pending.length} nouvelle{pending.length>1?"s":""} à intégrer dans la liste des compétiteurs.</p></div><div className="backup-actions"><button className="primary" type="button" disabled={!pending.length} onClick={importPending}>Récupérer les inscriptions ({pending.length})</button></div></section>
}
