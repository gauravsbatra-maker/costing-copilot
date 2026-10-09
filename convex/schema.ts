import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
import { authTables } from '@convex-dev/auth/server';
export default defineSchema({
  ...authTables,
  costings: defineTable({ owner: v.id("users"), snapshot: v.string(), total: v.string(), title: v.string() }).index("by_owner", ["owner"]),
  aiCallLimits: defineTable({ name: v.literal('brief'), attempts: v.array(v.number()) }).index('by_name', ['name']),
});
