import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
// Operational timestamps only: no brief, requirements, costing or user data.
export default defineSchema({
  aiCallLimits: defineTable({ name: v.literal('brief'), attempts: v.array(v.number()) }).index('by_name', ['name']),
});
