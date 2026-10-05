import { v } from 'convex/values';
import { fieldLabels } from '../shared/brief';
export const fieldValidator = v.object({
  value: v.string(), status: v.union(v.literal('provided'), v.literal('missing'), v.literal('unclear'), v.literal('corrected')),
  source: v.string(), reason: v.string(),
});
export const requirementsValidator = v.object({
  fields: v.object(Object.fromEntries(Object.keys(fieldLabels).map(key => [key, fieldValidator])) as Record<keyof typeof fieldLabels, typeof fieldValidator>),
  functions: v.array(v.object({ day: fieldValidator, name: fieldValidator, guests: fieldValidator })),
  scalingRules: v.array(v.object({ head: fieldValidator, rule: fieldValidator })),
});
