import { applyContingencies, type ContingencyResult } from './contingency.ts';
import { costRange, rupees, type RangedProposal } from './proposal.ts';

export type LineEdit = { quantity?: string; unitCost?: string; contingency?: string };
export const lineKey = (head: string, index: number) => JSON.stringify([head, index]);
const money = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export function inputNumber(text: string): number | null {
  if (!/^\d+(?:\.\d+)?$/.test(text.trim())) return null;
  const n = Number(text);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

// Work exclusively from the already calculated proposal. Never read a file or call AI.
export function editProposal(original: RangedProposal, edits: Record<string, LineEdit>): RangedProposal {
  const heads = original.heads.map(h => {
    const lines = h.lines.map((l, i) => {
      const edit = edits[lineKey(h.name, i)];
      if (!edit || (edit.quantity === undefined && edit.unitCost === undefined)) return l;
      // A sourced line with an unconfirmed calculation (such as missing past
      // transfer guests) stays unpriced until that original basis is confirmed.
      if (!l.pricing && l.source) return l;
      const quantity = edit.quantity === undefined ? l.pricing?.quantity ?? null : inputNumber(edit.quantity);
      const unitCost = edit.unitCost === undefined ? l.pricing?.unitCost ?? null : inputNumber(edit.unitCost);
      if (l.pricing && quantity === l.pricing.quantity && unitCost === l.pricing.unitCost) return l;
      const multiplier = l.pricing?.multiplier ?? 1;
      const amount = quantity !== null && unitCost !== null ? money(quantity * unitCost * multiplier) : null;
      const safe = amount !== null && Number.isSafeInteger(Math.round(amount * 100));
      return { ...l, amount: safe ? amount : null, calculation: safe ? `Your quantity ${quantity} × unit cost ${rupees(unitCost!)}; ${l.pricing ? `× ${multiplier} from the original seasonal or nights rule` : 'cost supplied by you; no matching sheet row'}.` : 'Enter a valid quantity and unit cost to price this line.' };
    });
    return { ...h, lines, amount: lines.some(l => l.amount !== null) ? money(lines.reduce((sum,l)=>sum+(l.amount??0),0)) : null };
  });
  const delta = heads.reduce((sum,h,i)=>sum+(h.amount??0)-(original.heads[i].amount??0),0);
  return { ...original, heads, total: money(original.total+delta), toQuote: heads.flatMap(h=>h.lines).filter(l=>l.amount===null) };
}

export function applyLineContingencies(proposal: RangedProposal, percentages: Record<string, number>, defaults: Record<string, number>, transferHead?: string): ContingencyResult {
  for (const p of Object.values(percentages)) if (!Number.isFinite(p) || p<0 || p>100) throw new Error('Choose a contingency from 0% to 100%.');
  const headPercentages = Object.fromEntries(proposal.heads.map(h=>[h.name, percentages[lineKey(h.name,0)] ?? defaults[h.name] ?? 0]));
  const result = applyContingencies(proposal, headPercentages, transferHead);
  for (const h of proposal.heads) {
    const rates = h.lines.map((_,i)=>percentages[lineKey(h.name,i)] ?? defaults[h.name] ?? 0);
    if (rates.every(p=>p===headPercentages[h.name]) || h.amount===null) continue;
    const reserve = {low:0,high:0,midpoint:0};
    h.lines.forEach((l,i)=>{
      if (l.amount===null) return;
      const base = {...costRange(l.amount,proposal.variancePercentage),midpoint:l.amount};
      for (const k of ['low','high','midpoint'] as const) reserve[k]=money(reserve[k]+money(money(base[k]*(1+rates[i]/100))-base[k]));
    });
    const old = result.heads[h.name].reserve!;
    const base = {...costRange(h.amount,proposal.variancePercentage),midpoint:h.amount};
    for (const k of ['low','high','midpoint'] as const) {
      result.total[k]=money(result.total[k]-old[k]+reserve[k]);
      result.heads[h.name].range![k]=money(base[k]+reserve[k]);
    }
    result.heads[h.name].reserve=reserve;
  }
  return result;
}
