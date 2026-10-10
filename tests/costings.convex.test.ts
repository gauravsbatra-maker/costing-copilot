import {test,expect,vi} from 'vitest';
import {convexTest} from 'convex-test';
import schema from '../convex/schema';
import {api} from '../convex/_generated/api';
const modules=import.meta.glob('../convex/**/*.ts');
const snapshot=JSON.stringify({version:1,defaults:{Transfers:10},contingencies:{Transfers:20},lines:{heads:[]},priced:{total:{midpoint:110}},brief:'Invented celebration',budget:{heads:Array.from({length:10},(_,i)=>({name:`Head ${i}`}))},requirements:{fields:{city:{value:'Invented city'}}},drivers:{Decor:'Dinner: 100'},state:{lineEdits:{Decor:{contingency:'20'}},pastTransferGuestsEntry:'60',bases:{},overrides:{},useBriefRooms:true,confirmed:true,chosenVariance:'',generated:{signature:'invented',proposal:{heads:[]}}},total:'Pre-GST total (priced lines only): ₹100–₹120 · midpoint ₹110'});
test('saved costings are private to their owner, including direct links',async()=>{
 const t=convexTest(schema,modules);
 const [alice,bob]=await t.run(async ctx=>[await ctx.db.insert('users',{email:'alice@example.test'}),await ctx.db.insert('users',{email:'bob@example.test'})]);
 const a=t.withIdentity({subject:alice}),b=t.withIdentity({subject:bob});
 await expect(t.mutation(api.costings.save,{snapshot})).rejects.toThrow('Sign in');
 const id=await a.mutation(api.costings.save,{snapshot});
 expect(await a.query(api.costings.get,{id})).toBe(snapshot);
 expect(await a.query(api.costings.list,{})).toHaveLength(1);
 expect(await b.query(api.costings.list,{})).toEqual([]);
 expect(await b.query(api.costings.get,{id})).toBeNull();
 expect(await t.query(api.costings.get,{id})).toBeNull();
 const updated=JSON.stringify({...JSON.parse(snapshot),drivers:{Decor:'Dinner: 200'}});
 const repeats=await Promise.all([a.mutation(api.costings.save,{snapshot:updated}),a.mutation(api.costings.save,{snapshot:updated})]);
 expect(repeats).toEqual([id,id]);
 expect(await a.query(api.costings.get,{id})).toBe(updated);
 expect(await a.query(api.costings.list,{})).toHaveLength(1);
 await a.mutation(api.costings.save,{snapshot});
 const secondSnapshot=JSON.stringify({...JSON.parse(snapshot),brief:'Another invented celebration'});
 const second=await a.mutation(api.costings.save,{snapshot:secondSnapshot});
 const listed=await a.query(api.costings.list,{});
 expect(listed.map(row=>row.id)).toEqual([second,id]);
 expect(listed[0].savedAt).toBeTypeOf('number');
 await expect(t.mutation(api.costings.remove,{id})).rejects.toThrow('Sign in');
 await expect(b.mutation(api.costings.remove,{id})).rejects.toThrow('not found');
 expect(await a.query(api.costings.get,{id})).toBe(snapshot);
 await a.mutation(api.costings.remove,{id});
 expect(await a.query(api.costings.get,{id})).toBeNull();
 expect((await a.query(api.costings.list,{})).map(row=>row.id)).toEqual([second]);
 expect(await a.query(api.costings.get,{id:second})).toBe(secondSnapshot);
 await expect(a.mutation(api.costings.save,{snapshot:JSON.stringify({...JSON.parse(snapshot),workbook:'bytes'})})).rejects.toThrow('incomplete');
});

test('list labels show event, brief dates and city for older saves and safely fall back to city',async()=>{
 const t=convexTest(schema,modules);
 const owner=await t.run(ctx=>ctx.db.insert('users',{email:'labels@example.test'}));
 const a=t.withIdentity({subject:owner});
 const base={brief:'Wedding brief',requirements:{fields:{city:{value:'Mumbai'},dates:{value:'14–15 Feb'}}}};
 const copies=[base,{...base,brief:'Please plan the event.'},{...base,requirements:{fields:{city:{value:'Mumbai'}}}}, {...base,requirements:{fields:{city:{value:'Mumbai'},dates:{value:'Not stated in brief'}}}}];
 const ids=await t.run(async ctx=>{
  const ids=[];
  for(const copy of copies) ids.push(await ctx.db.insert('costings',{owner,snapshot:JSON.stringify(copy),title:'Mumbai',total:'Original total'}));
  ids.push(await ctx.db.insert('costings',{owner,snapshot:'older unreadable snapshot',title:'Mumbai',total:'Original total'}));
  return ids;
 });
 const rows=await a.query(api.costings.list,{});
 expect(rows.find(r=>r.id===ids[0])?.title).toBe('Wedding · 14–15 Feb · Mumbai');
 for(const id of ids.slice(1)) expect(rows.find(r=>r.id===id)?.title).toBe('Mumbai');
 for(const row of rows) expect(row.total).toBe('Original total');
 expect(JSON.parse((await a.query(api.costings.get,{id:ids[0]}))!)).toEqual(base);
});

test('repeat saves update one entry for two minutes and stay private to each owner',async()=>{
 const t=convexTest(schema,modules);
 const [alice,bob]=await t.run(async ctx=>[await ctx.db.insert('users',{}),await ctx.db.insert('users',{})]);
 const a=t.withIdentity({subject:alice}),b=t.withIdentity({subject:bob});
 let now=Date.now();const clock=vi.spyOn(Date,'now').mockImplementation(()=>now);
 try {
  const first=await a.mutation(api.costings.save,{snapshot});
  now+=119999;
  expect(await a.mutation(api.costings.save,{snapshot})).toBe(first);
  expect((await a.query(api.costings.list,{}))[0].savedAt).toBe(now);
  expect(await b.mutation(api.costings.save,{snapshot})).not.toBe(first);
  now+=120001;
  expect(await a.mutation(api.costings.save,{snapshot})).not.toBe(first);
  expect(await a.query(api.costings.list,{})).toHaveLength(2);
  const changed=JSON.stringify({...JSON.parse(snapshot),total:'Pre-GST total: ₹999'});
  await a.mutation(api.costings.save,{snapshot:changed});
  expect(await a.query(api.costings.list,{})).toHaveLength(3);
 }finally{clock.mockRestore();}
});
