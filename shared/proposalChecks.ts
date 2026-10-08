import { fieldLabels, type BriefField, type FieldKey, type Requirements } from './brief.ts';
import type { Budget } from './costing.ts';
import { mapHead, mappedHeads, mealKind, numberIn, ruleForHead, type Basis, type RangedProposal } from './proposal.ts';
import { suggestedHeadChoices } from './reviewChoices.ts';
import type { ContingencyChoice } from './contingency.ts';

export type ProposalChecks = { assumptions: string[]; summary: string[]; missing: string[]; uncertain: string[] };

// Explain the existing result only. Never calculate or change a price here.
export function proposalChecks(budget: Budget, requirements: Requirements, proposal: RangedProposal, drivers: Record<string, string>, bases: Record<string, Basis>, editedBases: Record<string, Basis> = {}, overrides: Record<number, number | null> = {}, pastTransferGuests: number | null = null, contingencies: Record<string, ContingencyChoice> = {}): ProposalChecks {
  const checks: ProposalChecks = { assumptions: [], summary: [], missing: [], uncertain: [] };
  const food = mapHead('Food', budget)?.name ?? 'Unmatched requirements (food)';
  const transfers = mapHead('Transfers', budget)?.name ?? 'Unmatched requirements (transfers)';
  const accommodationHead = proposal.heads.find(h => h.lines.some(l => /Accommodation|rooms|hotel stay/i.test(l.label)))?.name ?? 'Unmatched requirements';
  const accommodation = `${accommodationHead} (accommodation)`;
  const choices = suggestedHeadChoices(budget, requirements);
  const validPastCount = pastTransferGuests !== null && Number.isSafeInteger(pastTransferGuests) && pastTransferGuests > 0;
  if (mapHead('Transfers', budget) && !validPastCount) checks.missing.push(`${transfers} — Guests the past transfers covered: missing or invalid. Enter a positive whole guest count; transfers are To quote and excluded from the total.`);
  if (!requirements.functions.length) checks.missing.push(`${food} — Functions and guest counts: missing. Confirm the event schedule before sending.`);
  const affectedField = (key: FieldKey): string => {
    if (key === 'outOfTownGuests') return transfers;
    if (key === 'rooms' || key === 'nights' || key === 'roomRate') return accommodation;
    if (key === 'benchmarkHeadcount') return budget.heads.filter(h => h.name !== transfers && bases[h.name] === 'headcount').map(h => h.name).join(', ') || 'All cost heads (historical comparison)';
    return 'All cost heads';
  };
  const missing = (head: string, label: string, field: BriefField) => {
    if (field.status === 'missing' || field.status === 'unclear' || !field.value.trim()) {
      checks.missing.push(`${head} — ${label}: ${field.status === 'unclear' ? 'unclear' : 'missing'}.${field.reason ? ` ${field.reason}` : ' Confirm this before sending.'}`);
    }
  };
  for (const key of Object.keys(fieldLabels) as FieldKey[]) {
    const field = requirements.fields[key];
    missing(affectedField(key), fieldLabels[key], field);
    // A placeholder entered by the planner is still not a named event city.
    if (key === 'city' && field.value.trim() && field.status !== 'missing' && field.status !== 'unclear' && /unconfirmed|unknown|unclear|hometown|to be confirmed|\btbc\b/i.test(field.value)) {
      checks.missing.push('All cost heads — City: the event city is still unconfirmed. Enter the named event city before sending.');
    }
    if (field.status === 'corrected' && field.reason) checks.assumptions.push(`${affectedField(key)} — Pre-filled ${fieldLabels[key].toLowerCase()}: ${field.value}. ${field.reason}`);
  }
  for (const [index, f] of requirements.functions.entries()) {
    const label = [f.day.value, f.name.value].filter(Boolean).join(' · ') || `Function ${index + 1}`;
    for (const [key, field] of Object.entries(f)) {
      const affected = key === 'guests' && mealKind(f.name.value) === 'dinner' ? `${food} and cost heads using the dinner headcount` : food;
      const fieldLabel = key === 'guests' ? 'guest count' : key === 'day' ? 'day / date' : 'name';
      missing(affected, `${label} ${fieldLabel}`, field);
      if (field.status === 'corrected' && field.reason) checks.assumptions.push(`${affected} — Pre-filled ${label} ${fieldLabel}: ${field.value}. ${field.reason}`);
    }
  }
  for (const [index, row] of requirements.scalingRules.entries()) {
    const affected = mappedHeads(row.head.value, budget).map(h => h.name).join(', ') || `${accommodationHead} (unmatched requirement)`;
    missing(affected, `Requirement ${index + 1} cost head`, row.head);
    missing(affected, `${row.head.value || `Requirement ${index + 1}`} scaling rule`, row.rule);
    for (const [label, field] of [['cost head', row.head], ['scaling rule', row.rule]] as const) {
      if (field.status === 'corrected' && field.reason) checks.assumptions.push(`${affected} — Pre-filled ${label}: ${field.value}. ${field.reason}`);
    }
  }
  for (const h of budget.heads) {
    if (h.name === transfers) {
      checks.assumptions.push(`${transfers} — Transfers use ${requirements.fields.outOfTownGuests.value || 'the missing out-of-town count'} out-of-town guests; past transfers covered ${validPastCount ? pastTransferGuests : 'an unconfirmed number of'} guests. The sheet transfer cost is scaled by these two counts, not the historical event guest count. Any existing seasonal increase still applies.`);
      continue;
    }
    const choice = choices[h.name];
    const driver = drivers[h.name];
    if (driver?.trim()) {
      checks.assumptions.push(`${h.name} — Headcount choice: ${driver}. ${driver === choice.driver ? choice.reason : 'Your entered choice replaces the suggested headcount.'}`);
    } else if (proposal.heads.find(p => p.name === h.name)?.headcount !== null) {
      checks.assumptions.push(`${h.name} — Uses the shared function headcount because all function counts agree.`);
    }
    const rule = ruleForHead(h, budget, requirements);
    if (!rule.trim()) checks.missing.push(`${h.name} — Scaling rule: missing. Check the displayed cost basis before sending.`);
    const basis = bases[h.name];
    const basisText = basis === 'fixed' ? 'Keep the historical sheet cost; do not scale it by headcount.' : 'Scale the historical sheet cost by the chosen headcount divided by the historical guest count.';
    checks.assumptions.push(`${h.name} — ${editedBases[h.name] ? 'Your cost basis' : 'Pre-filled cost basis'}: ${basisText}${rule ? ` Brief rule: ${rule}.` : ' No scaling rule was stated; check this choice.'}${h.name === food ? ' Meal lines instead use their own function counts and sheet quantities.' : ''}`);
    const head = proposal.heads.find(p => p.name === h.name);
    if (head?.lines.some(l => l.amount !== null && /seasonal premium/.test(l.calculation))) {
      checks.assumptions.push(`${h.name} — Seasonal increase included in the existing cost: ${requirements.fields.seasonalPremium.value}.`);
    }
  }
  const mealHead = proposal.heads.find(h => h.name === food);
  requirements.functions.forEach((f, index) => {
    const line = mealHead?.lines[index];
    if (line?.amount !== null && line?.source) {
      checks.assumptions.push(`${food} — ${line.label}: ${Object.hasOwn(overrides, index) ? 'your selected sheet row' : 'matched by meal type and day order'}, ${line.source}. Check that the past meal is comparable.${mealKind(f.name.value) === 'tea' ? ' High tea uses the same day’s lunch headcount; small ceremonies are not included in the food price.' : ''}`);
    }
  });
  for (const head of proposal.heads) for (const line of head.lines) {
    if (line.source?.startsWith('Client brief')) checks.assumptions.push(`${head.name} — ${line.label}: uses your reviewed brief’s room count, room rate and nights, accepted when you confirmed. No further seasonal increase is added to this quoted room rate.`);
    if (line.amount === null || !line.source) {
      checks.uncertain.push(`${head.name} — ${line.label}: ${line.amount === null ? 'To quote; excluded from the total.' : 'No matching source row is recorded; check this cost.'} ${line.calculation}`);
    }
  }
  checks.assumptions.push(`All priced cost heads — The range is ${proposal.variancePercentage}% below and above each existing cost. ${proposal.varianceSource}. This percentage is not a vendor quote.`);
  checks.assumptions.push('All cost heads — Figures are before GST; tax is not included. Historical sheet costs are used as a reference, not current vendor quotes.');
  checks.summary = assumptionSummary(budget, requirements, proposal, drivers, bases, overrides, pastTransferGuests);
  const groupedContingencies = new Map<string, string[]>();
  for (const head of proposal.heads) {
    const choice = contingencies[head.name];
    if (!choice) continue;
    if (choice.percentage === null || !Number.isFinite(choice.percentage) || choice.percentage < 0 || choice.percentage > 100) {
      checks.missing.push(`${head.name} — Contingency %: missing or invalid. Enter 0% to 100% before using the total.`);
      continue;
    }
    const description = `Contingency ${choice.percentage}%: ${choice.reason}`;
    const note = head.amount === null ? ' No reserve is added while this head is To quote.' : choice.percentage === 0 ? ' No reserve is added to this head.' : ' This reserve increases both ends of this head’s range and is included in the total.';
    checks.assumptions.push(`${head.name} — ${description}.${note}`);
    const rule = description + (head.amount === null ? ' (not added until priced)' : choice.percentage === 0 ? '' : ' (included in both ends of the range)');
    groupedContingencies.set(rule, [...(groupedContingencies.get(rule) ?? []), head.name]);
  }
  for (const [rule, heads] of groupedContingencies) checks.summary.push(`${rule}: ${heads.join(', ')}.`);
  return checks;
}

