import test from "node:test";
import assert from "node:assert/strict";
import { calculateRanking, unresolvedPoolTieGroups, synchronizeTwoPoolFinals, calculateFinalsPodium } from "../src/competitionLogic.js";

const m = (a,b,w,an=0,bn=0) => ({akaId:a,shiroId:b,winnerId:w,akaNegative:an,shiroNegative:bn,statut:"Terminé"});
const p = (id,ids,matches) => ({id,categoryId:"cat",discipline:"randori",competitorIds:ids,matches});
test("direct encounter resolves equal wins and penalties without technical tiebreak",()=>{
 const pool=p("a",["A","B"],[m("A","B","B")]);
 assert.deepEqual(calculateRanking(pool).map(x=>x.competitorId),["B","A"]);
 assert.deepEqual(unresolvedPoolTieGroups(pool),[]);
});
test("negative points precede direct encounter",()=>{
 const pool=p("a",["A","B"],[m("A","B","B",0,2)]);
 assert.deepEqual(calculateRanking(pool).map(x=>x.competitorId),["A","B"]);
});
test("two completed pools create exactly one final and one bronze match",()=>{
 const a={...p("a",["A","B"],[m("A","B","A")]),statut:"Terminée",podium:{firstId:"A",secondId:"B"}};
 const b={...p("b",["C","D"],[m("C","D","C")]),statut:"Terminée",podium:{firstId:"C",secondId:"D"}};
 const pools=synchronizeTwoPoolFinals([a,b]);
 assert.equal(pools.length,3);
 const finals=pools[2];
 assert.equal(finals.matches.find(x=>x.finalType==="gold").akaId,"A");
 assert.equal(finals.matches.find(x=>x.finalType==="bronze").shiroId,"D");
 assert.equal(synchronizeTwoPoolFinals(pools).length,3);
 const complete={...finals,matches:finals.matches.map(x=>({...x,statut:"Terminé",winnerId:x.akaId}))};
 assert.deepEqual(calculateFinalsPodium(complete).pool.podium,{firstId:"A",secondId:"C",thirdId:"B"});
});
