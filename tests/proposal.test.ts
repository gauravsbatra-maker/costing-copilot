import {dailyHeadcountOptions} from '../shared/reviewChoices.ts';
import {scalingRuleReview,hasScalingRule} from '../shared/scalingRuleReview.ts';
import { nightlyRooms, totalRoomNights, roomsFromBrief } from '../shared/roomNights.ts';
import { costLabel, costText } from '../shared/displayLabels.ts';
import { editProposal, applyLineContingencies, lineKey } from '../shared/lineEdits.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePastTransferGuests, applyVariance, costRange, variancePercentage, rangeFigure, rawProposal, buildProposal, mealKind, mapHead, readProposalSheet } from '../shared/proposal.ts';
import { validateRequirements } from '../shared/brief.ts';
import { detailedBrief, detailedExtraction } from './fixtures/brief.ts';
import { prepareReview, suggestedHeadChoices } from '../shared/reviewChoices.ts';
import { proposalChecks } from '../shared/proposalChecks.ts';
import { applyContingencies, contingencyDefaults, contingencyReason } from '../shared/contingency.ts';
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

test('send checklist lists headcount rules, pre-filled fields, every missing detail and every uncertain cost without changing the proposal', () => {
 const r=requirements();
 r.fields.city={value:"Client's hometown (city unconfirmed)",status:'corrected',source:'',reason:''};
 r.fields.dates={value:'',status:'missing',source:'',reason:''};
 r.fields.outOfTownGuests={value:'75',status:'corrected',source:'75 of the 250',reason:'Use the stated out-of-town count.'};
 r.functions[1].name.value='High tea + small ceremonies';
 r.functions[3].day={value:'',status:'missing',source:'',reason:''};
 r.scalingRules.push({head:{value:'Special fireworks',status:'provided',source:'Special fireworks',reason:''},rule:{value:'',status:'missing',source:'',reason:''}});
 const b={...budget,heads:[head,{...head,row:20,name:'Guests Transfer (Toyota Crysta)',items:[]},{...head,row:21,name:'Other Costs',items:[]}]};
 const choices=suggestedHeadChoices(b,r);
 const drivers=Object.fromEntries(Object.entries(choices).map(([h,c])=>[h,c.driver]));
 const bases=Object.fromEntries(Object.entries(choices).map(([h,c])=>[h,c.basis]));
 const p=applyVariance(buildProposal(b,r,drivers,bases,{},true),10,'Client brief · Variance: ±10%');
 const before=structuredClone({b,r,p,drivers,bases});
 const checks=proposalChecks(b,r,p,drivers,bases);
 assert(checks.assumptions.some(s=>s.includes('Guests Transfer (Toyota Crysta) — Transfers use 75 out-of-town guests')&&s.includes('not the historical event guest count')));
 assert(checks.assumptions.some(s=>s.includes('Pre-filled out-of-town guests: 75')));
 assert(checks.assumptions.some(s=>s.includes('Taj Hotel Expenses')&&s.includes('High tea uses the same day’s lunch headcount')));
 assert(checks.assumptions.some(s=>s.includes('Other Costs — Accommodation')&&s.includes('No further seasonal increase')));
 assert(checks.missing.some(s=>s.startsWith('All cost heads — City: the event city is still unconfirmed')));
 assert(checks.missing.some(s=>s.startsWith('All cost heads — Dates: missing')));
 assert(checks.missing.some(s=>s.includes('After party day / date: missing')));
 assert(checks.missing.some(s=>s.includes('Special fireworks scaling rule: missing')));
 for(const h of p.heads)for(const line of h.lines.filter(l=>l.amount===null))assert(checks.uncertain.some(s=>s.startsWith(`${h.name} — ${line.label}: To quote; excluded from the total.`)));
 assert(checks.uncertain.some(s=>s.startsWith('Other Costs — Special fireworks:')));
 assert(checks.uncertain.some(s=>s.startsWith('Other Costs — Day 1 · Small ceremonies:')));
 assert.deepEqual({b,r,p,drivers,bases},before);
});

