import { reviewEvent } from '../shared/reviewEvent.ts';
import { selectedEventCity } from '../shared/eventCity.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateRequirements, fieldNotice, hasHeadcountConflict } from '../shared/brief.ts';
import { hometownBrief, inventedBrief, inventedExtraction } from './fixtures/brief.ts';
test('keeps verbatim requirements, individual function headcounts and missing fields', () => {
  const result = validateRequirements(inventedExtraction(), inventedBrief);
  assert.equal(result.fields.city.value, 'Jaipur');
  assert.match(result.fields.city.source, /City: Jaipur/);
  assert.equal(result.fields.seasonalPremium.status, 'missing');
  assert.equal(fieldNotice(result.fields.seasonalPremium), 'Missing');
  assert.deepEqual(result.functions.map(row => row.guests.value), ['150', '250']);
  assert.equal(result.scalingRules[0].rule.value, "scale by each function's guest count");
  assert.equal(result.fields.roomRate.value, 'Rs 12000 per room per night');
});
test('rejects invented values and partial numbers instead of presenting them as facts', () => {
  const raw = inventedExtraction(); raw.fields.city = 'Mumbai'; raw.fields.rooms = '4';
  const result = validateRequirements(raw, inventedBrief);
  assert.equal(result.fields.city.value, '');
  assert.equal(result.fields.city.status, 'unclear');
  assert.equal(result.fields.rooms.status, 'unclear');
  assert.match(fieldNotice(result.fields.rooms), /^Unclear:/);
});
test('keeps conflicting values flagged with a reason and rejects malformed responses', () => {
  const raw = inventedExtraction(); raw.fields.roomRate = 'Unclear: two conflicting room rates are given';
  assert.equal(fieldNotice(validateRequirements(raw, inventedBrief).fields.roomRate), 'Unclear: two conflicting room rates are given');
  assert.throws(() => validateRequirements({ fields: {} }, inventedBrief), /unreadable/);
});
test('flags different benchmark counts, respects edits and never treats unclear counts as numbers', () => {
  const result = validateRequirements(inventedExtraction(), inventedBrief);
  assert.equal(hasHeadcountConflict(result), true);
  for (const row of result.functions) row.guests = { ...row.guests, status: 'corrected', value: '200' };
  result.fields.outOfTownGuests = { ...result.fields.outOfTownGuests, status: 'corrected', value: '200' };
  assert.equal(hasHeadcountConflict(result), false);
  result.fields.benchmarkHeadcount.status = 'unclear';
  assert.equal(hasHeadcountConflict(result), false);
});
test('guest origin and benchmark location cannot fill City when the event is in the client’s hometown', async () => {
  const { hometownBrief } = await import('./fixtures/brief.ts');
  const raw = inventedExtraction(); raw.fields.city = 'Mumbai';
  const result = validateRequirements(raw, hometownBrief);
  assert.equal(result.fields.city.value, '');
  assert.equal(fieldNotice(result.fields.city), "Unclear: brief says client's hometown");
});
test('non-City fields use only the word-for-word quote check', () => {
  const raw = inventedExtraction();
  raw.fields.benchmarkProject = 'Jaipur';
  raw.fields.benchmarkHeadcount = '250';
  raw.functions[0].guests = '200';
  raw.functions[1].day = 'Day 1';
  raw.scalingRules[0].rule = 'GST excluded';
  raw.scalingRules[1].head = 'Jaipur';
  const result = validateRequirements(raw, inventedBrief);
  for (const field of [result.fields.benchmarkProject, result.fields.benchmarkHeadcount, result.functions[0].guests, result.functions[1].day, result.scalingRules[0].rule, result.scalingRules[1].head]) {
    assert.equal(field.status, 'provided');
  }
  raw.fields.roomRate = 'rs 12000 per room per night';
  assert.equal(validateRequirements(raw, inventedBrief).fields.roomRate.status, 'unclear');
});
test('an unnamed hometown stays Unclear even when the AI returns a missing city', async () => {
  const { hometownBrief } = await import('./fixtures/brief.ts');
  const raw = { ...inventedExtraction(), fields: { ...inventedExtraction().fields, city: null } };
  assert.equal(fieldNotice(validateRequirements(raw, hometownBrief).fields.city), "Unclear: brief says client's hometown");
});
test('fills stated timing, stay, benchmark, eight functions and four scaling rules while City stays amber', async () => {
  const { detailedBrief, detailedExtraction } = await import('./fixtures/brief.ts');
  const raw = detailedExtraction();
  const result = validateRequirements(raw, detailedBrief);
  assert.equal(fieldNotice(result.fields.city), "Unclear: brief says client's hometown");
  for (const key of ['dates', 'days', 'outOfTownGuests', 'rooms', 'nights', 'roomRate', 'benchmarkProject', 'benchmarkHeadcount', 'seasonalPremium', 'gstTreatment', 'variance'] as const) {
    assert.equal(result.fields[key].value, raw.fields[key], key);
    assert.equal(result.fields[key].status, 'provided', key);
  }
  assert.equal(result.functions.length, 8);
  result.functions.forEach((row, index) => {
    for (const key of ['day', 'name', 'guests'] as const) {
      assert.equal(row[key].value, raw.functions[index][key], `function ${index + 1} ${key}`);
      assert.equal(row[key].status, 'provided');
    }
  });
  assert.equal(result.scalingRules.length, 4);
  result.scalingRules.forEach((row, index) => {
    assert.equal(row.head.value, raw.scalingRules[index].head);
    assert.equal(row.rule.value, raw.scalingRules[index].rule);
    assert.equal(row.rule.status, 'provided');
  });
});
test('accepts room and night values with their units from the stated stay line', async () => {
  const { detailedBrief, detailedExtraction } = await import('./fixtures/brief.ts');
  const raw = detailedExtraction();
  raw.fields.rooms = '40 rooms';
  raw.fields.nights = '2 nights';
  const result = validateRequirements(raw, detailedBrief);
  assert.equal(result.fields.rooms.value, '40 rooms');
  assert.equal(result.fields.nights.value, '2 nights');
  assert.equal(result.fields.rooms.status, 'provided');
  assert.equal(result.fields.nights.status, 'provided');
  raw.scalingRules.forEach(row => { row.rule += '.'; });
  const withPunctuation = validateRequirements(raw, detailedBrief);
  withPunctuation.scalingRules.forEach((row, index) => {
    assert.equal(row.rule.value, raw.scalingRules[index].rule);
    assert.equal(row.rule.status, 'provided');
  });
});