function assumptionSummary(budget: Budget, requirements: Requirements, proposal: RangedProposal, drivers: Record<string, string>, bases: Record<string, Basis>, overrides: Record<number, number | null>, pastTransferGuests: number | null): string[] {
  const groups = new Map<string, Set<string>>();
  const add = (rule: string, head: string) => {
    if (!groups.has(rule)) groups.set(rule, new Set());
    groups.get(rule)!.add(head);
  };
  const count = (n: number) => new Intl.NumberFormat('en-IN').format(n);
  const food = mapHead('Food', budget)?.name ?? 'Unmatched requirements (food)';
  const transfers = mapHead('Transfers', budget)?.name;
  const choices = suggestedHeadChoices(budget, requirements);
  const roomHead = proposal.heads.find(h => h.lines.some(l => l.source?.startsWith('Client brief')))?.name;
  for (const h of budget.heads) {
    const actual = proposal.heads.find(p => p.name === h.name);
    const guests = actual?.headcount;
    if (h.name === transfers) {
      if (pastTransferGuests !== null && Number.isSafeInteger(pastTransferGuests) && pastTransferGuests > 0) add(`Transfers use ${guests != null ? count(guests) : 'the unconfirmed count of'} out-of-town guests; past transfers covered ${count(pastTransferGuests)} guests`, h.name);
      continue;
    }
    if (h.name === food && requirements.functions.length) {
      add('Meals use their own function guest counts and the sheet’s meal quantities; high tea follows the same day’s lunch count', food);
      if (actual?.lines.some(l => /alcohol/i.test(l.label) && l.amount !== null)) {
        add(bases[h.name] === 'headcount' && guests != null ? `Alcohol uses the chosen headcount of ${count(guests)}` : 'Alcohol keeps its historical cost without headcount scaling', `${food} (alcohol)`);
      }
    } else if (bases[h.name] === 'headcount' && guests != null) {
      const rule = h.name === transfers && drivers[h.name] === choices[h.name].driver
        ? `Transfers use the out-of-town guest count of ${count(guests)}`
        : drivers[h.name] === choices[h.name].driver && choices[h.name].driver.startsWith('Dinner:')
          ? `Per-person heads use the dinner count of ${count(guests)}`
          : `Per-person heads use your chosen headcount of ${count(guests)}`;
      add(rule, h.name);
    }
    const hasAlcohol = actual?.lines.some(l => /alcohol/i.test(l.label));
    const affected = h.name === food && requirements.functions.length ? `${food} (alcohol)` : h.name;
    if (h.name === food && requirements.functions.length && !hasAlcohol) continue;
    if (bases[h.name] === 'fixed') add('Keep the historical sheet cost without scaling by headcount', affected);
    else {
      const benchmark = numberIn(requirements.fields.benchmarkHeadcount.value);
      add(`Scale per-person sheet costs against the historical guest count${benchmark !== null ? ` of ${count(benchmark)}` : ' (not confirmed)'}`, affected);
    }
  }
  // Collapse preparation notes by their actual rule, rather than by function or head.
  for (const [key, field] of Object.entries(requirements.fields)) if (field.status === 'corrected' && field.reason) {
    const head = key === 'outOfTownGuests' ? transfers ?? 'Unmatched requirements (transfers)' : /rooms|nights|roomRate/.test(key) ? `${roomHead ?? 'Other Costs'} (accommodation)` : 'All cost heads';
    add(field.reason, head);
  }
  for (const f of requirements.functions) for (const field of Object.values(f)) if (field.status === 'corrected' && field.reason) add(field.reason, food);
  for (const row of requirements.scalingRules) for (const field of [row.head, row.rule]) if (field.status === 'corrected' && field.reason) {
    const heads = mappedHeads(row.head.value, budget);
    for (const head of heads) add(field.reason, head.name);
    if (!heads.length) add(field.reason, 'Unmatched requirements');
  }
  const seasonalHeads = proposal.heads.filter(h => h.lines.some(l => l.amount !== null && /seasonal premium/.test(l.calculation))).map(h => h.name);
  if (seasonalHeads.length) {
    const percentage = /^\+?(\d+(?:\.\d+)?)\s*%/.exec(requirements.fields.seasonalPremium.value.trim());
    const increase = percentage ? `+${percentage[1]}%` : requirements.fields.seasonalPremium.value;
    const allHeads = budget.heads.every(h => seasonalHeads.includes(h.name));
    const rule = `Seasonal increase of ${increase}${allHeads ? ' on all heads' : ''}${roomHead ? ', except the quoted room rate' : ''}`;
    if (allHeads) add(rule, 'All sheet cost heads');
    else for (const head of seasonalHeads) add(rule, head);
  }
  const mealLines = proposal.heads.find(h => h.name === food)?.lines ?? [];
  if (requirements.functions.some((_, i) => mealLines[i]?.amount !== null && mealLines[i]?.source && !Object.hasOwn(overrides, i))) add('Meal rows are matched by meal type and day order; check that the past meals are comparable', food);
  if (requirements.functions.some((_, i) => mealLines[i]?.amount !== null && mealLines[i]?.source && Object.hasOwn(overrides, i))) add('Use your selected meal rows; check that the past meals are comparable', food);
  if (roomHead) add('Accommodation uses the reviewed brief’s room count, quoted room rate and nights; no further seasonal increase', `${roomHead} (accommodation)`);
  add(`Cost ranges are ${proposal.variancePercentage}% below and above the existing costs; this is not a vendor quote`, 'All priced cost heads');
  add('Figures are before GST; historical costs are references, not current vendor quotes', 'All cost heads');
  return [...groups].map(([rule, heads]) => `${rule.replace(/\.$/, '')}: ${[...heads].join(', ')}.`);
}
