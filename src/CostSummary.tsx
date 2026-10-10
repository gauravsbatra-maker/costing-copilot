import type {Requirements} from '../shared/brief';
import type {ContingencyResult} from '../shared/contingency';
import {costSummary} from '../shared/costDisplay';
import {costLabel} from '../shared/displayLabels';

export default function CostSummary({requirements,costing,names}:{requirements:Requirements;costing:ContingencyResult|null;names:string[]}) {
  if(!costing)return null;
  const rows=costSummary(requirements,costing,names),total=rows[rows.length-1];
  const cells=(row:typeof total)=><><th scope="row">{costLabel(row.name)}</th><td>{row.mean}</td><td>{row.perGuest}</td><td>{row.share}</td></>;
  return <table className="cost-summary" aria-label="Cost summary">
    <colgroup><col/><col/><col/><col/></colgroup>
    <thead><tr><th scope="col">Expense head</th><th scope="col">Mean (midpoint, ₹)</th><th scope="col">Per guest (₹)</th><th scope="col">% of total</th></tr></thead>
    <tbody>{rows.slice(0,-1).map(row=><tr key={row.name}>{cells(row)}</tr>)}</tbody>
    <tfoot><tr>{cells(total)}</tr></tfoot>
  </table>;
}
