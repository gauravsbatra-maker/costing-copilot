import {test,expect} from 'vitest';
import {convexTest} from 'convex-test';
import schema from '../convex/schema';
import {api} from '../convex/_generated/api';
const modules=import.meta.glob('../convex/**/*.ts');
test('saved costings are private to their owner, including direct links',async()=>{
 const t=convexTest(schema,modules);
 const [alice,bob]=await t.run(async ctx=>[await ctx.db.insert('users',{email:'alice@example.test'}),await ctx.db.insert('users',{email:'bob@example.test'})]);
 const a=t.withIdentity({subject:alice}),b=t.withIdentity({subject:bob});
 const snapshot=JSON.stringify({version:1,defaults:{Transfers:10},contingencies:{Transfers:20},lines:{heads:[]},priced:{total:{midpoint:110}},brief:'Invented celebration',budget:{heads:Array.from({length:10},(_,i)=>({name:`Head ${i}`}))},requirements:{fields:{city:{value:'Invented city'}}},drivers:{Decor:'Dinner: 100'},state:{lineEdits:{Decor:{contingency:'20'}},pastTransferGuestsEntry:'60',bases:{},overrides:{},useBriefRooms:true,confirmed:true,chosenVariance:'',generated:{signature:'invented',proposal:{heads:[]}}},total:'Pre-GST total (priced lines only): ₹100–₹120 · midpoint ₹110'});
 await expect(t.mutation(api.costings.save,{snapshot})).rejects.toThrow('Sign in');
 const id=await a.mutation(api.costings.save,{snapshot});
 expect(await a.query(api.costings.get,{id})).toBe(snapshot);
 expect(await a.query(api.costings.list,{})).toHaveLength(1);
 expect(await b.query(api.costings.list,{})).toEqual([]);
 expect(await b.query(api.costings.get,{id})).toBeNull();
 expect(await t.query(api.costings.get,{id})).toBeNull();
 await expect(a.mutation(api.costings.save,{snapshot:JSON.stringify({...JSON.parse(snapshot),workbook:'bytes'})})).rejects.toThrow('incomplete');
});
