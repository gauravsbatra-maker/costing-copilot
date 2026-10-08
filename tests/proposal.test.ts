import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyVariance, costRange, variancePercentage, rangeFigure, rawProposal, buildProposal, mealKind, mapHead, readProposalSheet } from '../shared/proposal.ts';
import { validateRequirements } from '../shared/brief.ts';
import { detailedBrief, detailedExtraction } from './fixtures/brief.ts';
import { prepareReview, suggestedHeadChoices } from '../shared/reviewChoices.ts';
import * as XLSX from 'xlsx';
const requirements = () => { const r = validateRequirements(detailedExtraction(), detailedBrief); r.fields.city = {value:'Jaipur', status:'corrected', source:'', reason:''}; return r; };
const head = {row:3,name:'Taj Hotel Expenses',cost:1000,nw:0,w:1000,items:[{row:5,name:'Oct 24 - Welcome Lunch',cost:800,nw:0,w:800,quantity:100,rate:8},{row:6,name:'Oct 24 - Sangeet',cost:200,nw:0,w:200,quantity:100,rate:2},{row:7,name:'Oct 25 - High Tea',cost:500,nw:0,w:500,quantity:100,rate:5}]};
const budget = {sheet:'Overall WIP',heads:[head],unread:[],total:{row:8,name:'Total',cost:1000,nw:0,w:1000}};
test('meal costs use sheet row quantity, high tea uses lunch even if tea guests differ; missing stays To quote', () => {
 const r=requirements(); r.functions[1].guests.value='999';
 const p=buildProposal(budget,r,{'Taj Hotel Expenses':'Dinner: 1000'}, {}, {});
 assert.equal(p.heads[0].lines[0].amount,2000);
 assert.equal(p.heads[0].lines[1].amount,1250);
 assert.equal(p.heads[0].lines[1].headcount,250);
 assert.equal(p.heads[0].lines[2].amount,2000);
 assert.equal(p.heads[0].lines[3].amount,null);
 assert.equal(p.heads[0].lines[0].source,'Overall WIP · Taj Hotel Expenses · row 5');
 assert(p.toQuote.some(l=>l.label.includes('Accommodation')));
 assert.equal(p.total,p.heads.flatMap(h=>h.lines).reduce((s,l)=>s+(l.amount??0),0));
});
test('no fuzzy money matches, unknown or missing figures remain unpriced', () => {
 assert.equal(mapHead('Accommodation',budget),null); assert.equal(mapHead('Food',budget),head);
 assert.equal(mealKind('After party'),'afters');
 const b=structuredClone(budget); b.heads[0].items[0].cost='could not read' as never;
 assert.equal(buildProposal(b,requirements(),{}, {}, {}).heads[0].lines[0].amount,null);
});
test('scale selected heads with confirmed benchmark, fixed heads retain sheet amount', () => {
 const b={...budget,heads:[{...head,name:'Decor',items:[]}]}; const r=requirements();
 const scaled=buildProposal(b,r,{'Decor':'Dinner: 1000'},{Decor:'headcount'},{});
 assert.equal(scaled.heads[0].lines[0].amount,Math.round(1000*1000/700*1.1*100)/100);
 assert.equal(buildProposal(b,r,{}, {Decor:'fixed'},{}).heads[0].lines[0].amount,1100);
 assert.equal(buildProposal(b,r,{}, {Decor:'headcount'},{}).heads[0].lines[0].amount,null);
});
test('proposal reads Overall WIP even when another tab comes first', () => {
 const book=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet([['Ignore']]),'Other');
 XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet([['Sr No','Description','Qty','Days','Total','Rate','Cost'],[null,null,null,null,null,null,'W/0 GST','NW','W'],[1,'Food',null,null,null,null,800,0,800],[null,'Lunch',100,1,100,8,800,0,800],[null,'Total',null,null,null,null,800,0,800]]),'Overall WIP');
 const b=readProposalSheet(XLSX.write(book,{type:'buffer',bookType:'xlsx'})); assert.equal(b.heads[0].items[0].quantity,100); assert.equal(b.heads[0].items[0].row,4);
 assert.throws(()=>readProposalSheet(XLSX.write(XLSX.utils.book_new(),{type:'buffer',bookType:'xlsx'})));
});

