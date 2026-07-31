// Moteur V1 de proposition des catégories Nanbudo.
export const CATEGORY_RULES={poolMin:3,poolIdeal:4,childBands:[[6,7],[8,9],[10,11],[12,13]]};
export function ageGroup(age){if(age<14)return"Enfant";if(age<=17)return"Junior";if(age<=39)return"Senior";return"Vétéran"}
export function combatType(age){return age<10?"Randori":"Ju Randori"}
function childBand(age){const b=CATEGORY_RULES.childBands.find(([a,z])=>age>=a&&age<=z);return b?`${b[0]}-${b[1]} ans`:"Moins de 14 ans"}
function sex(v){return String(v||"").toLowerCase().startsWith("f")?"Féminin":"Masculin"}
function nAge(c){const n=Number(c.age);return Number.isFinite(n)?n:0}
export function proposeCategories(competitors=[]){const buckets=new Map();competitors.filter(c=>nAge(c)>0).forEach(c=>{const a=nAge(c),g=ageGroup(a),band=g==="Enfant"?childBand(a):g,key=`${sex(c.sexe)}|${combatType(a)}|${band}`;if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(c)});return [...buckets].map(([key,members])=>{const [sexe,epreuve,trancheAge]=key.split("|");return{id:`auto-${key}-${members.map(x=>x.id).join("-")}`,auto:true,sexe,epreuve,trancheAge,nom:`${sexe} · ${trancheAge} · ${epreuve}`,competitors:members.map(x=>x.id),effectif:members.length,grades:[...new Set(members.map(x=>x.grade).filter(Boolean))],status:members.length>=CATEGORY_RULES.poolMin?"Proposition":"À regrouper",warning:members.length<CATEGORY_RULES.poolMin?"Effectif insuffisant : regroupement à valider par la Commission.":null}})}