test('send checklist follows edited choices, flags unclear fields and costs without sources, and clears settled warnings', () => {
 const r=requirements();r.fields.city={value:'',status:'unclear',source:'',reason:'The event city was not named.'};
 const b={...budget,heads:[{...head,name:'Decor',items:[]}]};
 const p=applyVariance(buildProposal(b,r,{Decor:'900'},{Decor:'fixed'},{}),0,'Project head choice · Variance: ±0%');
 p.heads[0].lines[0].source=null;
 const checks=proposalChecks(b,r,p,{Decor:'900'},{Decor:'fixed'},{Decor:'fixed'});
 assert(checks.missing.includes('All cost heads — City: unclear. The event city was not named.'));
 assert(checks.assumptions.some(s=>s.includes('Decor — Headcount choice: 900. Your entered choice')));
 assert(checks.assumptions.some(s=>s.includes('Decor — Your cost basis: Keep the historical sheet cost')));
 assert(checks.uncertain.some(s=>s.startsWith('Decor — Decor: No matching source row is recorded')));
 r.fields.city={value:'Jaipur',status:'corrected',source:'',reason:''};
 const settled=proposalChecks(b,r,p,{Decor:'900'},{Decor:'fixed'},{Decor:'fixed'});
 assert(!settled.missing.some(s=>s.includes('City:')));
 r.functions=[];r.scalingRules=[];
 const empty=proposalChecks(b,r,p,{Decor:'900'},{Decor:'fixed'});
 assert(empty.missing.some(s=>s.includes('Functions and guest counts: missing')));
 assert(empty.missing.some(s=>s.startsWith('Decor — Scaling rule: missing')));
});

test('assumption summary groups shared rules and keeps different counts, fixed costs and quoted rooms separate', () => {
 const r=requirements();
 r.scalingRules=[['Food','pro rata per head'],['Entertainment','roughly the same'],['All other heads','computed per head and projected up']].map(([name,rule])=>({head:{value:name,status:'provided' as const,source:name,reason:''},rule:{value:rule,status:'provided' as const,source:rule,reason:''}}));
 r.fields.seasonalPremium={value:'+10% across all heads',status:'provided',source:'+10% across all heads',reason:''};
 const b={...budget,heads:['Taj Hotel Expenses','Bar Tenders','Technicals','Decor','Entertainment','Guests Transfer (Toyota Crysta)','Other Costs'].map((name,i)=>({...head,name,row:i+3,items:i===0?head.items:[]}))};
 const suggestions=suggestedHeadChoices(b,r);
 const drivers=Object.fromEntries(Object.entries(suggestions).map(([h,c])=>[h,c.driver]));
 const bases=Object.fromEntries(Object.entries(suggestions).map(([h,c])=>[h,c.basis]));
 const p=applyVariance(buildProposal(b,r,drivers,bases,{},true,700),10,'Client brief · Variance: ±10%');
 const before=structuredClone({b,r,p,drivers,bases});
 const checks=proposalChecks(b,r,p,drivers,bases,{}, {},700);
 assert(checks.summary.includes('Per-person heads use the dinner count of 1,000: Bar Tenders, Technicals, Decor, Other Costs.'));
 assert(checks.summary.includes('Transfers use 75 out-of-town guests; past transfers covered 700 guests: Guests Transfer (Toyota Crysta).'));
 assert(checks.summary.includes('Keep the historical sheet cost without scaling by headcount: Entertainment.'));
 assert.equal(checks.summary.filter(s=>s.startsWith('Seasonal increase')).length,1);
 assert(checks.summary.includes('Seasonal increase of +10% on all heads, except the quoted room rate: All sheet cost heads.'));
 assert(checks.assumptions.filter(s=>s.includes('Seasonal increase included')).length>1);
 assert.deepEqual({b,r,p,drivers,bases},before);
 drivers.Decor='Dinner: 900';
 const edited=applyVariance(buildProposal(b,r,drivers,bases,{},true,700),10,'Client brief · Variance: ±10%');
 const changed=proposalChecks(b,r,edited,drivers,bases,{}, {},700);
 assert(changed.summary.includes('Per-person heads use the dinner count of 1,000: Bar Tenders, Technicals, Other Costs.'));
 assert(changed.summary.includes('Per-person heads use your chosen headcount of 900: Decor.'));
});

