import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildProposal, mealKind, mapHead, readProposalSheet } from '../shared/proposal.ts';
import { validateRequirements } from '../shared/brief.ts';
import { detailedBrief, detailedExtraction } from './fixtures/brief.ts';
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
