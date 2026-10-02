import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
export const category = v.union(v.literal('Food'),v.literal('Beverages'),v.literal('Alcohol'),v.literal('Decoration'),v.literal('Music'),v.literal('Housekeeping'),v.literal('Invitation & RSVP'),v.literal('Giveaways'),v.literal('Manpower'),v.literal('Crockery'),v.literal('Cutlery'),v.literal('Glassware'));
export const response = v.union(v.literal('yes'),v.literal('maybe'),v.literal('no'));
export default defineSchema({
  events: defineTable({hostHash:v.string(), inviteHash:v.string(), inviteKey:v.string(), title:v.string(), date:v.string(), time:v.string(), location:v.string(), guests:v.number(), budgetCents:v.number(), message:v.string()}).index('by_host',['hostHash']).index('by_invite',['inviteHash']),
  tasks: defineTable({eventId:v.id('events'),category,title:v.string(),quantity:v.number(),unit:v.string(),due:v.string(),done:v.boolean(),completedAt:v.optional(v.number()),order:v.number(),unitPriceCents:v.optional(v.number()),actualCents:v.optional(v.number()),sourceUrl:v.optional(v.string()),checkedOn:v.optional(v.string()),notes:v.optional(v.string()),assignedTo:v.optional(v.string())}).index('by_event',['eventId']),
  guests: defineTable({eventId:v.id('events'),clientHash:v.optional(v.string()),name:v.string(),response,partySize:v.number(),notes:v.string()}).index('by_event',['eventId']).index('by_client',['eventId','clientHash']),
});
