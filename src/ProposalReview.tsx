import PricingStatus from './PricingStatus';
import CostSummary from './CostSummary';
import {perGuestLine,midpointShares} from '../shared/costDisplay';
import { costLabel, costText } from '../shared/displayLabels';
import { reviewEvent } from '../shared/reviewEvent';
import type { Requirements } from '../shared/brief';
import type { ContingencyResult } from '../shared/contingency';
import { contingencyFigure } from '../shared/contingency';
import { inputNumber, lineKey, type LineEdit } from '../shared/lineEdits';
import type { ProposalChecks } from '../shared/proposalChecks';
import { rupees, type RangedProposal } from '../shared/proposal';

type Props = {
  brief: string;
  requirements: Requirements;
  proposal: RangedProposal;
  original: RangedProposal;
  contingent: ContingencyResult | null;
  checks: ProposalChecks;
  edits: Record<string, LineEdit>;
  percentages: Record<string, number | null>;
  defaults: Record<string, number>;
  onBack: () => void;
};

export default function ProposalReview({ brief, requirements, proposal, original, contingent, checks, edits, percentages, defaults, onBack }: Props) {
  const perGuest=perGuestLine(requirements,contingent), shares=midpointShares(contingent);
  const event = reviewEvent(brief,requirements.fields.days);
  const missing = event.type ? checks.missing : ['Event type: Not stated in brief.', ...checks.missing];
  const value = (text: string) => text.trim() || 'Not recorded in confirmed requirements';
  return <main className="proposal-review" aria-label="Proposal review">
    <h1 tabIndex={-1}>Review proposal</h1>
    <button className="add-detail" type="button" onClick={onBack}>Back to edit</button>
    <section aria-labelledby="review-scope"><h2 id="review-scope">Scope</h2>
      <p>Event: {event.label}</p>
      <p>City: {value(requirements.fields.city.value)}</p>
      <p>Dates: {value(requirements.fields.dates.value)}</p>
      <h3>Confirmed functions</h3>
      {requirements.functions.length ? <ul>{requirements.functions.map((f,i)=><li key={i}>{value(f.day.value)} · {value(f.name.value)} · Guests: {value(f.guests.value)}</li>)}</ul> : <p>No confirmed functions recorded.</p>}
    </section>
    <section aria-labelledby="review-assumptions"><h2 id="review-assumptions">Assumptions</h2>
      <h3>Missing information</h3>{missing.length ? <ul>{missing.map((text,i)=><li key={i}>{costText(text,proposal.heads.map(h=>h.name))}</li>)}</ul> : <p>No missing information flagged in the reviewed fields.</p>}
      <h3>Uncertain costs</h3>{checks.uncertain.length ? <ul>{checks.uncertain.map((text,i)=><li key={i}>{costText(text,proposal.heads.map(h=>h.name))}</li>)}</ul> : <p>No uncertain costs flagged.</p>}
      <h3>Assumptions and choices</h3><ul>{checks.summary.map((text,i)=><li key={i}>{costText(text,proposal.heads.map(h=>h.name))}</li>)}</ul>
      <details><summary>Show all assumptions</summary><ul>{checks.assumptions.map((text,i)=><li key={i}>{costText(text,proposal.heads.map(h=>h.name))}</li>)}</ul></details>
    </section>
    <section aria-labelledby="review-costs"><h2 id="review-costs">Costs</h2>
      <table aria-label="Reviewed costs"><thead><tr><th scope="col">Cost head</th><th scope="col">Range</th><th scope="col">Midpoint</th><th scope="col">Source row</th><th scope="col">Contingency %</th></tr></thead>
        <tbody>{proposal.heads.map((head,hi)=>{
          const range=contingent?.heads[head.name].range;
          const rates=head.lines.map((_,i)=>percentages[lineKey(head.name,i)]);
          const uniform=rates.every(rate=>rate===rates[0]);
          const changed=head.lines.some((line,i)=>{
            const was=original.heads[hi].lines[i], edit=edits[lineKey(head.name,i)];
            return line.amount!==was.amount || (edit?.contingency!==undefined && rates[i]!== (defaults[head.name]??0)) || (edit?.quantity!==undefined && inputNumber(edit.quantity)!==(was.pricing?.quantity??null)) || (edit?.unitCost!==undefined && inputNumber(edit.unitCost)!==(was.pricing?.unitCost??null));
          });
          const sources=[...new Set(head.lines.map(line=>line.source ?? `${line.label}: no matching sheet row`))];
          const percent=(rate:number|null|undefined)=>rate===null || rate===undefined ? 'Missing or invalid' : `${rate}%`;
          return <tr key={head.name}>
            <th scope="row">{costLabel(head.name)}{changed&&<small>Edited by you</small>}</th>
            <td data-label="Range">{contingent ? range ? `${rupees(range.low)}–${rupees(range.high)}` : 'To quote' : 'Check contingency percentage'}{shares[head.name]&&<small className="head-share">{shares[head.name]}</small>}</td>
            <td data-label="Midpoint">{range ? rupees(range.midpoint) : 'To quote'}</td>
            <td data-label="Source row">{sources.map(source=><span className="review-source" key={source}>{source.startsWith('Client brief') && head.lines.some(line=>line.source===source && costLabel(line.label)==='Guest rooms') && <><strong>Guest rooms</strong><br/></>}{source}</span>)}</td>
            <td data-label="Contingency %">{uniform ? percent(rates[0]) : head.lines.map((line,i)=><span className="review-source" key={i}>{costLabel(line.label)}: {percent(rates[i])}</span>)}</td>
          </tr>;
        })}</tbody>
      </table>
    </section>
    <div className="total-with-status"><div className="total-figures"><p className="proposal-total">{contingent ? `Pre-GST total (priced lines only): ${contingencyFigure(contingent.total)}` : 'Enter a valid contingency for every head to show the pre-GST total.'}</p>
      {perGuest&&<p className="per-guest">{perGuest}</p>}</div><PricingStatus proposal={proposal}/></div>
      <CostSummary requirements={requirements} costing={contingent} names={proposal.heads.map(head=>head.name)}/>
  </main>;
}
