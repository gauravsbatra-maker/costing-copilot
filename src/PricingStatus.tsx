import {costLabel} from '../shared/displayLabels';
import type {RangedProposal} from '../shared/proposal';
export default function PricingStatus({proposal}:{proposal:RangedProposal}) {
 const excluded=proposal.heads.flatMap(head=>head.lines.filter(line=>line.amount===null).map(line=>({head:head.name,name:line.label})));
 return <div className="pricing-status"><p className={excluded.length?'amber':'priced-status'}>{excluded.length?`To quote: ${excluded.length} lines not in this total`:'All lines priced'}</p>{excluded.length>0&&<ul>{excluded.map((line,i)=><li key={i}>{costLabel(line.head)} — {costLabel(line.name)}</li>)}</ul>}</div>;
}
