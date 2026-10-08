import { missingField, type BriefField } from './brief.ts';

// null means untouched: trust only the existing validated event-city extraction.
// A planner's entry, including clearing the box, takes priority over extraction.
export function selectedEventCity(extracted: BriefField, plannerEntry: string | null): BriefField {
  if (plannerEntry === null) return extracted;
  const value = plannerEntry.trim();
  return value ? { value, status: 'corrected', source: '', reason: '' } : missingField();
}
