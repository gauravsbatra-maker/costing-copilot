import type { Budget } from './costing.ts';
import { costRange, mapHead, rupees, type RangedProposal } from './proposal.ts';

export type RangeWithMidpoint = { low: number; high: number; midpoint: number };
export type ContingencyChoice = { percentage: number | null; reason: string };
export type HeadContingency = { percentage: number; reason: string; range: RangeWithMidpoint | null; reserve: RangeWithMidpoint | null };
export type ContingencyResult = { heads: Record<string, HeadContingency>; total: RangeWithMidpoint };
const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function contingencyDefaults(budget: Budget): Record<string, number> {
  const transfers = mapHead('Transfers', budget);
  return Object.fromEntries(budget.heads.map(h => [h.name, h.row === transfers?.row ? 10 : 0]));
}
export function contingencyReason(isTransfers: boolean, percentage: number): string {
  if (percentage === 0) return 'no contingency reserve selected';
  return isTransfers ? 'transfer count and vehicle needs often change close to the date' : 'extra reserve chosen by the project head for changes and uncertain costs';
}
export function contingencyFigure(range: RangeWithMidpoint | null): string {
  return range ? `${rupees(range.low)}–${rupees(range.high)} · midpoint ${rupees(range.midpoint)}` : 'To quote';
}

// Keep sheet prices and source lines intact. Add each reserve to the existing range.
export function applyContingencies(proposal: RangedProposal, percentages: Record<string, number>, transferHeadName?: string): ContingencyResult {
  const total = { ...costRange(proposal.total, proposal.variancePercentage), midpoint: proposal.total };
  const heads: Record<string, HeadContingency> = {};
  for (const head of proposal.heads) {
    const percentage = percentages[head.name] ?? 0;
    if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) throw new Error('Choose a contingency from 0% to 100%.');
    const reason = contingencyReason(head.name === transferHeadName, percentage);
    if (head.amount === null) {
      heads[head.name] = { percentage, reason, range: null, reserve: null };
      continue;
    }
    const base = { ...costRange(head.amount, proposal.variancePercentage), midpoint: head.amount };
    const range = { low: money(base.low * (1 + percentage / 100)), high: money(base.high * (1 + percentage / 100)), midpoint: money(base.midpoint * (1 + percentage / 100)) };
    const reserve = { low: money(range.low - base.low), high: money(range.high - base.high), midpoint: money(range.midpoint - base.midpoint) };
    heads[head.name] = { percentage, reason, range, reserve };
    // Add rounded reserves to the original total, so 0% preserves it exactly.
    total.low = money(total.low + reserve.low);
    total.high = money(total.high + reserve.high);
    total.midpoint = money(total.midpoint + reserve.midpoint);
  }
  return { heads, total };
}
