import type { Requirements } from './brief.ts';
import type { ContingencyResult } from './contingency.ts';
import { mealKind, numberIn, rupees } from './proposal.ts';

// Presentation only: never write rounded display figures back into the costing.
export function perGuestLine(requirements:Requirements, costing:ContingencyResult|null):string|null {
  if(!costing)return null;
  const dinners=requirements.functions.filter(f=>mealKind(f.name.value)==='dinner');
  const functions=dinners.length ? dinners : requirements.functions.filter(f=>mealKind(f.name.value)==='lunch');
  const counts=functions.map(f=>numberIn(f.guests.value)).filter((n):n is number=>n!==null);
  if(!counts.length)return null;
  const guests=Math.max(...counts), total=costing.total;
  return `(≈ ${rupees(Math.round(total.low/guests))}–${rupees(Math.round(total.high/guests))} per guest · midpoint ${rupees(Math.round(total.midpoint/guests))} · on ${guests.toLocaleString('en-IN')} guests)`;
}

// Allocate rounding tenths to the largest remainders so the displayed shares sum to 100.0%.
export function midpointShares(costing:ContingencyResult|null):Record<string,string> {
  if(!costing || costing.total.midpoint<=0)return {};
  const heads=Object.entries(costing.heads);
  const sum=heads.reduce((sum,[,head])=>sum+(head.range?.midpoint??0),0);
  if(sum<=0)return {};
  const parts=heads.map(([name,head],index)=>{
    const exact=(head.range?.midpoint??0)/costing.total.midpoint*1000;
    return {name,index,tenths:Math.floor(exact),fraction:exact-Math.floor(exact)};
  });
  const left=1000-parts.reduce((sum,part)=>sum+part.tenths,0);
  [...parts].sort((a,b)=>b.fraction-a.fraction || a.index-b.index).slice(0,left).forEach(part=>part.tenths++);
  return Object.fromEntries(parts.map(part=>[part.name,`${(part.tenths/10).toFixed(1)}% of total`]));
}
