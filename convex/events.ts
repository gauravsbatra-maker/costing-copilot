import { query, mutation } from './_generated/server';
import type { QueryCtx, MutationCtx } from './_generated/server';
import { v, ConvexError } from 'convex/values';
import { category, response } from './schema';
import { starterTasks } from '../shared/planning';

function fail(message:string):never { throw new ConvexError(message); }
async function hash(key:string) {
  if (!/^[a-f0-9]{64}$/.test(key)) fail('This link is invalid. Use the full link you saved.');
  const bytes = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(key));
  return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
}
function text(value:string,label:string,max=200) { const result=value.trim(); if(!result||result.length>max) fail(`${label} must contain 1–${max} characters.`); return result; }
function bounded(value:number,label:string,max:number,integer=false) { if(!Number.isFinite(value)||value<0||value>max||(integer&&!Number.isInteger(value))) fail(`${label} must be ${integer?'a whole number':'a number'} between 0 and ${max}.`); }
function date(value:string) { if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value+'T12:00:00Z'))||new Date(value+'T12:00:00Z').toISOString().slice(0,10)!==value) fail('Enter a valid date.'); }
function details(args:{title:string,date:string,time:string,location:string,guests:number,budgetCents:number,message:string}) {
  text(args.title,'Event name',100); date(args.date); if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(args.time)) fail('Enter a valid time.');
  if(args.location.length>300||args.message.length>1000) fail('Keep the address under 300 characters and invitation message under 1000.');
  bounded(args.guests,'Guest count',500,true); if(args.guests<1) fail('Plan for at least one guest.'); bounded(args.budgetCents,'Budget',100000000,true);
}
const detailsArgs={title:v.string(),date:v.string(),time:v.string(),location:v.string(),guests:v.number(),budgetCents:v.number(),message:v.string()};
export const create=mutation({args:{hostKey:v.string(),inviteKey:v.string(),...detailsArgs},returns:v.null(),handler:async(ctx,args)=>{
  details(args); const hostHash=await hash(args.hostKey), inviteHash=await hash(args.inviteKey);
  if(hostHash===inviteHash) fail('Create separate host and invitation links.');
  if(await ctx.db.query('events').withIndex('by_host',q=>q.eq('hostHash',hostHash)).unique()) fail('This plan already exists. Open your saved host link.');
  if(await ctx.db.query('events').withIndex('by_invite',q=>q.eq('inviteHash',inviteHash)).unique()) fail('Please try creating the plan again.');
  const {hostKey,inviteKey,...values}=args;
  const eventId=await ctx.db.insert('events',{...values,title:args.title.trim(),hostHash,inviteHash,inviteKey});
  for(const task of starterTasks(args.date,args.guests)) await ctx.db.insert('tasks',{...task,eventId});
  return null;
}});
export const get=query({args:{hostKey:v.string()},returns:v.any(),handler:async(ctx,args)=>{
  const event=await requireHost(ctx,args.hostKey); if(!event) return null;
  const {hostHash,inviteHash,...safe}=event;
  return {event:safe,tasks:await ctx.db.query('tasks').withIndex('by_event',q=>q.eq('eventId',event._id)).take(300),guests:await ctx.db.query('guests').withIndex('by_event',q=>q.eq('eventId',event._id)).take(500)};
}});
async function requireHost(ctx:QueryCtx|MutationCtx,key:string) {
  const digest=await hash(key);
  return await ctx.db.query('events').withIndex('by_host',q=>q.eq('hostHash',digest)).unique();
}
export const update=mutation({args:{hostKey:v.string(),...detailsArgs},returns:v.null(),handler:async(ctx,args)=>{
  const event=await requireHost(ctx,args.hostKey); if(!event) fail('Plan not found. Check your private host link.'); details(args);
  const {hostKey,...values}=args; await ctx.db.patch(event._id,{...values,title:args.title.trim()}); return null;
}});
export const invitation=query({args:{inviteKey:v.string()},returns:v.any(),handler:async(ctx,args)=>{
  const digest=await hash(args.inviteKey); const event=await ctx.db.query('events').withIndex('by_invite',q=>q.eq('inviteHash',digest)).unique();
  if(!event) return null;
  return {title:event.title,date:event.date,time:event.time,location:event.location,message:event.message};
}});
export const myReply=query({args:{inviteKey:v.string(),clientKey:v.string()},returns:v.any(),handler:async(ctx,args)=>{
  const digest=await hash(args.inviteKey); const event=await ctx.db.query('events').withIndex('by_invite',q=>q.eq('inviteHash',digest)).unique(); if(!event) return null;
  const clientHash=await hash(args.clientKey); const reply=await ctx.db.query('guests').withIndex('by_client',q=>q.eq('eventId',event._id).eq('clientHash',clientHash)).unique();
  return reply ? {name:reply.name,response:reply.response,partySize:reply.partySize,notes:reply.notes}:null;
}});
const guestArgs={name:v.string(),response,partySize:v.number(),notes:v.string()};
function guestDetails(args:{name:string,partySize:number,notes:string}) {text(args.name,'Name',100);bounded(args.partySize,'Party size',50,true);if(args.partySize<1)fail('Enter at least one person.');if(args.notes.length>500)fail('Keep your note under 500 characters.');}
export const rsvp=mutation({args:{inviteKey:v.string(),clientKey:v.string(),...guestArgs},returns:v.null(),handler:async(ctx,args)=>{
  guestDetails(args);const digest=await hash(args.inviteKey),clientHash=await hash(args.clientKey);
  const event=await ctx.db.query('events').withIndex('by_invite',q=>q.eq('inviteHash',digest)).unique();if(!event)fail('Invitation not found. Ask the host for a new link.');
  const existing=await ctx.db.query('guests').withIndex('by_client',q=>q.eq('eventId',event._id).eq('clientHash',clientHash)).unique();
  const values={name:args.name.trim(),response:args.response,partySize:args.partySize,notes:args.notes.trim()};
  if(existing)await ctx.db.patch(existing._id,values); else { const all=await ctx.db.query('guests').withIndex('by_event',q=>q.eq('eventId',event._id)).take(500);if(all.length>=500)fail('This guest list is full. Please contact the host.'); await ctx.db.insert('guests',{...values,eventId:event._id,clientHash});}return null;
}});
export const saveGuest=mutation({args:{hostKey:v.string(),guestId:v.optional(v.id('guests')),...guestArgs},returns:v.null(),handler:async(ctx,args)=>{
  const event=await requireHost(ctx,args.hostKey);if(!event)fail('Plan not found.');guestDetails(args);
  const values={name:args.name.trim(),response:args.response,partySize:args.partySize,notes:args.notes.trim()};
  if(args.guestId){const guest=await ctx.db.get(args.guestId);if(!guest||guest.eventId!==event._id)fail('Guest not found in this plan.');await ctx.db.patch(guest._id,values);}
  else{const all=await ctx.db.query('guests').withIndex('by_event',q=>q.eq('eventId',event._id)).take(500);if(all.length>=500)fail('This guest list is full.');await ctx.db.insert('guests',{...values,eventId:event._id});}return null;
}});
const taskArgs={category,title:v.string(),quantity:v.number(),unit:v.string(),due:v.string(),unitPriceCents:v.optional(v.number()),actualCents:v.optional(v.number()),sourceUrl:v.optional(v.string()),checkedOn:v.optional(v.string()),notes:v.optional(v.string()),assignedTo:v.optional(v.string())};
export const saveTask=mutation({args:{hostKey:v.string(),taskId:v.optional(v.id('tasks')),...taskArgs},returns:v.null(),handler:async(ctx,args)=>{
  const event=await requireHost(ctx,args.hostKey);if(!event)fail('Plan not found.');text(args.title,'Task',160);text(args.unit,'Unit',30);date(args.due);bounded(args.quantity,'Quantity',10000);
  if(args.unitPriceCents!==undefined)bounded(args.unitPriceCents,'Unit price',100000000,true);if(args.actualCents!==undefined)bounded(args.actualCents,'Actual spend',100000000,true);
  if(args.notes && args.notes.length>1000)fail('Keep task notes under 1000 characters.');if(args.assignedTo && args.assignedTo.length>100)fail('Keep the helper name under 100 characters.');
  if(args.sourceUrl){let url:URL;try{url=new URL(args.sourceUrl);}catch{fail('Enter a valid Swiggy or Zomato URL.');}if(url!.protocol!=='https:'||!['swiggy.com','www.swiggy.com','zomato.com','www.zomato.com'].includes(url!.hostname)||url!.username||url!.password||args.sourceUrl.length>2000)fail('Use an https outlet link from swiggy.com or zomato.com.');}
  if(args.sourceUrl && args.unitPriceCents!==undefined && !args.checkedOn)fail('Add the date you checked this outlet price.');
  if(args.checkedOn)date(args.checkedOn);
  const {hostKey,taskId,...values}=args;
  if(taskId){const task=await ctx.db.get(taskId);if(!task||task.eventId!==event._id)fail('Task not found in this plan.');await ctx.db.replace(taskId,{...values,eventId:event._id,done:task.done,completedAt:task.completedAt,order:task.order});}
  else{const all=await ctx.db.query('tasks').withIndex('by_event',q=>q.eq('eventId',event._id)).take(300);if(all.length>=300)fail('This plan already has 300 tasks.');await ctx.db.insert('tasks',{...values,eventId:event._id,done:false,order:all.reduce((max,t)=>Math.max(max,t.order),-1)+1});}return null;
}});
export const setDone=mutation({args:{hostKey:v.string(),taskId:v.id('tasks'),done:v.boolean()},returns:v.null(),handler:async(ctx,args)=>{
  const event=await requireHost(ctx,args.hostKey),task=await ctx.db.get(args.taskId);if(!event||!task||task.eventId!==event._id)fail('Task not found in this plan.');await ctx.db.patch(task._id,{done:args.done,completedAt:args.done?Date.now():undefined});return null;
}});
