import { useState } from 'react';
import type { Budget } from '../shared/costing';
import type { Requirements } from '../shared/brief';
import { buildProposal, defaultBasis, mapHead, mappedHeads, ruleForHead, matchMeals, mealKind, numberIn, rawProposal, rupees, type Basis, type Proposal } from '../shared/proposal';
export default function CostingReview({ budget, requirements, drivers, setDrivers }: { budget: Budget; requirements: Requirements; drivers: Record<string,string>; setDrivers: (drivers: Record<string,string>) => void }) {
  const [bases, setBases] = useState<Record<string,Basis>>({});
  const [overrides, setOverrides] = useState<Record<number, number | null>>({});
  const [useBriefRooms, setUseBriefRooms] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [generated, setGenerated] = useState<{signature:string;proposal:Proposal} | null>(null);
  const signature = JSON.stringify({budget,requirements,drivers,bases,overrides,useBriefRooms});
  const proposal = generated?.signature === signature ? generated.proposal : null;
  const functions = requirements.functions.filter(f => mealKind(f.name.value) !== 'tea');
  const counts = new Set(functions.map(f => numberIn(f.guests.value)).filter(n=>n!==null));
  const conflict = counts.size > 1 || functions.some(f=>numberIn(f.guests.value)===null);
  const uncertain = [...Object.values(requirements.fields), ...requirements.functions.flatMap(f=>Object.values(f)), ...requirements.scalingRules.flatMap(r=>Object.values(r))].filter(f=>f.status==='unclear').length;
  const needed = conflict ? budget.heads.filter(h=>numberIn(drivers[h.name]??'')===null).length : 0;
  const food = mapHead('Food',budget);
  const matches = {...matchMeals(budget,requirements),...overrides};
  const validSheet = budget.heads.length === 10;
  const benchmarkNeeded = budget.heads.some(h => (bases[h.name] ?? defaultBasis(ruleForHead(h,budget,requirements))) === 'headcount') && numberIn(requirements.fields.benchmarkHeadcount.value) === null;
  return <section aria-label="Costing review" className="costing-review">
    <h3>Match requirements to sheet rows</h3>
    <p>Check each meal’s source. Choose “To quote” when the past row isn’t comparable.</p>
    {requirements.functions.map((f,i)=><label className="brief-field" key={i}><span>{f.day.value} · {f.name.value}{mealKind(f.name.value)==='tea' ? ' · headcount follows lunch' : ''}</span><select aria-label={`Source for function ${i+1}`} value={matches[i]??''} onChange={e=>setOverrides({...overrides,[i]:e.target.value?Number(e.target.value):null})}><option value="">To quote</option>{food?.items.filter(row=>mealKind(row.name)).map(row=><option key={row.row} value={row.row}>Overall WIP · {food.name} · row {row.row} — {row.name}</option>)}</select></label>)}
    <h3>Cost basis for each sheet head</h3>
    <p>Fixed uses the historical head amount. Headcount scales it against your confirmed benchmark.</p>
    {budget.heads.map(h=>{
      const rule = ruleForHead(h,budget,requirements);
      return <div className="head-basis" key={h.row}><strong>{h.name}</strong><small>Overall WIP · {h.name} · row {h.row}</small>
        <label>Calculation for {h.name}<select aria-label={`Calculation for ${h.name}`} value={bases[h.name]??defaultBasis(rule)} onChange={e=>setBases({...bases,[h.name]:e.target.value as Basis})}><option value="fixed">Fixed historical cost</option><option value="headcount">Scale by chosen headcount</option></select></label>
        {h.row===food?.row && <small>Meals always use their function headcount and sheet quantity.</small>}
        {conflict && <label>Choose a function for {h.name}<select aria-label={`Choose a function for ${h.name}`} value="" onChange={e=>{if(e.target.value)setDrivers({...drivers,[h.name]:e.target.value});}}><option value="">Pick a function, or enter another number above</option>{functions.map((f,i)=><option key={i} value={`${f.name.value}: ${numberIn(f.guests.value)??''}`}>{f.day.value} · {f.name.value} · {f.guests.value}</option>)}</select><small>Selected: {drivers[h.name]||'None'}</small></label>}
      </div>;
    })}
    <h3>Requirement mapping</h3>
    {requirements.scalingRules.map((r,i)=>{const heads=mappedHeads(r.head.value,budget);return <p key={i}>{r.head.value||'Unnamed requirement'} → {heads.length?heads.map(h=>`Overall WIP · ${h.name} · row ${h.row}`).join('; '):'To quote — no matching sheet row'}</p>;})}
    <p>City, dates and guest details provide context. Accommodation uses a sheet row unless you explicitly confirm the brief’s room rate.</p>
    {requirements.fields.rooms.value && <label className="confirmation"><input type="checkbox" checked={useBriefRooms} onChange={e=>setUseBriefRooms(e.target.checked)}/>Use my reviewed brief’s rooms, room rate and nights. No further season increase on this quoted rate.</label>}
    <label className="confirmation"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>I confirm the requirements and matching rows.</label>
    <button className="read-brief" type="button" disabled={!confirmed||uncertain>0||needed>0||!validSheet||benchmarkNeeded} onClick={()=>setGenerated({signature,proposal:buildProposal(budget,requirements,drivers,bases,overrides,useBriefRooms)})}>Cost it</button>
    {benchmarkNeeded&&<p className="amber">Enter the benchmark headcount to scale costs.</p>}
    {!validSheet&&<p className="amber">We found {budget.heads.length} of the 10 heads. Upload the full Overall WIP costing to cost this.</p>}
    {(uncertain>0||needed>0)&&<p className="amber">Settle {uncertain} unclear fields and pick a headcount for {needed} heads to cost this.</p>}
    {proposal&&<section aria-label="Costed proposal"><h2>Costed first-pass proposal</h2><p>Pre-GST only. To quote lines are excluded from the total.</p>
      {proposal.heads.map(h=><div className="proposal-head" key={h.name}><h3>{h.name} · {h.amount===null?'To quote':rupees(h.amount)}</h3><p>Headcount: {h.headcount??'per function / not set'}</p>{h.lines.map((l,i)=><div className="proposal-line" key={i}><strong>{l.label} · {l.amount===null?'To quote':rupees(l.amount)}</strong>{l.headcount!==null&&<small>{l.headcount} guests</small>}<small>{l.calculation}</small>{l.source&&l.original&&<details><summary>{l.source}</summary><p>{l.original?.name} · original pre-GST: {typeof l.original?.cost==='number'?rupees(l.original.cost):'To quote'}{l.original&&'quantity' in l.original?` · sheet quantity: ${l.original.quantity}`:''}</p></details>}{l.source&&!l.original&&<small>{l.source}</small>}</div>)}</div>)}
      <p className="proposal-total">Pre-GST total (priced lines only): {rupees(proposal.total)}</p>
      <p>{proposal.toQuote.length} To quote lines excluded. This is an incomplete estimate until quoted.</p>
      <details open><summary>Raw proposal output</summary><pre aria-label="Raw proposal output">{rawProposal(proposal)}</pre></details>
      <p>Not saved. This proposal is cleared when you close the app.</p>
    </section>}
  </section>;
}
