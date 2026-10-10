export const fieldLabels = {
  city: 'City', dates: 'Dates', days: 'Number of days', outOfTownGuests: 'Out-of-town guests',
  rooms: 'Rooms', nights: 'Nights', roomRate: 'Room rate', benchmarkProject: 'Benchmark project',
  benchmarkHeadcount: 'Benchmark headcount', seasonalPremium: 'Seasonal premium',
  gstTreatment: 'GST treatment', variance: 'Variance',
} as const;
export type FieldKey = keyof typeof fieldLabels;
export type BriefField = { value: string; status: 'provided' | 'missing' | 'unclear' | 'corrected'; source: string; reason: string };
export type Requirements = {
  roomNights?: BriefField[];
  fields: Record<FieldKey, BriefField>;
  functions: { day: BriefField; name: BriefField; guests: BriefField }[];
  scalingRules: { head: BriefField; rule: BriefField }[];
};
export const missingField = (): BriefField => ({ value: '', status: 'missing', source: '', reason: '' });
const stringOrNull = { type: ['string', 'null'] };
const object = (properties: Record<string, unknown>) => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });
export const briefSchema = object({
  fields: object(Object.fromEntries(Object.keys(fieldLabels).map(key => [key, stringOrNull]))),
  functions: { type: 'array', items: object({ day: stringOrNull, name: stringOrNull, guests: stringOrNull }) },
  scalingRules: { type: 'array', items: object({ head: stringOrNull, rule: stringOrNull }) },
});

const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
const assignment = '\\s*(?::|=|–|—|-|is|are|of|will be)?\\s*';
const historical = /\b(benchmark|historical|previous|past|old|last year|reference project)\b|\bour\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+20\d{2}\b/i;
const passages = (brief: string) => brief.split(/(?:[.!?](?=\s|$)|[\r\n;])+/).map(part => part.trim()).filter(Boolean);
const trace = (quote: string, value: string) => new RegExp(`(?<![\\p{L}\\p{N}])${escape(value)}(?![\\p{L}\\p{N}])`, 'iu').test(quote);
const matches = (quote: string, pattern: string) => new RegExp(pattern, 'iu').test(quote);

function cityQuote(value: string, brief: string): string | null {
  if (!verbatimQuote(value, brief)) return null;
  const v = escape(value);
  const patterns = [
    `(?:^|[,|•📍])\\s*(?:(?:event |wedding |venue )?city|event location|destination|location|venue)${assignment}${v}(?![\\p{L}\\p{N}])`,
    `(?:event|wedding|celebration|functions?)\\s+(?:is |will be |takes place |to be held |will be held |is being held )?(?:in|at)\\s+${v}(?![\\p{L}\\p{N}])`,
  ];
  return passages(brief).find(quote => trace(quote, value) && !historical.test(quote)
    && !/\b(?:guest(?:s)? (?:city|location|origin|hometown)|guest(?:s)? (?:are )?from|(?:most|all|many) guests|not confirmed|unconfirmed|maybe|might)\b/i.test(quote)
    && patterns.some(pattern => matches(quote, pattern))) ?? null;
}
function verbatimQuote(value: string, brief: string): string | null {
  const match = new RegExp(`(?<![\\p{L}\\p{N}])${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}])`, 'u').exec(brief);
  if (!match) return null;
  return brief.slice(0, match.index).split(/[\r\n]/).pop() + brief.slice(match.index).split(/[\r\n]/)[0];
}
function extractField(raw: unknown, brief: string, support: (value: string) => string | null, label: string): BriefField {
  if (raw === null || (typeof raw === 'string' && !raw.trim())) return missingField();
  if (typeof raw !== 'string' || raw.length > 500) throw new Error('The AI returned an unreadable field. Please try again.');
  if (raw.startsWith('Unclear:')) return { value: '', status: 'unclear', source: '', reason: raw.slice(8).trim() || 'The brief is ambiguous.' };
  const quote = support(raw.trim());
  if (!quote) return { value: '', status: 'unclear', source: '', reason: `The returned ${label.toLowerCase()} is not quoted word for word in the brief.` };
  const value = new RegExp(`(?<![\\p{L}\\p{N}])${escape(raw.trim())}(?![\\p{L}\\p{N}])`, 'iu').exec(quote)?.[0];
  if (!value) return { value: '', status: 'unclear', source: '', reason: 'The returned value could not be traced to the brief.' };
  return { value, status: 'provided', source: quote, reason: '' };
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('The AI returned an unreadable response. Please try again.');
  return value as Record<string, unknown>;
}
export function validateRequirements(raw: unknown, brief: string): Requirements {
  const root = record(raw), fields = record(root.fields);
  if (!Array.isArray(root.functions) || !Array.isArray(root.scalingRules) || root.functions.length > 30 || root.scalingRules.length > 30) throw new Error('The AI returned an unreadable response. Please try again.');
  return {
    fields: Object.fromEntries((Object.keys(fieldLabels) as FieldKey[]).map(key => {
      const field = extractField(fields[key], brief, value => key === 'city' ? cityQuote(value, brief) : verbatimQuote(value, brief), fieldLabels[key]);
      if (key === 'city' && field.status !== 'provided' && /client[’']s hometown/i.test(brief)) {
        return [key, { value: '', status: 'unclear', source: passages(brief).find(quote => /client[’']s hometown/i.test(quote)) ?? '', reason: "brief says client's hometown" }];
      }
      return [key, field];
    })) as Requirements['fields'],
    functions: root.functions.map(value => { const row = record(value); return { day: extractField(row.day, brief, value => verbatimQuote(value, brief), 'Function day'), name: extractField(row.name, brief, value => verbatimQuote(value, brief), 'Function name'), guests: extractField(row.guests, brief, value => verbatimQuote(value, brief), 'Function guest count') }; }),
    scalingRules: root.scalingRules.map(value => { const row = record(value); return { head: extractField(row.head, brief, value => verbatimQuote(value, brief), 'Cost head'), rule: extractField(row.rule, brief, value => verbatimQuote(value, brief), 'Scaling rule') }; }),
  };
}
export function fieldNotice(field: BriefField): string {
  return field.status === 'missing' ? 'Missing' : field.status === 'unclear' ? `Unclear: ${field.reason}` : '';
}
function count(field: BriefField): number | null {
  if (field.status !== 'provided' && field.status !== 'corrected') return null;
  const numbers = field.value.match(/\d[\d,]*/g);
  if (numbers?.length !== 1) return null;
  const value = Number(numbers[0].replaceAll(',', ''));
  return Number.isSafeInteger(value) ? value : null;
}
export function hasHeadcountConflict(requirements: Requirements): boolean {
  const benchmark = count(requirements.fields.benchmarkHeadcount);
  if (benchmark === null) return false;
  return [requirements.fields.outOfTownGuests, ...requirements.functions.map(row => row.guests)]
    .some(field => { const value = count(field); return value !== null && value !== benchmark; });
}
