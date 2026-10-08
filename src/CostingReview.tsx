import { suggestedHeadChoices } from '../shared/reviewChoices';
import { proposalChecks } from '../shared/proposalChecks';
import { useState } from 'react';
import type { Budget } from '../shared/costing';
import type { Requirements } from '../shared/brief';
import { applyVariance, parsePastTransferGuests, variancePercentage, rangeFigure, buildProposal, mapHead, mappedHeads, matchMeals, mealKind, numberIn, rupees, type Basis, type RangedProposal } from '../shared/proposal';
export default function CostingReview({ budget, requirements, drivers, setDrivers }: { budget: Budget; requirements: Requirements; drivers: Record<string,string>; setDrivers: (drivers: Record<string,string>) => void }) {
  const [pastTransferGuestsEntry, setPastTransferGuestsEntry] = useState('');
  const pastTransferGuests = parsePastTransferGuests(pastTransferGuestsEntry);
  const [bases, setBases] = useState<Record<string,Basis>>({});
  const [overrides, setOverrides] = useState<Record<number, number | null>>({});
  const [useBriefRooms, setUseBriefRooms] = useState(Boolean(requirements.fields.rooms.value));
  const [confirmed, setConfirmed] = useState(false);
  const [generated, setGenerated] = useState<{signature:string;proposal:RangedProposal} | null>(null);
  const [chosenVariance, setChosenVariance] = useState('');
  const briefVariance = requirements.fields.variance;
  const statedVariance = (briefVariance.status === 'provided' || briefVariance.status === 'corrected') ? variancePercentage(briefVariance.value) : null;
  const percentage = statedVariance ?? variancePercentage(`${chosenVariance}%`);
  const varianceSource = statedVariance !== null
    ? briefVariance.status === 'corrected' ? `Project head correction · Variance: ${briefVariance.value}` : `Client brief · ${briefVariance.source || briefVariance.value}`
    : `Project head choice · Variance: ±${percentage}%`;
  const suggestions = suggestedHeadChoices(budget,requirements);
  const selectedBases = Object.fromEntries(budget.heads.map(h=>[h.name,bases[h.name] ?? suggestions[h.name].basis]));
  const signature = JSON.stringify({budget,requirements,drivers,bases:selectedBases,overrides,useBriefRooms,percentage,varianceSource,pastTransferGuestsEntry});
  const proposal = generated?.signature === signature ? generated.proposal : null;
  const checks = proposal ? proposalChecks(budget, requirements, proposal, drivers, selectedBases, bases, overrides, pastTransferGuests) : null;
  const functions = requirements.functions.filter(f => mealKind(f.name.value) !== 'tea');
  const counts = new Set(functions.map(f => numberIn(f.guests.value)).filter(n=>n!==null));
  const conflict = counts.size > 1 || functions.some(f=>numberIn(f.guests.value)===null);
  const cityRequired = !requirements.fields.city.value.trim() || requirements.fields.city.status==='unclear';
  const uncertain = [...Object.entries(requirements.fields).filter(([key])=>key!=='city').map(([,field])=>field), ...requirements.functions.flatMap(f=>Object.values(f)), ...requirements.scalingRules.flatMap(r=>Object.values(r))].filter(f=>f.status==='unclear').length;
  const needed = conflict ? budget.heads.filter(h=>numberIn(drivers[h.name]??'')===null).length : 0;
  const food = mapHead('Food',budget);
  const transfers = mapHead('Transfers',budget);
  const matches = {...matchMeals(budget,requirements),...overrides};
  const validSheet = budget.heads.length === 10;
  const benchmarkNeeded = budget.heads.some(h => h.row !== transfers?.row && selectedBases[h.name] === 'headcount') && numberIn(requirements.fields.benchmarkHeadcount.value) === null;
  return <section aria-label="Costing review" className="costing-review">
    <h3>Match requirements to sheet rows</h3>
    <p>Check each meal’s source. Choose “To quote” when the past row isn’t comparable.</p>
    {requirements.functions.map((f,i)=><label className="brief-field" key={i}><span>{f.day.value} · {f.name.value}{mealKind(f.name.value)==='tea' ? ' · headcount follows lunch' : ''}</span><select aria-label={`Source for function ${i+1}`} value={matches[i]??''} onChange={e=>setOverrides({...overrides,[i]:e.target.value?Number(e.target.value):null})}><option value="">To quote</option>{food?.items.filter(row=>mealKind(row.name)).map(row=><option key={row.row} value={row.row}>Overall WIP · {food.name} · row {row.row} — {row.name}</option>)}</select></label>)}
    <h3>Cost basis for each sheet head</h3>
    <p>Fixed uses the historical head amount. Headcount scales it against your confirmed benchmark.</p>
    {budget.heads.map(h=>{
      const choice = suggestions[h.name];
      return <div className="head-basis" key={h.row}><strong>{h.name}</strong><small>Overall WIP · {h.name} · row {h.row}</small>
        <label>Calculation for {h.name}<select aria-label={`Calculation for ${h.name}`} value={selectedBases[h.name]} onChange={e=>setBases({...bases,[h.name]:e.target.value as Basis})}><option value="fixed">Fixed historical cost</option><option value="headcount">Scale by chosen headcount</option></select></label>
        <small>{bases[h.name] ? 'Your edited choice. ' : 'Pre-filled. '}{bases[h.name] ? selectedBases[h.name]==='fixed' ? 'Keep the historical cost.' : 'Scale against the historical benchmark.' : choice.basisReason}</small>
        {h.row===transfers?.row && <label className="brief-field"><span>Guests the past transfers covered</span><input aria-label="Guests the past transfers covered" type="number" min="1" step="1" value={pastTransferGuestsEntry} onChange={e=>setPastTransferGuestsEntry(e.target.value)} placeholder="Enter the past transfer guest count"/><small>Transfers use the sheet’s transfer cost × out-of-town guests ÷ this count, with the existing seasonal increase. The general cost basis above does not apply to transfers.</small>{pastTransferGuests===null && <small className="amber">Missing: enter a positive whole guest count. Transfers stay To quote until supplied.</small>}</label>}
        {h.row===food?.row && <small>Meals always use their function headcount and sheet quantity.</small>}
        {conflict && <label>Choose a function for {h.name}<select aria-label={`Choose a function for ${h.name}`} value={drivers[h.name]??''} onChange={e=>{if(e.target.value)setDrivers({...drivers,[h.name]:e.target.value});}}><option value="">Pick a function, or enter another number above</option>{drivers[h.name] && !functions.some(f=>`${f.name.value}: ${numberIn(f.guests.value)??''}`===drivers[h.name]) && <option value={drivers[h.name]}>{drivers[h.name]}</option>}{functions.map((f,i)=><option key={i} value={`${f.name.value}: ${numberIn(f.guests.value)??''}`}>{f.day.value} · {f.name.value} · {f.guests.value}</option>)}</select><small>Selected: {drivers[h.name]||'None'}. {drivers[h.name]===choice.driver ? choice.reason : 'Your edited headcount.'}</small></label>}
      </div>;
    })}
    <h3>Requirement mapping</h3>
    {requirements.scalingRules.map((r,i)=>{const heads=mappedHeads(r.head.value,budget);return <p key={i}>{r.head.value||'Unnamed requirement'} → {heads.length?heads.map(h=>`Overall WIP · ${h.name} · row ${h.row}`).join('; '):'To quote — no matching sheet row'}</p>;})}
    <p>City, dates and guest details provide context. Accommodation uses a sheet row unless you explicitly confirm the brief’s room rate.</p>
    {requirements.fields.rooms.value && <label className="confirmation"><input type="checkbox" checked={useBriefRooms} onChange={e=>setUseBriefRooms(e.target.checked)}/>Use my reviewed brief’s rooms, room rate and nights. No further season increase on this quoted rate.</label>}
    <h3>Cost range</h3>
    {statedVariance !== null ? <p>Use ±{statedVariance}% around each midpoint. {varianceSource}</p> : <label className="brief-field"><span>{briefVariance.value ? 'The brief’s variance needs a clear percentage. Which percentage should we use?' : 'The brief states no variance. Which percentage should we use?'}</span><input aria-label="Variance percentage to use" type="number" min="0" max="100" step="any" value={chosenVariance} onChange={e=>setChosenVariance(e.target.value)} placeholder="Enter a percentage, such as 10"/><small>Choose 0% to 100%. No percentage is assumed.</small></label>}
    <p>Low and high use the same percentage below and above the current figure. Season increases already included in the midpoint stay separate.</p>
    {cityRequired&&<p className="amber">Enter the event city in the City field before costing.</p>}
    <p>Confirm all accepts the displayed requirements, headcounts, cost bases and matching rows{requirements.fields.rooms.value ? ', including the displayed brief-room pricing' : ''}. You can still edit every choice.</p>
    <button className="add-detail" type="button" disabled={cityRequired||uncertain>0||needed>0||!validSheet||benchmarkNeeded||percentage===null} onClick={()=>{if(percentage!==null){setConfirmed(true);setGenerated({signature,proposal:applyVariance(buildProposal(budget,requirements,drivers,selectedBases,overrides,useBriefRooms,pastTransferGuests),percentage,varianceSource)});}}}>Confirm all</button>
    <label className="confirmation"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>I confirm the requirements and matching rows.</label>
    <button className="read-brief" type="button" disabled={cityRequired||!confirmed||uncertain>0||needed>0||!validSheet||benchmarkNeeded||percentage===null} onClick={()=>{if(percentage!==null)setGenerated({signature,proposal:applyVariance(buildProposal(budget,requirements,drivers,selectedBases,overrides,useBriefRooms,pastTransferGuests),percentage,varianceSource)});}}>Cost it</button>
    {percentage===null&&<p className="amber">Enter a variance percentage to cost this.</p>}
    {benchmarkNeeded&&<p className="amber">Enter the benchmark headcount to scale costs.</p>}
    {!validSheet&&<p className="amber">We found {budget.heads.length} of the 10 heads. Upload the full Overall WIP costing to cost this.</p>}
    {(uncertain>0||needed>0)&&<p className="amber">Settle {uncertain} unclear fields and pick a headcount for {needed} heads to cost this.</p>}
    {proposal&&<section aria-label="Costed proposal"><h2>Costed first-pass proposal</h2><p>Pre-GST only. To quote lines are excluded from the total.</p><p>Range: ±{proposal.variancePercentage}% · {proposal.varianceSource}</p>
      {proposal.heads.map(h=><div className="proposal-head" key={h.name}><h3>{h.name} · {rangeFigure(h.amount,proposal.variancePercentage)}</h3><p>Headcount: {h.headcount??'per function / not set'}</p>{h.lines.map((l,i)=><div className="proposal-line" key={i}>{(l.label !== h.name || l.amount !== h.amount) && <strong>{l.label !== h.name && `${l.label} · `}{rangeFigure(l.amount,proposal.variancePercentage)}</strong>}{l.headcount!==null&&<small>{l.headcount} guests</small>}<small>{l.calculation}</small>{l.source&&l.original&&<details><summary>{l.source}</summary><p>{l.original?.name} · original pre-GST: {typeof l.original?.cost==='number'?rupees(l.original.cost):'To quote'}{l.original&&'quantity' in l.original?` · sheet quantity: ${l.original.quantity}`:''}</p></details>}{l.source&&!l.original&&<small>{l.source}</small>}</div>)}</div>)}
      {checks && <section aria-label="Check before you send"><h3>Check before you send</h3>
        <h4>Missing information</h4>{checks.missing.length ? <ul>{checks.missing.map((text,i)=><li key={i}>{text}</li>)}</ul> : <p>No missing information flagged in the reviewed fields.</p>}
        <h4>Uncertain costs</h4>{checks.uncertain.length ? <ul>{checks.uncertain.map((text,i)=><li key={i}>{text}</li>)}</ul> : <p>No uncertain costs flagged.</p>}
        <h4>Assumptions and choices</h4><ul>{checks.summary.map((text,i)=><li key={i}>{text}</li>)}</ul>
        <details><summary>Show all assumptions</summary><ul>{checks.assumptions.map((text,i)=><li key={i}>{text}</li>)}</ul></details>
      </section>}
      <p className="proposal-total">Pre-GST total (priced lines only): {rangeFigure(proposal.total,proposal.variancePercentage)}</p>
      <p>{proposal.toQuote.length} To quote lines excluded. This is an incomplete estimate until quoted.</p>
      <p>Not saved. This proposal is cleared when you close the app.</p>
    </section>}
  </section>;
}
