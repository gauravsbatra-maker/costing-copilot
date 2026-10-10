import { reviewEvent } from './reviewEvent';
import { missingField } from './brief';

// Read display context only, including snapshots saved before richer list labels.
export function savedCostingLabel(snapshot: string, fallback: string): string {
  try {
    const saved = JSON.parse(snapshot);
    const fields = saved?.requirements?.fields;
    const city = typeof fields?.city?.value === 'string' && fields.city.value.trim() ? fields.city.value.trim() : fallback;
    const dates = typeof fields?.dates?.value === 'string' ? fields.dates.value.trim() : '';
    const type = typeof saved?.brief === 'string' ? reviewEvent(saved.brief, missingField()).type : null;
    return type && dates && !/^(?:not (?:stated|specified|provided|confirmed)|unknown|unclear|tbc|tbd|none|n\/a)\b/i.test(dates)
      ? `${type} · ${dates} · ${city}` : city;
  } catch {
    return fallback;
  }
}
