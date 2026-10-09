import type { BriefField } from './brief.ts';

// This is display-only context. It never enters the pricing or AI extraction.
const eventTypes = [
  'wedding anniversary', 'wedding', 'anniversary', 'birthday', 'engagement',
  'baby shower', 'corporate event', 'product launch', 'awards ceremony',
  'conference', 'convention', 'seminar', 'summit', 'conclave', 'gala',
  'fundraiser', 'fundraising event', 'reunion', 'retreat', 'exhibition',
  'trade show', 'festival', 'concert', 'tournament', 'reception', 'celebration',
];
const historical = /\b(?:benchmark|historical|previous|past|old|last year|reference project)\b|\bour\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+20\d{2}\b/i;
const absent = /^(?:not (?:stated|specified|provided|confirmed)|unknown|unclear|tbc|tbd|none|n\/a)\b/i;

export function reviewEvent(brief: string, days: BriefField): { type: string | null; label: string } {
  const passages = brief.replace(/[*_]/g, '').split(/[\r\n;]|[.!?](?=\s|$)/).map(text=>text.trim()).filter(Boolean);
  let type: string | null = null;
  for (const passage of passages) {
    if (historical.test(passage)) continue;
    const explicit = /^(?:[•📍\s]*)(?:event type|type of event|occasion|event)\s*[:=–—-]\s*([^|]+)/i.exec(passage)?.[1].trim();
    if (explicit && !absent.test(explicit)) {
      const known = eventTypes.find(name=>new RegExp(`\\b${name}\\b`,'i').test(explicit));
      type = known ?? explicit;
    } else {
      const known = eventTypes.find(name=>{
        const match = new RegExp(`\\b${name}\\b`,'i').exec(passage);
        return match && !/\b(?:not|no|unlike|rather than)\s+(?:(?:a|an|the)\s+)?$/i.test(passage.slice(0,match.index));
      });
      if (known) type = known;
      // Preserve an explicitly named unfamiliar event in a brief title too.
      if (!type) type = /^(?:[\s#•]*)(?:.*?\bsharing\s+(?:the\s+)?)?([\p{L}][\p{L}\p{N} &’'/-]{1,80}?)\s+(?:budget\s+)?brief\b/iu.exec(passage)?.[1].trim() ?? null;
    }
    if (type) break;
  }
  if (!type) return { type: null, label: 'Not stated in brief' };
  type = type[0].toUpperCase() + type.slice(1);
  // Reuse the reviewed day count; never infer duration from historical stays or functions.
  const count = (days.status==='provided' || days.status==='corrected') ? /^(\d+)\s*(?:days?)?$/i.exec(days.value.trim())?.[1] : undefined;
  return { type, label: count ? `${type} · ${count} ${Number(count)===1?'day':'days'}` : type };
}
