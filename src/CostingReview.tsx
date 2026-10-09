import { useSaveCosting } from './SavedCostings';
import type { SavedCosting } from '../shared/savedCosting';
import { costLabel, costText } from '../shared/displayLabels';
import ProposalReview from './ProposalReview';
import { editProposal, applyLineContingencies, lineKey, inputNumber, type LineEdit } from '../shared/lineEdits';
import { applyContingencies, contingencyDefaults, contingencyFigure, contingencyReason, type ContingencyChoice } from '../shared/contingency';
import { suggestedHeadChoices } from '../shared/reviewChoices';
import { proposalChecks } from '../shared/proposalChecks';
import { useRef, useState, type ReactNode } from 'react';
import type { Budget } from '../shared/costing';
import type { Requirements } from '../shared/brief';
import { applyVariance, parsePastTransferGuests, variancePercentage, buildProposal, mapHead, mappedHeads, matchMeals, mealKind, numberIn, rupees, type Basis, type RangedProposal } from '../shared/proposal';
export default function CostingReview({ budget, requirements, drivers, setDrivers, onReview, brief, initial }: { initial?: SavedCosting | null; budget: Budget; requirements: Requirements; brief: string; drivers: Record<string,string>; setDrivers: (drivers: Record<string,string>) => void; onReview: (page: ReactNode) => void }) {
  const saveCosting = useSaveCosting();
  const reviewButton = useRef<HTMLButtonElement>(null);
  const [lineEdits, setLineEdits] = useState<Record<string,LineEdit>>(initial?.state.lineEdits ?? {});
  const changeLine = (key: string, field: keyof LineEdit, value: string) => setLineEdits(prev=>({...prev,[key]:{...prev[key],[field]:value}}));
  const [pastTransferGuestsEntry, setPastTransferGuestsEntry] = useState(initial?.state.pastTransferGuestsEntry ?? '');
  const pastTransferGuests = parsePastTransferGuests(pastTransferGuestsEntry);
  const [bases, setBases] = useState<Record<string,Basis>>(initial?.state.bases ?? {});
  const [overrides, setOverrides] = useState<Record<number, number | null>>(initial?.state.overrides ?? {});
  const [useBriefRooms, setUseBriefRooms] = useState(initial?.state.useBriefRooms ?? Boolean(requirements.fields.rooms.value));
  const [confirmed, setConfirmed] = useState(initial?.state.confirmed ?? false);
  const [generated, setGenerated] = useState<{signature:string;proposal:RangedProposal} | null>(initial?.state.generated ?? null);
  const [chosenVariance, setChosenVariance] = useState(initial?.state.chosenVariance ?? '');
  const briefVariance = requirements.fields.variance;
  const statedVariance = (briefVariance.status === 'provided' || briefVariance.status === 'corrected') ? variancePercentage(briefVariance.value) : null;
  const percentage = statedVariance ?? variancePercentage(`${chosenVariance}%`);
  const varianceSource = statedVariance !== null
    ? briefVariance.status === 'corrected' ? `Project head correction · Variance: ${briefVariance.value}` : `Client brief · ${briefVariance.source || briefVariance.value}`
    : `Project head choice · Variance: ±${percentage}%`;
  const suggestions = suggestedHeadChoices(budget,requirements);
  const selectedBases = Object.fromEntries(budget.heads.map(h=>[h.name,bases[h.name] ?? suggestions[h.name].basis]));
  const signature = JSON.stringify({budget,requirements,drivers,bases:selectedBases,overrides,useBriefRooms,percentage,varianceSource,pastTransferGuestsEntry});
  const originalProposal = generated?.signature === signature ? generated.proposal : null;
  const proposal = originalProposal ? editProposal(originalProposal,lineEdits) : null;
  const generate = () => { if(percentage===null)return; setLineEdits({}); setGenerated({signature,proposal:applyVariance(buildProposal(budget,requirements,drivers,selectedBases,overrides,useBriefRooms,pastTransferGuests),percentage,varianceSource)}); };
  const contingencyDefaultsByHead = initial?.defaults ?? contingencyDefaults(budget);
  const contingencyChoices: Record<string, ContingencyChoice> = Object.fromEntries((proposal?.heads ?? []).map(h => {
    const percentage = variancePercentage(`${lineEdits[lineKey(h.name,0)]?.contingency ?? contingencyDefaultsByHead[h.name] ?? 0}%`);
    return [h.name, {percentage, reason:contingencyReason(contingencyDefaultsByHead[h.name] === 10, percentage ?? 0)}];
  }));
  const linePercentages = Object.fromEntries((proposal?.heads ?? []).flatMap(h=>h.lines.map((_,i)=>[lineKey(h.name,i),variancePercentage(`${lineEdits[lineKey(h.name,i)]?.contingency ?? contingencyDefaultsByHead[h.name] ?? 0}%`)])));
  const contingenciesValid = Object.values(linePercentages).every(p=>p!==null);
  const contingent = proposal && contingenciesValid ? applyLineContingencies(proposal,linePercentages as Record<string,number>,contingencyDefaultsByHead,mapHead('Transfers',budget)?.name) : null;
  const checks = proposal ? proposalChecks(budget, requirements, proposal, drivers, selectedBases, bases, overrides, pastTransferGuests, contingencyChoices,Object.fromEntries(Object.entries(linePercentages).map(([key,percentage])=>[key,{percentage,reason:contingencyReason(contingencyDefaultsByHead[JSON.parse(key)[0]]===10,percentage??0)}]))) : null;
  if (checks && proposal) for (const h of proposal.heads) for (const [i,l] of h.lines.entries()) {
    const edit=lineEdits[lineKey(h.name,i)];
    if (edit && l.amount===null && (edit.quantity!==undefined || edit.unitCost!==undefined)) checks.missing.push(`${h.name} — ${l.label}: enter a valid quantity and unit cost and confirm the original calculation basis.`);

  }
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
    {requirements.functions.map((f,i)=><label className="brief-field" key={i}><span>{f.day.value} · {f.name.value}{mealKind(f.name.value)==='tea' ? ' · headcount follows lunch' : ''}</span><select aria-label={`Source for function ${i+1}`} value={matches[i]??''} onChange={e=>setOverrides({...overrides,[i]:e.target.value?Number(e.target.value):null})}><option value="">To quote</option>{food?.items.filter(row=>mealKind(row.name)).map(row=><option key={row.row} value={row.row}>Overall WIP · {costLabel(food.name)} · row {row.row} — {row.name}</option>)}</select></label>)}
    <h3>Cost basis for each sheet head</h3>
    <p>Fixed uses the historical head amount. Headcount scales it against your confirmed benchmark.</p>
    {budget.heads.map(h=>{
      const choice = suggestions[h.name];
      return <div className="head-basis" key={h.row}><strong>{costLabel(h.name)}</strong><small>Overall WIP · {costLabel(h.name)} · row {h.row}</small>
        <label>Calculation for {costLabel(h.name)}<select aria-label={`Calculation for ${costLabel(h.name)}`} value={selectedBases[h.name]} onChange={e=>setBases({...bases,[h.name]:e.target.value as Basis})}><option value="fixed">Fixed historical cost</option><option value="headcount">Scale by chosen headcount</option></select></label>
        <small>{bases[h.name] ? 'Your edited choice. ' : 'Pre-filled. '}{bases[h.name] ? selectedBases[h.name]==='fixed' ? 'Keep the historical cost.' : 'Scale against the historical benchmark.' : choice.basisReason}</small>
        {h.row===transfers?.row && <label className="brief-field"><span>Guests the past transfers covered</span><input aria-label="Guests the past transfers covered" type="number" min="1" step="1" value={pastTransferGuestsEntry} onChange={e=>setPastTransferGuestsEntry(e.target.value)} placeholder="Enter the past transfer guest count"/><small>Transfers use the sheet’s transfer cost × out-of-town guests ÷ this count, with the existing seasonal increase. The general cost basis above does not apply to transfers.</small>{pastTransferGuests===null && <small className="amber">Missing: enter a positive whole guest count. Transfers stay To quote until supplied.</small>}</label>}
        {h.row===food?.row && <small>Meals always use their function headcount and sheet quantity.</small>}
        {conflict && <label>Choose a function for {costLabel(h.name)}<select aria-label={`Choose a function for ${costLabel(h.name)}`} value={drivers[h.name]??''} onChange={e=>{if(e.target.value)setDrivers({...drivers,[h.name]:e.target.value});}}><option value="">Pick a function, or enter another number above</option>{drivers[h.name] && !functions.some(f=>`${f.name.value}: ${numberIn(f.guests.value)??''}`===drivers[h.name]) && <option value={drivers[h.name]}>{drivers[h.name]}</option>}{functions.map((f,i)=><option key={i} value={`${f.name.value}: ${numberIn(f.guests.value)??''}`}>{f.day.value} · {f.name.value} · {f.guests.value}</option>)}</select><small>Selected: {drivers[h.name]||'None'}. {drivers[h.name]===choice.driver ? choice.reason : 'Your edited headcount.'}</small></label>}
      </div>;
    })}
    <h3>Requirement mapping</h3>
    {requirements.scalingRules.map((r,i)=>{const heads=mappedHeads(r.head.value,budget);return <p key={i}>{costLabel(r.head.value)||'Unnamed requirement'} → {heads.length?heads.map(h=>`Overall WIP · ${costLabel(h.name)} · row ${h.row}`).join('; '):'To quote — no matching sheet row'}</p>;})}
    <p>City, dates and guest details provide context. Accommodation uses a sheet row unless you explicitly confirm the brief’s room rate.</p>
    {requirements.fields.rooms.value && <label className="confirmation"><input type="checkbox" checked={useBriefRooms} onChange={e=>setUseBriefRooms(e.target.checked)}/>Use my reviewed brief’s rooms, room rate and nights. No further season increase on this quoted rate.</label>}
    <h3>Cost range</h3>
    {statedVariance !== null ? <p>Use ±{statedVariance}% around each midpoint. {varianceSource}</p> : <label className="brief-field"><span>{briefVariance.value ? 'The brief’s variance needs a clear percentage. Which percentage should we use?' : 'The brief states no variance. Which percentage should we use?'}</span><input aria-label="Variance percentage to use" type="number" min="0" max="100" step="any" value={chosenVariance} onChange={e=>setChosenVariance(e.target.value)} placeholder="Enter a percentage, such as 10"/><small>Choose 0% to 100%. No percentage is assumed.</small></label>}
    <p>Low and high use the same percentage below and above the current figure. Season increases already included in the midpoint stay separate.</p>
    {cityRequired&&<p className="amber">Enter the event city in the City field before costing.</p>}
    <p>Confirm all accepts the displayed requirements, headcounts, cost bases and matching rows{requirements.fields.rooms.value ? ', including the displayed brief-room pricing' : ''}. You can still edit every choice.</p>
    <button className="add-detail" type="button" disabled={cityRequired||uncertain>0||needed>0||!validSheet||benchmarkNeeded||percentage===null} onClick={()=>{if(percentage!==null){setConfirmed(true);generate();}}}>Confirm all</button>
    <label className="confirmation"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>I confirm the requirements and matching rows.</label>
    <button className="read-brief" type="button" disabled={cityRequired||!confirmed||uncertain>0||needed>0||!validSheet||benchmarkNeeded||percentage===null} onClick={generate}>Cost it</button>
    {percentage===null&&<p className="amber">Enter a variance percentage to cost this.</p>}
    {benchmarkNeeded&&<p className="amber">Enter the benchmark headcount to scale costs.</p>}
    {!validSheet&&<p className="amber">We found {budget.heads.length} of the 10 heads. Upload the full Overall WIP costing to cost this.</p>}
    {(uncertain>0||needed>0)&&<p className="amber">Settle {uncertain} unclear fields and pick a headcount for {needed} heads to cost this.</p>}
    {proposal&&<section aria-label="Costed proposal"><h2>Costed first-pass proposal</h2><button className="add-detail" type="button" ref={reviewButton} onClick={()=>{if(checks && originalProposal) { onReview(<ProposalReview brief={brief} requirements={requirements} proposal={proposal} original={originalProposal} contingent={contingent} checks={checks} edits={lineEdits} percentages={linePercentages} defaults={contingencyDefaultsByHead} onBack={()=>{onReview(null);requestAnimationFrame(()=>reviewButton.current?.focus());}}/>); window.scrollTo(0,0); requestAnimationFrame(()=>document.querySelector<HTMLElement>('.proposal-review h1')?.focus()); }}}>Review proposal</button><p>Pre-GST only. To quote lines are excluded from the total.</p><p>Range: ±{proposal.variancePercentage}% · {proposal.varianceSource}</p>
      {proposal.heads.map(h=><div className="proposal-head" key={h.name}><h3>{costLabel(h.name)} · {contingent ? contingencyFigure(contingent.heads[h.name].range) : 'Check contingency percentage'}</h3><p>Headcount: {h.headcount??'per function / not set'}</p>{h.lines.map((l,i)=>{
        const key=lineKey(h.name,i), original=originalProposal!.heads.find(head=>head.name===h.name)!.lines[i];
        const edit=lineEdits[key];
        const pct=linePercentages[key];
        const defaultPct=contingencyDefaultsByHead[h.name]??0;
        const changed=l.amount!==original.amount || (edit?.contingency!==undefined && pct!==defaultPct) || (edit?.quantity!==undefined && inputNumber(edit.quantity)!==(original.pricing?.quantity??null)) || (edit?.unitCost!==undefined && inputNumber(edit.unitCost)!==(original.pricing?.unitCost??null));
        const name=i===0?costLabel(h.name):`${costLabel(h.name)} · ${costLabel(l.label)}`;
        const reserve=l.amount!==null && pct!==null ? applyContingencies({...proposal,heads:[{...h,lines:[l],amount:l.amount}],total:l.amount},{[h.name]:pct},transfers?.name).heads[h.name].reserve : null;
        return <div className="proposal-line" key={i}>
          {(l.label !== h.name || l.amount !== h.amount) && <strong>{l.label !== h.name && `${costLabel(l.label)} · `}{l.amount!==null && pct!==null ? contingencyFigure(applyContingencies({...proposal,heads:[{...h,lines:[l],amount:l.amount}],total:l.amount},{[h.name]:pct},transfers?.name).heads[h.name].range) : 'To quote'}</strong>}
          {l.headcount!==null&&<small>{l.headcount} guests</small>}<small>{costText(l.calculation,budget.heads.map(h=>h.name))}</small>
          {l.source&&l.original&&<details><summary>{costText(l.source,budget.heads.map(h=>h.name))}</summary><p>{costLabel(l.original.name)} · original pre-GST: {typeof l.original.cost==='number'?rupees(l.original.cost):'To quote'}{'quantity' in l.original?` · sheet quantity: ${l.original.quantity}`:''}</p></details>}{l.source&&!l.original&&<small>{costText(l.source,budget.heads.map(h=>h.name))}</small>}
          <div className="line-inputs">
            <label className="brief-field"><span>Quantity</span><input aria-label={`Quantity for ${name}`} type="number" min="0" step="any" value={edit?.quantity ?? original.pricing?.quantity ?? ''} onChange={e=>changeLine(key,'quantity',e.target.value)}/></label>
            <label className="brief-field"><span>Unit cost (₹)</span><input aria-label={`Unit cost for ${name}`} type="number" min="0" step="any" value={edit?.unitCost ?? original.pricing?.unitCost ?? ''} onChange={e=>changeLine(key,'unitCost',e.target.value)}/></label>
            <label className="brief-field"><span>Contingency %</span><input aria-label={`Contingency % for ${name}`} type="number" min="0" max="100" step="any" value={edit?.contingency ?? defaultPct} onChange={e=>changeLine(key,'contingency',e.target.value)}/></label>
          </div>
          {changed&&<small>Edited by you, was {original.amount===null?'To quote':rupees(Math.round((original.amount*(1+defaultPct/100)+Number.EPSILON)*100)/100)}</small>}
          <button className="add-detail" type="button" onClick={()=>setLineEdits(prev=>{const next={...prev};delete next[key];return next;})}>Reset to sheet</button>
          {pct===null ? <p className="amber">Enter a contingency from 0% to 100% for {costLabel(h.name)}.</p> : <p className="contingency-line">Contingency {pct}%: {contingencyReason(defaultPct===10,pct)}{pct>0 ? reserve ? ` · ${contingencyFigure(reserve)}` : ' · To quote; no reserve added until this head is priced.' : ''}</p>}
        </div>;
      })}</div>)}
      {checks && <section aria-label="Check before you send"><h3>Check before you send</h3>
        <h4>Missing information</h4>{checks.missing.length ? <ul>{checks.missing.map((text,i)=><li key={i}>{costText(text,proposal.heads.map(h=>h.name))}</li>)}</ul> : <p>No missing information flagged in the reviewed fields.</p>}
        <h4>Uncertain costs</h4>{checks.uncertain.length ? <ul>{checks.uncertain.map((text,i)=><li key={i}>{costText(text,proposal.heads.map(h=>h.name))}</li>)}</ul> : <p>No uncertain costs flagged.</p>}
        <h4>Assumptions and choices</h4><ul>{checks.summary.map((text,i)=><li key={i}>{costText(text,proposal.heads.map(h=>h.name))}</li>)}</ul>
        <details><summary>Show all assumptions</summary><ul>{checks.assumptions.map((text,i)=><li key={i}>{costText(text,proposal.heads.map(h=>h.name))}</li>)}</ul></details>
      </section>}
      <p className="proposal-total">{contingent ? `Pre-GST total (priced lines only): ${contingencyFigure(contingent.total)}` : 'Enter a valid contingency for every head to show the pre-GST total.'}</p>
      <p>{proposal.toQuote.length} To quote lines excluded. This is an incomplete estimate until quoted.</p>
      <button className="read-brief" type="button" disabled={!contingent || !generated} onClick={()=>{if(contingent && generated)saveCosting({version:1,brief,budget,requirements,drivers,defaults:contingencyDefaultsByHead,contingencies:linePercentages as Record<string,number>,lines:proposal,priced:contingent,state:{lineEdits,pastTransferGuestsEntry,bases,overrides,useBriefRooms,confirmed,generated,chosenVariance},total:`Pre-GST total (priced lines only): ${contingencyFigure(contingent.total)}`});}}>Save this costing</button>
      <p>Only saved costings are kept in your account. The uploaded Excel file is never stored.</p>
    </section>}
  </section>;
}