test('a required seasonal premium is never silently omitted when missing', () => {
 const r=requirements();r.fields.seasonalPremium.value=''; const b={...budget,heads:[{...head,name:'Decor',items:[]}]};
 assert.equal(buildProposal(b,r,{}, {}, {}).heads[0].lines[0].amount,null);
});

test('combined named heads and all-other-head rules scale concrete heads; global premium applies to fixed entertainment too', () => {
 const r=requirements();
 r.scalingRules=[['F&B and alcohol','pro rata per head'],['Entertainment','roughly the same'],['Decor & technicals','rise with larger space and headcount'],['All other heads','computed per head and projected up']].map(([name,rule])=>({head:{value:name,status:'corrected',source:'',reason:''},rule:{value:rule,status:'corrected',source:'',reason:''}}));
 r.fields.seasonalPremium={value:'+10% across all heads',status:'corrected',source:'+10% across all heads',reason:''};
 const b={...budget,heads:['Entertainment','Decor','Technicals','Bar Tenders','Other Costs'].map((name,i)=>({...head,row:20+i,name,cost:700,items:[]}))};
 const drivers=Object.fromEntries(b.heads.map(h=>[h.name,'Dinner: 1000']));
 const p=buildProposal(b,r,drivers,{},{});
 assert.equal(p.heads[0].amount,770);
 for(const h of p.heads.slice(1))assert.equal(h.amount,1100);
 assert(!p.toQuote.some(l=>l.label==='All other heads'||l.label==='Decor & technicals'));
 assert.equal(mapHead('F&B and alcohol',budget),head);
});

test('high tea costs do not silently price unquoted small ceremonies', () => {
 const r=requirements();r.functions[1].name.value='High tea + small ceremonies';
 const p=buildProposal(budget,r,{}, {}, {});
 assert(p.toQuote.some(l=>l.label==='Day 1 · Small ceremonies'));
 assert.equal(p.heads[0].lines.find(l=>l.label==='Day 1 · High tea (food only)')?.amount,1250);
});

test('rooms use a reviewed brief rate only after explicit confirmation and are included once in the total', () => {
 const r=requirements();r.fields.rooms.value='17 rooms';r.fields.roomRate.value='₹12,345/room night × 3 nights';r.fields.nights.value='3 nights';
 const b={...budget,heads:[{...head,name:'Other Costs',items:[]}]};
 const p=buildProposal(b,r,{}, { 'Other Costs':'fixed' },{},true);
 const room=p.heads[0].lines.find(l=>l.label==='Accommodation · rooms and nights');
 assert.equal(room?.amount,629595);assert.equal(room?.source,'Client brief · rooms, room rate and nights · confirmed by project head');
 assert.equal(p.heads[0].amount,p.heads[0].lines.reduce((sum,l)=>sum+(l.amount??0),0));
 assert.equal(p.total,p.heads.flatMap(h=>h.lines).reduce((sum,l)=>sum+(l.amount??0),0));
 assert.equal(buildProposal(b,r,{}, {},{}).heads[0].lines.find(l=>/Accommodation/.test(l.label))?.amount,null);
});


test('variance ranges preserve every midpoint, source and To quote exclusion', () => {
 const midpoint=buildProposal(budget,requirements(),{}, {}, {});
 const p=applyVariance(midpoint,10,'Client brief · Variance: ±10%');
 assert.deepEqual(p.heads,midpoint.heads);
 assert.equal(p.total,midpoint.total);
 assert.deepEqual(p.toQuote,midpoint.toQuote);
 assert.deepEqual(costRange(1250,10),{low:1125,high:1375});
 assert.equal(rangeFigure(1250,10),'₹1,125–₹1,375 · midpoint ₹1,250');
 assert.equal(rangeFigure(null,10),'To quote');
 assert(rawProposal(p).includes('Day 1 · High tea — ₹1,125–₹1,375 · midpoint ₹1,250'));
 assert(rawProposal(p).includes('Overall WIP · Taj Hotel Expenses · row 7'));
 assert(rawProposal(p).includes(`Pre-GST total (priced lines only): ${rangeFigure(midpoint.total,10)}`));
 assert.equal(p.total,p.heads.flatMap(h=>h.lines).reduce((sum,l)=>sum+(l.amount??0),0));
});
test('variance requires an explicit readable percentage, including zero; rejects ambiguous or negative ranges', () => {
 for(const text of ['±10%','10%','+/- 10%','±10% variance on actuals']) assert.equal(variancePercentage(text),10);
 assert.equal(variancePercentage('0%'),0);
 assert.equal(variancePercentage('2.5%'),2.5);
 for(const text of ['','10','-10%','10–20%','101%','10% and 5%','unknown'])assert.equal(variancePercentage(text),null);
 for(const pct of [-1,101,NaN,Infinity])assert.throws(()=>applyVariance(buildProposal(budget,requirements(),{}, {}, {}),pct,'User choice'));
 assert.deepEqual(costRange(100.01,2.5),{low:97.51,high:102.51});
 assert.deepEqual(costRange(100,0),{low:100,high:100});
});