test('transfers require their own past guest count, use out-of-town guests, and leave every other head and source unchanged', () => {
 assert.equal(parsePastTransferGuests('60'),60);
 for(const text of ['', '0', '-60', '1.5', '60 guests', 'Infinity', '0x3c', '9007199254740992'])assert.equal(parsePastTransferGuests(text),null);
 const r=requirements();r.fields.seasonalPremium={value:'+10% across all heads',status:'corrected',source:'+10% across all heads',reason:''};
 const transfer={...head,row:20,name:'Guests Transfer (Toyota Crysta)',cost:12000,items:[]};
 const b={...budget,heads:[head,transfer,{...head,row:21,name:'Decor',items:[]}]};
 const drivers={'Taj Hotel Expenses':'Dinner: 1000','Guests Transfer (Toyota Crysta)':'Dinner: 1000',Decor:'Dinner: 1000'};
 const bases={'Taj Hotel Expenses':'headcount','Guests Transfer (Toyota Crysta)':'fixed',Decor:'headcount'} as const;
 const empty=buildProposal(b,r,drivers,bases,{},true);
 assert.equal(empty.heads[1].amount,null);
 assert(empty.toQuote.some(l=>l.label===transfer.name));
 assert.equal(empty.heads[1].lines[0].source,'Overall WIP · Guests Transfer (Toyota Crysta) · row 20');
 const filled=buildProposal(b,r,drivers,bases,{},true,60);
 assert.equal(filled.heads[1].amount,16500); // 12,000 × 75 ÷ 60 × existing 1.1 seasonal increase.
 assert.equal(filled.heads[1].headcount,75);
 assert.equal(filled.heads[1].lines[0].source,empty.heads[1].lines[0].source);
 assert.deepEqual(filled.heads[0],empty.heads[0]);assert.deepEqual(filled.heads[2],empty.heads[2]);
 assert.equal(Math.round((filled.total-empty.total)*100)/100,16500);
 for(const bad of [null,0,-1,1.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1])assert.equal(buildProposal(b,r,drivers,bases,{},true,bad).heads[1].amount,null);
 const ranged=applyVariance(filled,10,'Client brief · ±10%');
 const missing=proposalChecks(b,r,applyVariance(empty,10,'Client brief · ±10%'),drivers,bases);
 assert(missing.missing.some(s=>s.includes('Guests Transfer (Toyota Crysta) — Guests the past transfers covered: missing')));
 const reviewed=proposalChecks(b,r,ranged,drivers,bases,{}, {},60);
 assert(!reviewed.missing.some(s=>s.includes('Guests the past transfers covered')));
 assert(reviewed.summary.some(s=>s.includes('past transfers covered 60 guests')));
 assert(!reviewed.summary.some(s=>s.startsWith('Scale per-person sheet costs against')&&s.includes(transfer.name)));
});