test('event city box accepts only validated event cities unless the planner types a city', () => {
 const named=validateRequirements(inventedExtraction(),inventedBrief).fields.city;
 assert.equal(selectedEventCity(named,null).value,'Jaipur');
 assert.equal(selectedEventCity(named,'Mumbai').value,'Mumbai');
 assert.equal(selectedEventCity(named,'Mumbai').status,'corrected');
 assert.equal(selectedEventCity(named,'Mumbai').source,'');
 assert.equal(selectedEventCity(named,'').value,'');
 assert.equal(selectedEventCity(named,'  ').status,'missing');
 const raw=inventedExtraction();raw.fields.city='Mumbai';
 const protectedCity=validateRequirements(raw,hometownBrief).fields.city;
 assert.equal(selectedEventCity(protectedCity,null).value,'');
 assert.equal(selectedEventCity(protectedCity,'Mumbai').value,'Mumbai');
 assert.equal(selectedEventCity(protectedCity,' Mumbai ').value,'Mumbai');
});


test('review event uses the current brief type and reviewed duration, and flags only a missing current event type', () => {
 const days={value:'2',status:'provided' as const,source:'2 days',reason:''};
 assert.deepEqual(reviewEvent('Wedding Budget Brief – invented client\nDates: December | 2 days',days),{type:'Wedding',label:'Wedding · 2 days'});
 assert.equal(reviewEvent('Hi team – sharing the wedding brief 👇',days).label,'Wedding · 2 days');
 assert.equal(reviewEvent('Event type: Annual dealer meet',days).label,'Annual dealer meet · 2 days');
 assert.equal(reviewEvent('Barn raising brief',days).label,'Barn raising · 2 days');
 assert.equal(reviewEvent('Birthday brief',{...days,value:'1 day'}).label,'Birthday · 1 day');
 assert.equal(reviewEvent('Wedding brief',{...days,value:'3',status:'corrected'}).label,'Wedding · 3 days');
 assert.equal(reviewEvent('Wedding brief',{...days,value:'',status:'missing'}).label,'Wedding');
 assert.equal(reviewEvent('Wedding brief',{...days,value:'2',status:'unclear'}).label,'Wedding');
 assert.equal(reviewEvent('Wedding anniversary brief',days).type,'Wedding anniversary');
 for(const brief of ['', 'Lunch for 250 guests. Dinner for 1,000 guests.', 'Use our Aug 2026 Mumbai wedding as the benchmark project.', 'Event type: Not stated', 'No wedding. Dates: December.']) assert.deepEqual(reviewEvent(brief,days),{type:null,label:'Not stated in brief'});
 assert.equal(reviewEvent('Use the previous wedding as benchmark. Birthday brief for the current event.',days).type,'Birthday');
});