test('review suggestions prefill dinner, out-of-town transfers and fixed bases without changing prices', () => {
 const r=requirements();r.scalingRules=[['Food','pro rata per head'],['Entertainment','roughly the same'],['All other heads','computed per head and projected up']].map(([name,rule])=>({head:{value:name,status:'provided',source:name,reason:''},rule:{value:rule,status:'provided',source:rule,reason:''}}));
 const b={...budget,heads:['Taj Hotel Expenses','Guests Transfer (Toyota Crysta)','Entertainment','Decor'].map((name,i)=>({...head,name,row:i+3,items:i===0?head.items:[]}))};
 const choices=suggestedHeadChoices(b,r);
 assert.equal(choices.Decor.driver,'Dinner: 1000');assert.equal(choices.Decor.basis,'headcount');
 assert.equal(choices.Entertainment.basis,'fixed');
 assert.equal(choices['Guests Transfer (Toyota Crysta)'].driver,'Out-of-town guests: 75');
 assert.match(choices['Taj Hotel Expenses'].reason,/High tea follows lunch/);
 const drivers=Object.fromEntries(Object.entries(choices).map(([h,c])=>[h,c.driver]));
 const bases=Object.fromEntries(Object.entries(choices).map(([h,c])=>[h,c.basis]));
 assert.deepEqual(buildProposal(b,r,drivers,bases,{}),buildProposal(b,r,{'Taj Hotel Expenses':'1000','Guests Transfer (Toyota Crysta)':'75',Entertainment:'1000',Decor:'1000'},{'Taj Hotel Expenses':'headcount','Guests Transfer (Toyota Crysta)':'headcount',Entertainment:'fixed',Decor:'headcount'},{}));
});
test('review suggestions preserve unknown counts rather than choosing between conflicting dinners', () => {
 const r=requirements();r.functions[6].guests.value='900';r.fields.outOfTownGuests.value='';
 const b={...budget,heads:[{...head,name:'Decor'},{...head,name:'Guests Transfer (Toyota Crysta)',row:20}]};
 const choices=suggestedHeadChoices(b,r);assert.equal(choices.Decor.driver,'');assert.equal(choices['Guests Transfer (Toyota Crysta)'].driver,'');
});
test('editable review preparation follows an explicit daily flow and preserves the original extraction', () => {
 const r=requirements();const original=structuredClone(r);
 r.fields.days.value='2 days';r.fields.outOfTownGuests.value='12 of the 90';r.fields.roomRate.value='₹8,000/room night × 2 nights';
 r.functions=r.functions.slice(0,4);r.functions.forEach(f=>{f.day.value='';f.day.status='unclear';});
 r.functions[0].guests.value='90 (25% of list)';r.functions[2].guests.value='360';
 const before=structuredClone(r);
 const reviewed=prepareReview(r,'Guest count (per day)\nShow flow: 2 lunches, 2 high teas, 2 dinners, 2 after parties');
 assert.deepEqual(r,before);assert.equal(reviewed.functions.length,8);
 assert.equal(reviewed.functions[0].day.value,'Day 1');assert.equal(reviewed.functions[4].day.value,'Day 2');
 assert.equal(reviewed.functions[4].guests.value,'90');assert.equal(reviewed.fields.outOfTownGuests.value,'12');
 assert.equal(reviewed.fields.roomRate.value,'₹8,000/room night');
 assert.equal(reviewed.fields.city.status,original.fields.city.status);
 assert.equal(prepareReview(r,'No daily flow confirmed').functions.length,4);
});