test('head contingencies default to 10% only for transfers and add reserves to both range ends without changing source prices', () => {
 const r=requirements();r.fields.seasonalPremium={value:'+10% across all heads',status:'corrected',source:'+10% across all heads',reason:''};
 const transfer={...head,row:20,name:'Guests Transfer (Toyota Crysta)',cost:12000,items:[]};
 const b={...budget,heads:[head,transfer,{...head,row:21,name:'Decor',items:[]}]};
 const drivers={'Taj Hotel Expenses':'Dinner: 1000',Decor:'Dinner: 1000'};
 const bases={'Taj Hotel Expenses':'headcount',Decor:'headcount'} as const;
 const p=applyVariance(buildProposal(b,r,drivers,bases,{},true,60),10,'Client brief · ±10%');
 const original=structuredClone(p);
 const defaults=contingencyDefaults(b);
 assert.deepEqual(defaults,{'Taj Hotel Expenses':0,'Guests Transfer (Toyota Crysta)':10,Decor:0});
 const c=applyContingencies(p,defaults,transfer.name);
 assert.deepEqual(c.heads[transfer.name].range,{low:16335,high:19965,midpoint:18150});
 assert.deepEqual(c.heads[transfer.name].reserve,{low:1485,high:1815,midpoint:1650});
 assert.deepEqual(c.total,{low:costRange(p.total,10).low+1485,high:costRange(p.total,10).high+1815,midpoint:p.total+1650});
 for(const h of p.heads.filter(h=>h.name!==transfer.name))assert.deepEqual(c.heads[h.name].range,{...costRange(h.amount!,10),midpoint:h.amount});
 const zero=applyContingencies(p,Object.fromEntries(p.heads.map(h=>[h.name,0])),transfer.name);
 assert.deepEqual(zero.total,{...costRange(p.total,10),midpoint:p.total});
 const edited=applyContingencies(p,{...defaults,Decor:5},transfer.name);
 assert.equal(edited.heads.Decor.range!.low,Math.round(costRange(p.heads[2].amount!,10).low*1.05*100)/100);
 assert.deepEqual(p,original);
 const choices=Object.fromEntries(Object.entries(defaults).map(([name,percentage])=>[name,{percentage,reason:contingencyReason(name===transfer.name,percentage)}]));
 const checks=proposalChecks(b,r,p,drivers,bases,{}, {},60,choices);
 assert(checks.summary.some(s=>s.startsWith('Contingency 10%: transfer count and vehicle needs often change close to the date')&&s.includes(transfer.name)));
 assert(checks.assumptions.some(s=>s.startsWith(`${transfer.name} — Contingency 10%:`)));
 for(const percentage of [-1,101,NaN,Infinity])assert.throws(()=>applyContingencies(p,{[transfer.name]:percentage},transfer.name));
});

test('contingencies round each reserve to cents, preserve zero-contingency totals and never price To quote heads', () => {
 const p=applyVariance({heads:[{name:'Decor',headcount:null,amount:100.01,lines:[]},{name:'Guests Transfer',headcount:75,amount:null,lines:[]}],toQuote:[],total:100.01},2.5,'Project head choice');
 const result=applyContingencies(p,{Decor:10,'Guests Transfer':10},'Guests Transfer');
 assert.deepEqual(result.heads.Decor.range,{low:107.26,high:112.76,midpoint:110.01});
 assert.deepEqual(result.heads.Decor.reserve,{low:9.75,high:10.25,midpoint:10});
 assert.deepEqual(result.total,result.heads.Decor.range);
 assert.equal(result.heads['Guests Transfer'].range,null);assert.equal(result.heads['Guests Transfer'].reserve,null);
 const zero=applyContingencies(p,{Decor:0,'Guests Transfer':10},'Guests Transfer');
 assert.deepEqual(zero.total,{low:97.51,high:102.51,midpoint:100.01});
});


