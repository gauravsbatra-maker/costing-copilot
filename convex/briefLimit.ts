import { internalMutation } from './_generated/server';
import { v, ConvexError } from 'convex/values';
export const reserve = internalMutation({
  args: {}, returns: v.null(),
  handler: async ctx => {
    const now = Date.now();
    const row = await ctx.db.query('aiCallLimits').withIndex('by_name', q => q.eq('name', 'brief')).unique();
    const attempts = (row?.attempts ?? []).filter(time => time > now - 60 * 60 * 1000);
    if (attempts.length >= 30) throw new ConvexError('The 30 AI calls per hour limit has been reached. Please try again later.');
    attempts.push(now);
    if (row) await ctx.db.patch(row._id, { attempts });
    else await ctx.db.insert('aiCallLimits', { name: 'brief', attempts });
    return null;
  },
});
