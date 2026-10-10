import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { getAuthUserId } from '@convex-dev/auth/server';
import { savedCostingLabel } from '../shared/savedCostingLabel';
import { readSavedCosting } from '../shared/savedCosting';
export const save = mutation({
  args: { snapshot: v.string() }, returns: v.id('costings'),
  handler: async (ctx, {snapshot}) => {
    const owner = await getAuthUserId(ctx);
    if (!owner) throw new Error('Sign in to save this costing.');
    const saved = readSavedCosting(snapshot);
    return await ctx.db.insert('costings', {owner, snapshot, total:saved.total, title: savedCostingLabel(snapshot, saved.requirements.fields.city.value || 'Saved costing')});
  },
});
export const list = query({
  args: {}, returns: v.array(v.object({id:v.id('costings'), title:v.string(), total:v.string(), savedAt:v.number()})),
  handler: async ctx => {
    const owner = await getAuthUserId(ctx);
    if (!owner) return [];
    const rows = await ctx.db.query('costings').withIndex('by_owner',q=>q.eq('owner',owner)).order('desc').take(100);
    return rows.map(r=>({id:r._id,title:savedCostingLabel(r.snapshot,r.title),total:r.total,savedAt:r._creationTime}));
  },
});
export const get = query({
  args: {id:v.id('costings')}, returns:v.union(v.string(),v.null()),
  handler: async(ctx,{id})=>{
    const owner=await getAuthUserId(ctx);
    if (!owner) return null;
    const row=await ctx.db.get(id);
    return row?.owner===owner ? row.snapshot : null;
  },
});

export const remove = mutation({
  args: {id:v.id('costings')}, returns:v.null(),
  handler: async(ctx,{id})=>{
    const owner=await getAuthUserId(ctx);
    if(!owner)throw new Error('Sign in to delete this costing.');
    const row=await ctx.db.get(id);
    if(!row || row.owner!==owner)throw new Error('Costing not found.');
    await ctx.db.delete(id);
    return null;
  },
});