test('line edits preserve seasonal and room factors, source rows, other lines, and exact reset amounts', () => {
 const r=requirements();r.fields.seasonalPremium={value:'+10% across all heads',status:'corrected',source:'+10% across all heads',reason:''};
 const transfer={...head,row:20,name:'Guests Transfer (Toyota Crysta)',cost:12000,items:[]};
 const b={...budget,heads:[head,transfer,{...head,row:21,name:'Other Costs',items:[]}]};
 const original=applyVariance(buildProposal(b,r,{'Taj Hotel Expenses':'Dinner: 1000'}, {}, {},true,60),10,'Client brief');
 const snapshot=structuredClone(original), defaults=contingencyDefaults(b), key=lineKey(transfer.name,0);
 assert.deepEqual(editProposal(original,{}),original);
 const baseline=applyLineContingencies(original,{},defaults,transfer.name);
 const c20=applyLineContingencies(editProposal(original,{[key]:{contingency:'20'}}),{[key]:20},defaults,transfer.name);
 assert.deepEqual(c20.heads[transfer.name].range,{low:17820,high:21780,midpoint:19800});
 const quantities=editProposal(original,{[key]:{quantity:'150',unitCost:'250'}});
 assert.equal(quantities.heads[1].amount,41250); // 150 × (12,000 ÷ 60 replaced with 250) × unchanged 1.1.
 assert.deepEqual(quantities.heads[0],original.heads[0]);assert.deepEqual(quantities.heads[2],original.heads[2]);
 assert.equal(quantities.heads[1].lines[0].source,original.heads[1].lines[0].source);
 assert.deepEqual(quantities.heads[1].lines[0].original,original.heads[1].lines[0].original);
 const roomIndex=original.heads[2].lines.findIndex(l=>l.source?.startsWith('Client brief'));
 const room=original.heads[2].lines[roomIndex];
 assert.equal(editProposal(original,{[lineKey('Other Costs',roomIndex)]:{quantity:'1'}}).heads[2].lines[roomIndex].amount,room.pricing!.unitCost*room.pricing!.multiplier);
 const missing=editProposal(original,{[key]:{unitCost:''}});
 assert.equal(missing.heads[1].amount,null);assert(missing.toQuote.some(l=>l.label===transfer.name));
 assert.equal(editProposal(original,{[key]:{quantity:'0'}}).heads[1].amount,0);
 assert.deepEqual(applyLineContingencies(editProposal(original,{}),{},defaults,transfer.name),baseline);
 assert.deepEqual(original,snapshot);
 const missingBasis=applyVariance(buildProposal(b,r,{}, {}, {},true),10,'Client brief');
 assert.equal(editProposal(missingBasis,{[key]:{quantity:'75',unitCost:'200'}}).heads[1].amount,null);
 const mealKey=lineKey(head.name,1);
 const mixed=applyLineContingencies(original,{[mealKey]:20},defaults,transfer.name);
 const meal=original.heads[0].lines[1].amount!;
 assert.equal(mixed.total.midpoint,baseline.total.midpoint+Math.round(meal*.2*100)/100);
 assert.deepEqual(mixed.heads[transfer.name],baseline.heads[transfer.name]);
});


test('proposal display labels remove the past hotel and name guest rooms in every display context while retaining source data and other labels', () => {
 const old='Taj Hotel Expenses ( minimum gaurentee)';
 assert.equal(costLabel(old),'Food & beverage (minimum guarantee)');
 assert.equal(costLabel('Accommodation · rooms and nights'),'Guest rooms');
 for(const label of ['Other Costs','Decor','Guests Transfer (Toyota Crysta)','Day 1 · Lunch'])assert.equal(costLabel(label),label);
 const source=`Overall WIP · ${old} · row 5`;
 assert.equal(costText(source,[old]),'Overall WIP · Food & beverage (minimum guarantee) · row 5');
 assert.equal(source,`Overall WIP · ${old} · row 5`);
 assert.equal(costText(`${old} — meal row: ${source}`,[old]),'Food & beverage (minimum guarantee) — meal row: Overall WIP · Food & beverage (minimum guarantee) · row 5');
});

