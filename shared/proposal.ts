import * as XLSX from 'xlsx';
import { readCosting, type Budget, type CostHead, type CostRow } from './costing.ts';
import type { Requirements } from './brief.ts';
export type ProposalRow = CostRow & { quantity?: number; rate?: number };
export type Basis = 'fixed' | 'headcount';
export type Line = { label: string; amount: number | null; source: string | null; original?: ProposalRow; headcount: number | null; calculation: string };
export type Proposal = { heads: { name: string; headcount: number | null; lines: Line[]; amount: number | null }[]; toQuote: Line[]; total: number };
const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
export function numberIn(s: string): number | null {
  const matches = s.match(/\d[\d,]*(?:\.\d+)?/g);
  if (matches?.length !== 1) return null;
  const n = Number(matches[0].replaceAll(',', ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}
export function readProposalSheet(data: ArrayBuffer | Uint8Array): Budget {
  const workbook = XLSX.read(data, { type: 'array', sheets: ['Overall WIP'] });
  const sheet = workbook.Sheets['Overall WIP'];
  if (!sheet) throw new Error('This file has no Overall WIP tab. Upload the costing sheet from a past project.');
  // Reuse the unchanged milestone 1 reader on an in-memory, one-tab workbook.
  const only = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(only, sheet, 'Overall WIP');
  const budget = readCosting(XLSX.write(only, { type: 'array', bookType: 'xlsx' }));
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: true, defval: null });
  const header = rows.find(row => clean(String(row[0])) === 'srno');
  const qty = header?.findIndex(v => clean(String(v)) === 'qty') ?? -1;
  const rate = header?.findIndex(v => clean(String(v)) === 'rate') ?? -1;
  for (const head of budget.heads) for (const item of head.items) {
    const row = item as ProposalRow;
    const q = rows[item.row - 1]?.[qty], r = rows[item.row - 1]?.[rate];
    if (typeof q === 'number' && Number.isFinite(q) && q > 0) row.quantity = q;
    if (typeof r === 'number' && Number.isFinite(r) && r >= 0) row.rate = r;
  }
  return budget;
}
export function mapHead(name: string, budget: Budget): CostHead | null {
  const exact = budget.heads.find(h => clean(h.name) === clean(name)); if (exact) return exact;
  const aliases: [RegExp, RegExp][] = [
    [/^(food|catering|meals|fb|fbandalcohol|foodandalcohol)$/, /taj hotel|food|catering/i], [/^(production|technicals|sound|lighting)$/, /technical|production/i],
    [/^(decor|florals|decoration)$/, /decor/i], [/^(transport|transfers|gueststransfer)$/, /guests transfer/i],
    [/^(bartenders|bar)$/, /bar tenders/i], [/^(entertainment|artists)$/, /entertainment/i],
    [/^(licenses|permissions)$/, /licenses/i], [/^(graphicdesign|printables|invitations)$/, /graphic design/i],
    [/^(photography|photo|video|photovideo)$/, /photo.*video/i], [/^(othercosts|miscellaneous)$/, /other costs/i],
  ];
  const alias = aliases.find(([pattern]) => pattern.test(clean(name)));
  return alias ? budget.heads.find(h => alias[1].test(h.name)) ?? null : null;
}
export function mealKind(name: string): string | null {
  if (/high\s*tea/i.test(name)) return 'tea'; if (/lunch/i.test(name)) return 'lunch';
  if (/after|afters/i.test(name)) return 'afters'; if (/dinner|sangeet|reception/i.test(name)) return 'dinner';
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
export function matchMeals(budget: Budget, requirements: Requirements): Record<number, number | null> {
  const food = mapHead('Food', budget); if (!food) return {};
  const days = [...new Set(requirements.functions.map(f => f.day.value))];
  const matched: Record<number, number | null> = {};
  requirements.functions.forEach((f, index) => {
    const kind = mealKind(f.name.value);
    const candidates = food.items.filter(item => kind && mealKind(item.name) === kind);
    // Chronological function order, not a guessed price or a fuzzy row match.
    const day = days.indexOf(f.day.value);
    matched[index] = candidates[day]?.row ?? (candidates.length === 1 ? candidates[0].row : null);
  });
  return matched;
}
const money = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export const rupees = (n: number) => `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n)}`;
export function buildProposal(budget: Budget, requirements: Requirements, drivers: Record<string, string>, bases: Record<string, Basis>, overrides: Record<number, number | null>, useBriefRooms = false): Proposal {
  const benchmark = numberIn(requirements.fields.benchmarkHeadcount.value);
  const meals = { ...matchMeals(budget, requirements), ...overrides };
  const premiumText = requirements.fields.seasonalPremium.value;
  const premiumMatch = /^\+?(\d+(?:\.\d+)?)\s*%/.exec(premiumText.trim());
  const premium = premiumMatch ? Number(premiumMatch[1]) / 100 : 0;
  const quote = (label: string, reason: string, headcount: number | null = null): Line => ({ label, amount: null, source: null, headcount, calculation: reason });
  const price = (label: string, head: CostHead, row: ProposalRow, multiplier: number | null, headcount: number | null, calculation: string): Line => {
    if (typeof row.cost !== 'number' || row.cost < 0 || multiplier === null || !Number.isFinite(multiplier)) return quote(label, 'No readable sheet cost or confirmed calculation basis.', headcount);
    const amount = money(row.cost * multiplier);
    if (!Number.isSafeInteger(Math.round(amount * 100))) return quote(label, 'Cost is too large to calculate safely.', headcount);
    return { label, amount, source: `Overall WIP · ${head.name} · row ${row.row}`, original: row, headcount, calculation };
  };
  const food = mapHead('Food', budget);
  const heads = budget.heads.map(head => {
    const headcount = numberIn(drivers[head.name] ?? '') ?? (new Set(requirements.functions.map(f => numberIn(f.guests.value))).size === 1 ? numberIn(requirements.functions[0]?.guests.value ?? '') : null);
    const rule = ruleForHead(head,budget,requirements);
    const basis = bases[head.name] ?? defaultBasis(rule);
    const globalPremium = /across all heads|all heads/i.test(`${premiumText} ${requirements.fields.seasonalPremium.source}`);
    const needsPremium = globalPremium || /seasonal|premium/i.test(rule);
    const applyPremium = needsPremium ? (premiumMatch ? 1 + premium : /no|none|0/i.test(premiumText) ? 1 : NaN) : 1;
    let lines: Line[];
    if (head.row === food?.row && requirements.functions.length) {
      lines = requirements.functions.map((f, i) => {
        const label = `${f.day.value} · ${/high\s*tea.*ceremon/i.test(f.name.value) ? 'High tea (food only)' : f.name.value}`;
        const kind = mealKind(f.name.value);
        const lunches = requirements.functions.filter(l => l.day.value === f.day.value && mealKind(l.name.value) === 'lunch');
        const guests = kind === 'tea' ? (lunches.length === 1 ? numberIn(lunches[0].guests.value) : null) : numberIn(f.guests.value);
        const row = head.items.find(item => item.row === meals[i]) as ProposalRow | undefined;
        if (!row || !kind) return quote(label, 'No confirmed matching meal row in the sheet.', guests);
        return price(label, head, row, guests !== null && row.quantity ? guests / row.quantity * applyPremium : null, guests, `Sheet pre-GST cost ÷ sheet quantity ${row.quantity ?? 'missing'} × ${guests ?? 'missing'} guests${kind === 'tea' ? ' (same as lunch)' : ''}${applyPremium !== 1 ? ` × ${applyPremium} seasonal premium` : ''}`);
      });
      // Alcohol is a separate historical line; it is not silently bundled into meals.
      for (const row of head.items.filter(r => /alcohol/i.test(r.name))) lines.push(price(row.name, head, row, basis === 'headcount' ? headcount && benchmark ? headcount / benchmark * applyPremium : null : applyPremium, headcount, basis === 'fixed' ? 'Fixed historical sheet cost' : `Sheet cost × ${headcount ?? 'missing'} ÷ benchmark ${benchmark ?? 'missing'}`));
    } else {
      lines = [price(head.name, head, head, basis === 'headcount' ? headcount && benchmark ? headcount / benchmark * applyPremium : null : applyPremium, headcount, `${basis === 'fixed' ? 'Fixed historical sheet cost' : `Sheet cost × ${headcount ?? 'missing'} ÷ benchmark ${benchmark ?? 'missing'}`}${applyPremium !== 1 ? ` × ${applyPremium} seasonal premium` : ''}`)];
    }
    return { name: head.name, headcount, lines, amount: lines.some(l => l.amount !== null) ? money(lines.reduce((sum, l) => sum + (l.amount ?? 0), 0)) : null };
  });
  const extras = requirements.scalingRules.filter(r => !mappedHeads(r.head.value, budget).length).map(r => quote(r.head.value || 'Unnamed requirement', 'No matching sheet row.'));
  extras.push(...requirements.functions.filter(f => /high\s*tea.*ceremon/i.test(f.name.value)).map(f => quote(`${f.day.value} · Small ceremonies`, 'No matching sheet row for the small ceremonies.')));
  if (requirements.fields.rooms.value) {
    const label = 'Accommodation · rooms and nights';
    const rooms = numberIn(requirements.fields.rooms.value), nights = numberIn(requirements.fields.nights.value);
    const rateText = /(?:₹|Rs\.?|INR)\s*(\d[\d,]*(?:\.\d+)?)/i.exec(requirements.fields.roomRate.value)?.[1] ?? requirements.fields.roomRate.value;
    const rate = numberIn(rateText);
    const amount = rooms && nights && rate ? money(rooms * nights * rate) : null;
    if (useBriefRooms && amount !== null && Number.isSafeInteger(Math.round(amount * 100))) {
      // The project head explicitly authorizes this exception to sheet-only pricing.
      for (let i=extras.length-1;i>=0;i--) if (/accommodation|rooms|hotel stay/i.test(extras[i].label)) extras.splice(i,1);
      extras.push({label, amount, source:'Client brief · rooms, room rate and nights · confirmed by project head',headcount:null,calculation:`${rooms} rooms × ${rupees(rate!)} per room night × ${nights} nights; quoted room rate, no further season increase`});
    } else if (!extras.some(l=>/accommodation|rooms|hotel stay/i.test(l.label))) extras.push(quote(label, 'No accommodation row in the uploaded sheet.'));
  }
  if (!food) extras.push(...requirements.functions.map(f => quote(`${f.day.value} · ${f.name.value}`, 'No matching food head in the uploaded sheet.')));
  if (extras.length) {
    const other = heads.find(h => /other costs/i.test(h.name));
    if (other) other.lines.push(...extras); else heads.push({ name: 'Unmatched requirements', headcount: null, lines: extras, amount: null });
  }
  for (const h of heads) h.amount = h.lines.some(l=>l.amount!==null) ? money(h.lines.reduce((sum,l)=>sum+(l.amount??0),0)) : null;
  return { heads, toQuote: heads.flatMap(h => h.lines).filter(l => l.amount === null), total: money(heads.flatMap(h => h.lines).reduce((sum, l) => sum + (l.amount ?? 0), 0)) };
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
