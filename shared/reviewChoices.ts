import { roomsFromBrief } from './roomNights.ts';
import type { BriefField, Requirements } from './brief.ts';
import type { Budget } from './costing.ts';
import { defaultBasis, mapHead, mealKind, numberIn, ruleForHead, type Basis } from './proposal.ts';

const prefill = (field: BriefField, value: string, reason: string, source = field.source): BriefField => ({ ...field, value, source, status: 'corrected', reason });
// Prepare editable review suggestions; the extraction and pricing functions stay unchanged.
export function prepareReview(requirements: Requirements, brief: string): Requirements {
  const r = structuredClone(requirements);
  r.roomNights = roomsFromBrief(r,brief);
  for (const key of ['outOfTownGuests'] as const) {
    const field = r.fields[key];
    const match = /^(\d[\d,]*)\s+of\s+(?:the\s+)?\d/i.exec(field.value);
    if (field.status === 'provided' && match) r.fields[key] = prefill(field, match[1], 'The first count is the out-of-town guests; the following count is the larger guest group.');
  }
  const rate = r.fields.roomRate;
  const quotedRate = /(?:₹|Rs\.?|INR)\s*(\d[\d,]*(?:\.\d+)?)/i.exec(rate.value);
  if (rate.status === 'provided' && quotedRate && numberIn(rate.value) === null) r.fields.roomRate = prefill(rate, `₹${quotedRate[1]}/room night`, 'Use the quoted room-night rate; nights are shown separately.');
  for (const f of r.functions) {
    const match = /^(\d[\d,]*)\s*\(/.exec(f.guests.value);
    if (f.guests.status === 'provided' && match) f.guests = prefill(f.guests, match[1], 'Use the function’s stated guest count; the bracket gives context.');
  }
  // Only expand a plainly stated repeated daily flow. Never guess a day from a blank AI field.
  const days = numberIn(r.fields.days.value);
  const flow = /show flow[^\r\n]*/i.exec(brief)?.[0];
  const repeated = flow?.match(/(\d+)\s+lunches?\s*,\s*(\d+)\s+high teas?\s*,\s*(\d+)\s+dinners?\s*,\s*(\d+)\s+after parties/i);
  if (days && days <= 7 && /guest count\s*\(per day\)/i.test(brief) && repeated && repeated.slice(1).every(n => Number(n) === days) && r.functions.every(f => !f.day.value)) {
    const kinds = ['lunch', 'tea', 'dinner', 'afters'];
    const templates = kinds.map(kind => r.functions.find(f => mealKind(f.name.value) === kind && numberIn(f.guests.value) !== null));
    if (templates.every(Boolean)) r.functions = Array.from({ length: days }, (_, day) => templates.map(template => {
      const f = structuredClone(template!);
      f.day = prefill(f.day, `Day ${day + 1}`, 'The brief states these guest counts per day and repeats every function once each day.', flow!);
      return f;
    })).flat();
  }
  return r;
}
export type HeadChoice = { driver: string; basis: Basis; reason: string; basisReason: string };
export function suggestedHeadChoices(budget: Budget, r: Requirements): Record<string, HeadChoice> {
  const days=groupFunctionDays(r);
  const preferred=days.flatMap(({functions})=>{
    const dinners=functions.filter(f=>mealKind(f.name.value)==='dinner');
    const choices=dinners.length ? dinners : functions.filter(f=>mealKind(f.name.value)==='lunch');
    return choices.length ? choices.map(f=>({kind:dinners.length?'Dinner':'Lunch',count:numberIn(f.guests.value)})) : [{kind:'Lunch',count:null}];
  });
  const counts=[...new Set(preferred.map(f=>f.count))];
  const dinner=counts.length===1 ? counts[0] : null;
  const defaultKind=preferred.some(f=>f.kind==='Dinner') ? 'Dinner' : 'Lunch';
  const outOfTown = numberIn(r.fields.outOfTownGuests.value);
  const food = mapHead('Food', budget), transfers = mapHead('Transfers', budget);
  return Object.fromEntries(budget.heads.map(h => {
    const rule = ruleForHead(h, budget, r), basis = defaultBasis(rule);
    const transfer = h.row === transfers?.row;
    const driver = transfer ? outOfTown === null ? '' : `Out-of-town guests: ${outOfTown}` : dinner === null ? '' : `${defaultKind}: ${dinner}`;
    const reason = transfer ? 'Transfers use the brief’s out-of-town guests.' : h.row === food?.row ? `Meals use their own function count. High tea follows lunch. Alcohol uses the ${defaultKind.toLowerCase()} count.` : basis === 'fixed' ? 'Fixed historical cost; this reference headcount does not scale it.' : `Per-person costs use the ${defaultKind.toLowerCase()} count.`;
    const basisReason = basis === 'fixed' ? `Keep the historical cost. ${rule ? `Brief rule: ${rule}.` : 'No per-person scaling rule is stated.'}` : `Scale against the historical benchmark. Brief rule: ${rule}.`;
    return [h.name, { driver, basis, reason, basisReason }];
  }));
}

export function groupFunctionDays(r: Requirements) {
  const days=new Map<string,{day:string;functions:Requirements['functions']}>();
  for(const f of r.functions){
    const day=f.day.value.trim(),key=day.toLowerCase();
    if(!days.has(key))days.set(key,{day,functions:[]});
    days.get(key)!.functions.push(f);
  }
  return [...days.values()];
}
export function dailyHeadcountOptions(r: Requirements) {
  return groupFunctionDays(r).filter(({day})=>day).map(({day,functions})=>{
    const counts=functions.map(f=>f.guests.status==='unclear' ? null : numberIn(f.guests.value));
    const sum=counts.reduce<number>((sum,n)=>sum+(n??0),0);
    const total=counts.every(n=>n!==null) && Number.isSafeInteger(sum) ? sum : null;
    return {day,total,value:total===null?'':`Total for the day (all functions) · ${day}: ${total}`,label:`${day} · Total for the day (all functions): ${total===null?'guest counts missing':new Intl.NumberFormat('en-IN').format(total)}`};
  });
}