test('per-night room counts price 70 room nights at the quoted rate, preserve other heads and support old stays',()=>{
 const brief='Hotel Four Seasons, ₹40,000/room night – 30 rooms Night 1, 40 rooms Night 2';
 const r=requirements();
 r.fields.rooms={value:'',status:'missing',source:'',reason:''};
 r.fields.nights={value:'',status:'missing',source:'',reason:''};
 r.fields.roomRate={value:'₹40,000/room night',status:'provided',source:brief,reason:''};
 const reviewed=prepareReview(r,brief);
 assert.deepEqual(reviewed.roomNights?.map(row=>row.value),['30','40']);
 assert.equal(totalRoomNights(reviewed.roomNights!),70);
 const before=buildProposal(budget,r,{}, {}, {},true,60);
 const after=buildProposal(budget,reviewed,{}, {}, {},true,60);
 const room=after.heads.flatMap(h=>h.lines).find(l=>l.label==='Accommodation · rooms and nights')!;
 assert.equal(room.amount,2800000);
 assert.deepEqual(room.pricing,{quantity:70,unitCost:40000,multiplier:1});
 assert.deepEqual(after.heads[0].lines.filter(l=>l.label!==room.label),before.heads[0].lines.filter(l=>l.label!==room.label));
 const legacy=requirements();
 legacy.fields.rooms.value='40 rooms at the venue hotel';
 assert.deepEqual(nightlyRooms(legacy).map(row=>row.value),['40','40']);
 const repeated=prepareReview(legacy,detailedBrief);
 assert.equal(buildProposal(budget,repeated,{}, {}, {},true,60).total,buildProposal(budget,legacy,{}, {}, {},true,60).total);
 const zero={...reviewed,roomNights:reviewed.roomNights!.map(row=>({...row,value:'0'}))};
 assert.equal(buildProposal(budget,zero,{}, {}, {},true,60).heads.flatMap(h=>h.lines).find(l=>l.label==='Accommodation · rooms and nights')!.amount,0);
 assert.deepEqual(roomsFromBrief(r,'Night 1: 30 rooms, Night 2: 40 rooms').map(row=>row.value),['30','40']);
 assert.equal(totalRoomNights(roomsFromBrief(r,'30 rooms Night 1, 40 rooms Night 1')),null);
 assert.equal(totalRoomNights([...reviewed.roomNights!,{value:'',status:'missing',source:'',reason:''}]),null);
});

test('review merges brief food aliases and empty sheet duplicates without changing costing or source rules',()=>{
 const r=requirements();
 const before=buildProposal(budget,r,{}, {}, {},true,60);
 const original=structuredClone(r);
 const rows=scalingRuleReview(r,budget);
 assert.equal(rows[0].label,'Food & beverage (minimum guarantee)');
 assert(hasScalingRule(head.name,r,budget));
 assert.deepEqual(r,original);
 r.scalingRules.push({head:{value:head.name,status:'corrected',source:'',reason:''},rule:{value:'',status:'missing',source:'',reason:''}});
 const duplicated=structuredClone(r);
 assert.equal(scalingRuleReview(r,budget).filter(row=>row.label==='Food & beverage (minimum guarantee)').length,1);
 assert.equal(scalingRuleReview(r,budget)[0].row.rule.value,original.scalingRules[0].rule.value);
 assert.deepEqual(r,duplicated);
 assert.deepEqual(buildProposal(budget,r,{}, {}, {},true,60),before);
 r.scalingRules[r.scalingRules.length-1].head.value='Food & beverage (minimum guarantee)';
 assert.equal(scalingRuleReview(r,budget).filter(row=>row.label==='Food & beverage (minimum guarantee)').length,1);
});

test('function headcount defaults to dinner, falls back to lunch and day totals include every function',()=>{
 const r=requirements();r.functions=r.functions.slice(0,4);
 const b={...budget,heads:[{...head,name:'Technicals'}]};
 assert.equal(suggestedHeadChoices(b,r).Technicals.driver,'Dinner: 1000');
 const total=dailyHeadcountOptions(r)[0];
 assert.equal(total.total,1650);
 const defaults=buildProposal(b,r,{Technicals:'Dinner: 1000'},{Technicals:'headcount'},{});
 const selected=buildProposal(b,r,{Technicals:total.value},{Technicals:'headcount'},{});
 assert.equal(selected.heads[0].headcount,1650);
 assert.equal(selected.heads[0].amount,Math.round(defaults.heads[0].amount!*1.65*100)/100);
 r.functions=r.functions.filter(f=>f.name.value!=='Dinner');
 assert.equal(suggestedHeadChoices(b,r).Technicals.driver,'Lunch: 250');
 assert.equal(dailyHeadcountOptions(r)[0].total,650);
 r.functions[0].guests.value='';
 assert.equal(dailyHeadcountOptions(r)[0].total,null);
});
