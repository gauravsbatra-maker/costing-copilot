import {addedServiceNames,hasServiceAliases,serviceHead,matchesServiceName} from './serviceHeads.ts';
import {quantityRateColumns} from './sheetColumns.ts';
import { totalRoomNights } from './roomNights.ts';
import * as XLSX from 'xlsx';
import { readVisibleWorksheet, readCostingWorksheet, type Budget, type CostHead, type CostRow } from './costing.ts';
import type { Requirements } from './brief.ts';
export type ProposalRow = CostRow & { quantity?: number; rate?: number };
export type Basis = 'fixed' | 'headcount';
export type Line = { label: string; amount: number | null; source: string | null; original?: ProposalRow; headcount: number | null; calculation: string; pricing?: { quantity: number; unitCost: number; multiplier: number } };
export type Proposal = { heads: { name: string; headcount: number | null; lines: Line[]; amount: number | null;matchedServices?:string[] }[]; toQuote: Line[]; total: number;notInBrief?:string[] };
const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
export function numberIn(s: string): number | null {
  const matches = s.match(/\d[\d,]*(?:\.\d+)?/g);
  if (matches?.length !== 1) return null;
  const n = Number(matches[0].replaceAll(',', ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}
export function chosenHeadcount(text:string): number | null {
  const dayTotal=/^Total for the day \(all functions\) · .+: (\d+)$/.exec(text);
  return numberIn(dayTotal?.[1] ?? text);
}
export function readProposalSheet(data: ArrayBuffer | Uint8Array, selected?: string, costColumn?:number): Budget {
  const {sheet, sheetName} = readVisibleWorksheet(data, selected);
  const budget = readCostingWorksheet(sheet, sheetName, costColumn);
  const {quantity:qty,rate} = quantityRateColumns(sheet,budget.reading!.firstDataRow);
  for (const head of budget.heads) for (const item of head.items) {
    const row = item as ProposalRow;
    const q = qty>=0 ? sheet[XLSX.utils.encode_cell({r:item.row-1,c:qty})]?.v : undefined;
    const r = rate>=0 ? sheet[XLSX.utils.encode_cell({r:item.row-1,c:rate})]?.v : undefined;
    if (typeof q === 'number' && Number.isFinite(q) && q > 0) row.quantity = q;
    if (typeof r === 'number' && Number.isFinite(r) && r >= 0) row.rate = r;
  }
  return budget;
}
export function mapHead<T extends {name:string}>(name: string, budget: {heads:T[]}): T | null {
  const exact = budget.heads.find(h => clean(h.name) === clean(name)); if (exact) return exact;
  const aliases: [RegExp, RegExp][] = [
    [/^(food|catering|meals|fb|fbandalcohol|foodandalcohol)$/, /taj hotel|food|catering/i], [/^(production|technicals|sound|lighting)$/, /technical|production/i],
    [/^(decor|florals|decoration)$/, /decor/i], [/^(transport|transfers|gueststransfer)$/, /guests transfer/i],
    [/^(bartenders|bar)$/, /bar\s*tender/i], [/^(entertainment|artists)$/, /entertainment/i],
    [/^(licenses|permissions)$/, /licenses/i], [/^(graphicdesign|printables|invitations)$/, /graphic design/i],
    [/^(photography|photo|video|photovideo)$/, /photo.*video/i], [/^(othercosts|miscellaneous)$/, /other costs/i],
  ];
  const alias = aliases.find(([pattern]) => pattern.test(clean(name)));
  return alias ? budget.heads.find(h => alias[1].test(h.name)) ?? null : null;
}
export function mealKind(name: string): string | null {
  if (/high\s*tea|hospitality\s+lounge/i.test(name)) return 'tea'; if (/lunch/i.test(name)) return 'lunch';
  if (/after|afters/i.test(name)) return 'afters'; if (/dinner|sangeet|reception|cocktail/i.test(name)) return 'dinner';
  if (/breakfast/i.test(name)) return 'breakfast'; return null;
}
export function defaultBasis(rule: string): Basis {
  return /per head|pro rata|rise.*headcount|scale.*(?:headcount|guest|pax)|(?:headcount|guest).*scal/i.test(rule) && !/fixed|roughly the same/i.test(rule) ? 'headcount' : 'fixed';
}
export function mappedHeads(name: string, budget: Budget): CostHead[] {
  const direct = mapHead(name,budget);
  if(direct) return [direct];
  if (/^all other heads$/i.test(name.trim())) return budget.heads;
  const parts = name.split(/\s*(?:&|\band\b)\s*/i).map(part=>mapHead(part,budget));
  return parts.length > 1 && parts.every(Boolean) ? parts as CostHead[] : [];
}
export function ruleForHead(head: CostHead, budget: Budget, requirements: Requirements): string {
  const explicit = requirements.scalingRules.find(r=>!/^all other heads$/i.test(r.head.value.trim()) && mappedHeads(r.head.value,budget).some(h=>h.row===head.row));
  return explicit?.rule.value ?? requirements.scalingRules.find(r=>/^all other heads$/i.test(r.head.value.trim()))?.rule.value ?? '';
}
export function formHeadNeeded(head:CostHead,budget:Budget,r:Requirements):boolean {
  if(!r.fromBriefForm)return true;
  if(head.row===mapHead('Food',budget)?.row)return r.functions.some(f=>numberIn(f.guests.value)!==null);
  if(head.row===mapHead('Transfers',budget)?.row)return numberIn(r.fields.outOfTownGuests.value)!==null;
  const aliases:Record<string,string>={'Décor':'Decor','Bartenders':'Bar Tenders','Licenses & Permissions':'Licenses','Design & Collaterals':'Graphic Design','Photo & Video':'Photo / Video'};
  return (r.serviceNotes??[]).some(note=>note.text.trim()&&!/^(?:0(?:\.0+)?|none)$/i.test(note.text.trim()) && (hasServiceAliases(note.name)?serviceHead(note.name,budget):mapHead(aliases[note.name]??note.name,budget))?.name===head.name);
}
const allDaysFood=(name:string)=>/^\s*all\s+days\s*:/i.test(name);
function foodDay(name:string):{key:string;order:number;kind:'day'|'date'}|null {
 const day=/^\s*Day\s+(\d+)\s*:/i.exec(name);
 if(day)return {key:`day:${Number(day[1])}`,order:Number(day[1]),kind:'day'};
 const date=/^\s*(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2})(?:,?\s+(\d{4}))?\s*:/i.exec(name);
 if(!date || Number(date[2])<1 || Number(date[2])>31)return null;
 const month=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(date[1].slice(0,3).toLowerCase());
 return {key:`date:${date[3]??''}:${month}:${Number(date[2])}`,order:Number(date[3]??0)*400+month*32+Number(date[2]),kind:'date'};
}
export function foodRowsForFunction(budget:Budget,requirements:Requirements,index:number):CostRow[] {
 const items=mapHead('Food',budget)?.items??[];
 const days=[...new Map(items.flatMap(item=>{const day=foodDay(item.name);return day?[[day.key,day] as const]:[];})).values()].sort((a,b)=>a.order-b.order);
 if(!days.length)return items.filter(item=>!allDaysFood(item.name)&&mealKind(item.name));
 const value=requirements.functions[index]?.day.value??'';
 const explicit=foodDay(`${value}:`);
 const briefDays=[...new Set(requirements.functions.map(f=>f.day.value))].sort((a,b)=>(foodDay(`${a}:`)?.order??0)-(foodDay(`${b}:`)?.order??0));
 const selected=explicit&&days.some(day=>day.key===explicit.key)?explicit:explicit?.kind==='day'&&days[0].kind==='date'?days[explicit.order-1]:!explicit||explicit.kind==='date'?days[briefDays.indexOf(value)]:undefined;
 return items.filter(item=>!allDaysFood(item.name)&&selected&&foodDay(item.name)?.key===selected.key);
}
export function matchMeals(budget: Budget, requirements: Requirements): Record<number, number | null> {
 const food=mapHead('Food',budget);if(!food)return {};
 const dated=food.items.some(item=>foodDay(item.name));
 const days=[...new Set(requirements.functions.map(f=>f.day.value))];
 return Object.fromEntries(requirements.functions.map((f,index)=>{
  const kind=mealKind(f.name.value);
  const candidates=(dated?foodRowsForFunction(budget,requirements,index):food.items).filter(item=>!allDaysFood(item.name)&&kind&&mealKind(item.name)===kind);
  return [index,dated?(candidates.length===1?candidates[0].row:null):(candidates[days.indexOf(f.day.value)]?.row??(candidates.length===1?candidates[0].row:null))];
 }));
}
const money = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export const rupees = (n: number) => `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n)}`;
export function parsePastTransferGuests(text: string): number | null {
  const value = /^\d+(?:\.\d+)?$/.test(text.trim()) ? Number(text.trim()) : NaN;
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}
export function buildProposal(budget: Budget, requirements: Requirements, drivers: Record<string, string>, bases: Record<string, Basis>, overrides: Record<number, number | null>, useBriefRooms = false, pastTransferGuests: number | null = null): Proposal {
  const benchmark = numberIn(requirements.fields.benchmarkHeadcount.value);
  const meals = { ...matchMeals(budget, requirements), ...overrides };
  const premiumText = requirements.fields.seasonalPremium.value;
  const premiumMatch = /^\+?(\d+(?:\.\d+)?)\s*%/.exec(premiumText.trim());
  const premium = premiumMatch ? Number(premiumMatch[1]) / 100 : 0;
  const quote = (label: string, reason: string, headcount: number | null = null): Line => ({ label, amount: null, source: null, headcount, calculation: reason });
  const price = (label: string, head: CostHead, row: ProposalRow, multiplier: number | null, headcount: number | null, calculation: string, quantity = 1, divisor = 1): Line => {
    if (typeof row.cost !== 'number' || row.cost < 0 || multiplier === null || !Number.isFinite(multiplier)) return quote(label, 'No readable sheet cost or confirmed calculation basis.', headcount);
    const amount = money(row.cost * multiplier);
    if (!Number.isSafeInteger(Math.round(amount * 100))) return quote(label, 'Cost is too large to calculate safely.', headcount);
    return { label, amount, source: `${budget.sheet} · ${head.name} · row ${row.row}`, original: row, headcount, calculation, pricing: { quantity, unitCost: row.cost / divisor, multiplier: multiplier / (quantity / divisor) } };
  };
  const food = mapHead('Food', budget);
  const transfers = mapHead('Transfers', budget);
  const heads:Proposal['heads'] = budget.heads.map(head => {
    if(!formHeadNeeded(head,budget,requirements))return {name:head.name,headcount:null,lines:[{label:head.name,amount:0,source:`${budget.sheet} · ${head.name} · row ${head.row}`,original:head,headcount:null,calculation:'Not in this brief (₹0)',pricing:{quantity:0,unitCost:0,multiplier:1}}],amount:0};
    const isTransfers = head.row === transfers?.row;
    const headcount = isTransfers ? numberIn(requirements.fields.outOfTownGuests.value) : chosenHeadcount(drivers[head.name] ?? '') ?? (new Set(requirements.functions.map(f => numberIn(f.guests.value))).size === 1 ? numberIn(requirements.functions[0]?.guests.value ?? '') : null);
    const rule = ruleForHead(head,budget,requirements);
    const basis = bases[head.name] ?? defaultBasis(rule);
    const globalPremium = /across all heads|all heads/i.test(`${premiumText} ${requirements.fields.seasonalPremium.source}`);
    const needsPremium = globalPremium || /seasonal|premium/i.test(rule);
    const applyPremium = needsPremium ? (premiumMatch ? 1 + premium : /no|none|0/i.test(premiumText) ? 1 : NaN) : 1;
    let lines: Line[];
    if (isTransfers) {
      const validPastCount = pastTransferGuests !== null && Number.isSafeInteger(pastTransferGuests) && pastTransferGuests > 0;
      const calculation = `Sheet transfer cost × ${headcount ?? 'missing out-of-town count'} ÷ past transfer guests ${validPastCount ? pastTransferGuests : 'missing'}${applyPremium !== 1 ? ` × ${applyPremium} seasonal premium` : ''}`;
      const line = validPastCount
        ? price(head.name, head, head, headcount !== null ? headcount / pastTransferGuests! * applyPremium : null, headcount, calculation, headcount!, pastTransferGuests!)
        : quote(head.name, 'Guests the past transfers covered is missing or invalid. Enter a positive whole guest count.', headcount);
      lines = [{ ...line, source: `${budget.sheet} · ${head.name} · row ${head.row}`, original: head }];
    } else if (head.row === food?.row && requirements.fromBriefForm && !requirements.functions.length) {
      lines = [quote(head.name, 'No function guest counts stated in the client brief form.')];
    } else if (head.row === food?.row && requirements.functions.length) {
      lines = requirements.functions.map((f, i) => {
        const label = `${f.day.value} · ${/high\s*tea.*ceremon/i.test(f.name.value) ? 'High tea (food only)' : f.name.value}`;
        const kind = mealKind(f.name.value);
        const lunches = requirements.functions.filter(l => l.day.value === f.day.value && mealKind(l.name.value) === 'lunch');
        const guests = kind === 'tea' ? (lunches.length === 1 ? numberIn(lunches[0].guests.value) : null) : numberIn(f.guests.value);
        const row = foodRowsForFunction(budget,requirements,i).find(item => item.row === meals[i]) as ProposalRow | undefined;
        if (!row || !kind) return quote(label, 'No confirmed matching meal row in the sheet.', guests);
        return price(label, head, row, guests !== null && row.quantity ? guests / row.quantity * applyPremium : null, guests, `Sheet pre-GST cost ÷ sheet quantity ${row.quantity ?? 'missing'} × ${guests ?? 'missing'} guests${kind === 'tea' ? ' (same as lunch)' : ''}${applyPremium !== 1 ? ` × ${applyPremium} seasonal premium` : ''}`, guests!, row.quantity!);
      });
      // Alcohol is a separate historical line; it is not silently bundled into meals.
      for (const row of head.items.filter(r => /alcohol/i.test(r.name))) lines.push(price(row.name, head, row, basis === 'headcount' ? headcount && benchmark ? headcount / benchmark * applyPremium : null : applyPremium, headcount, basis === 'fixed' ? 'Fixed historical sheet cost' : `Sheet cost × ${headcount ?? 'missing'} ÷ benchmark ${benchmark ?? 'missing'}`, basis === 'headcount' ? headcount! : 1, basis === 'headcount' ? benchmark! : 1));
    } else {
      const directNotes=(requirements.serviceNotes??[]).filter(note=>!hasServiceAliases(note.name)||matchesServiceName(note.name,head.name));
      const itemServices=(requirements.serviceNotes??[]).filter(note=>hasServiceAliases(note.name)&&serviceHead(note.name,budget)?.name===head.name&&!matchesServiceName(note.name,head.name));
      const selectedItems=requirements.fromBriefForm&&!formHeadNeeded(head,budget,{...requirements,serviceNotes:directNotes})?head.items.filter(item=>itemServices.some(note=>matchesServiceName(note.name,item.name))):[];
      const rows=selectedItems.length?selectedItems:[head];
      lines = rows.map(row=>price(row.name, head, row, basis === 'headcount' ? headcount && benchmark ? headcount / benchmark * applyPremium : null : applyPremium, headcount, `${basis === 'fixed' ? 'Fixed historical sheet cost' : `Sheet cost × ${headcount ?? 'missing'} ÷ benchmark ${benchmark ?? 'missing'}`}${applyPremium !== 1 ? ` × ${applyPremium} seasonal premium` : ''}`, basis === 'headcount' ? headcount! : 1, basis === 'headcount' ? benchmark! : 1));
    }
    const matchedServices=addedServiceNames.filter(name=>serviceHead(name,budget)?.name===head.name);
    return { name: head.name, headcount, lines, amount: lines.some(l => l.amount !== null) ? money(lines.reduce((sum, l) => sum + (l.amount ?? 0), 0)) : null,...(matchedServices.length?{matchedServices}:{}) };
  });
  const extras = requirements.scalingRules.filter(r => !mappedHeads(r.head.value, budget).length && !(hasServiceAliases(r.head.value)&&serviceHead(r.head.value,budget)) && !(requirements.fromBriefForm&&hasServiceAliases(r.head.value)&&!(requirements.serviceNotes??[]).some(note=>note.name===r.head.value&&note.text.trim()&&!/^(?:0(?:\.0+)?|none)$/i.test(note.text.trim())))).map(r => quote(r.head.value || 'Unnamed requirement', 'No matching sheet row.'));
  for (const note of requirements.serviceNotes??[]) if (hasServiceAliases(note.name) && note.text.trim() && !serviceHead(note.name,budget) && !extras.some(line=>line.label===note.name)) extras.push(quote(note.name,'No matching sheet row.'));
  extras.push(...requirements.functions.filter(f => /high\s*tea.*ceremon/i.test(f.name.value)).map(f => quote(`${f.day.value} · Small ceremonies`, 'No matching sheet row for the small ceremonies.')));
  if (requirements.fields.rooms.value || requirements.roomNights?.length) {
    const label = 'Accommodation · rooms and nights';
    const rooms = numberIn(requirements.fields.rooms.value), nights = numberIn(requirements.fields.nights.value);
    const rateText = /(?:₹|Rs\.?|INR)\s*(\d[\d,]*(?:\.\d+)?)/i.exec(requirements.fields.roomRate.value)?.[1] ?? requirements.fields.roomRate.value;
    const rate = numberIn(rateText);
    const roomNights = requirements.roomNights ? totalRoomNights(requirements.roomNights) : rooms && nights ? rooms*nights : null;
    const amount = roomNights !== null && (requirements.roomNights ? rate !== null : Boolean(rate)) ? money(roomNights * rate!) : null;
    if (useBriefRooms && amount !== null && Number.isSafeInteger(Math.round(amount * 100))) {
      // The project head explicitly authorizes this exception to sheet-only pricing.
      for (let i=extras.length-1;i>=0;i--) if (/accommodation|rooms|hotel stay/i.test(extras[i].label)) extras.splice(i,1);
      extras.push({label, amount, source:'Client brief · rooms, room rate and nights · confirmed by project head',headcount:null,pricing:requirements.roomNights ? {quantity:roomNights!,unitCost:rate!,multiplier:1} : {quantity:rooms!,unitCost:rate!,multiplier:nights!},calculation:requirements.roomNights ? `${roomNights} room nights × ${rupees(rate!)} per room night; quoted room rate, no further season increase` : `${rooms} rooms × ${rupees(rate!)} per room night × ${nights} nights; quoted room rate, no further season increase`});
    } else if (!extras.some(l=>/accommodation|rooms|hotel stay/i.test(l.label))) extras.push(quote(label, 'No accommodation row in the uploaded sheet.'));
  }
  if (!food) extras.push(...requirements.functions.map(f => quote(`${f.day.value} · ${f.name.value}`, 'No matching food head in the uploaded sheet.')));
  const roomLines=extras.filter(line=>/accommodation|rooms|hotel stay/i.test(line.label));
  if(requirements.fromBriefForm && !(requirements.roomNights??[]).some(row=>numberIn(row.value)!==null) && numberIn(requirements.fields.rooms.value)===null){roomLines.length=0;}
  if(requirements.fromBriefForm && !roomLines.length)roomLines.push({label:'Accommodation · rooms and nights',amount:0,source:null,headcount:null,calculation:'Not in this brief (₹0)',pricing:{quantity:0,unitCost:0,multiplier:1}});
  if(roomLines.length){
    for(let i=extras.length-1;i>=0;i--)if(/accommodation|rooms|hotel stay/i.test(extras[i].label))extras.splice(i,1);
    const foodIndex=heads.findIndex(head=>head.name===food?.name);
    heads.splice(foodIndex<0?heads.length:foodIndex+1,0,{name:'Guest Rooms',headcount:null,lines:roomLines,amount:null});
  }
  if (extras.length) {
    const other = heads.find(h => /other costs/i.test(h.name));
    if (other) other.lines.push(...extras); else heads.push({ name: 'Unmatched requirements', headcount: null, lines: extras, amount: null });
  }
  if(requirements.fromBriefForm){
    const misc=requirements.miscellaneous;
    const line:Line={label:misc?.description||'Miscellaneous',amount:misc?misc.amount:0,source:misc?'Entered by planner':null,headcount:null,calculation:!misc||misc.amount===0?'Not in this brief (₹0)':misc.description||'Entered by planner',...(misc?.amount!==null&&misc?.amount!==undefined?{pricing:{quantity:1,unitCost:misc.amount,multiplier:1}}:{})};
    const existing=heads.findIndex(head=>head.name==='Miscellaneous');
    if(existing>=0)heads.splice(existing,1);
    heads.push({name:'Miscellaneous',headcount:null,lines:[line],amount:line.amount});
  }
  for (const h of heads) h.amount = h.lines.some(l=>l.amount!==null) ? money(h.lines.reduce((sum,l)=>sum+(l.amount??0),0)) : null;
  return { heads, toQuote: heads.flatMap(h => h.lines).filter(l => l.amount === null), total: money(heads.flatMap(h => h.lines).reduce((sum, l) => sum + (l.amount ?? 0), 0)),...(requirements.fromBriefForm?{notInBrief:[...new Set([...addedServiceNames.filter(name=>!serviceHead(name,budget)&&!(requirements.serviceNotes??[]).some(note=>note.name===name&&note.text.trim()&&!/^(?:0(?:\.0+)?|none)$/i.test(note.text.trim()))),...budget.heads.filter(head=>!formHeadNeeded(head,budget,requirements)).map(head=>head.name),...heads.filter(head=>head.lines.every(line=>line.amount===0&&line.calculation==='Not in this brief (₹0)')).map(head=>head.name)])]}:{}) };
}
export type RangedProposal = Proposal & { variancePercentage: number; varianceSource: string };
export function variancePercentage(text: string): number | null {
  const match = /^(?:±|\+\/-|plus\s*(?:or|\/)?\s*minus)?\s*(\d+(?:\.\d+)?)\s*%(?:\s+[^\d%]*)?$/i.exec(text.trim());
  const percentage = match ? Number(match[1]) : NaN;
  return Number.isFinite(percentage) && percentage >= 0 && percentage <= 100 ? percentage : null;
}
export function costRange(midpoint: number, percentage: number): { low: number; high: number } {
  if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) throw new Error('Choose a variance from 0% to 100%.');
  return { low: money(midpoint * (1 - percentage / 100)), high: money(midpoint * (1 + percentage / 100)) };
}
export function applyVariance(proposal: Proposal, percentage: number, source: string): RangedProposal {
  costRange(proposal.total, percentage);
  return { ...proposal, variancePercentage: percentage, varianceSource: source };
}
export function rangeFigure(midpoint: number | null, percentage: number): string {
  if (midpoint === null) return 'To quote';
  const range = costRange(midpoint, percentage);
  return `${rupees(range.low)}–${rupees(range.high)} · midpoint ${rupees(midpoint)}`;
}
export function rawProposal(proposal: Proposal | RangedProposal): string {
  const ranged = 'variancePercentage' in proposal;
  const figure = (amount: number | null) => ranged ? rangeFigure(amount, proposal.variancePercentage) : amount === null ? 'To quote' : rupees(amount);
  return [...(ranged ? [`Range: ±${proposal.variancePercentage}% around each midpoint — ${proposal.varianceSource}`] : []), ...proposal.heads.flatMap(h => [`${h.name} — ${figure(h.amount)} · headcount ${h.headcount ?? 'per function / not set'}`, ...h.lines.map(l => `${l.label} — ${figure(l.amount)}${l.source ? ` — ${l.source}` : ''}${l.headcount ? ` · ${l.headcount} guests` : ''}${l.source?.startsWith('Client brief') ? ` · ${l.calculation}` : ''}`,)]), `Pre-GST total (priced lines only): ${figure(proposal.total)}`, `To quote: ${proposal.toQuote.length} lines excluded from total.`].join('\n');
}
