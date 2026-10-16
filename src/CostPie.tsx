import type {ContingencyResult} from '../shared/contingency';
import {costPieSlices} from '../shared/costPie';
import {costLabel} from '../shared/displayLabels';

const colours=['var(--action)','#1b929a','var(--ink)','#596168','#81888a','#adb2b3','#d0d3d0'];
export default function CostPie({costing,names}:{costing:ContingencyResult|null;names:string[]}) {
  if(!costing)return null;
  const slices=costPieSlices(costing,names);
  if(!slices.length)return null;
  const sum=slices.reduce((total,slice)=>total+slice.midpoint,0);
  let angle=-Math.PI/2;
  const point=(a:number)=>`${120+110*Math.cos(a)},${120+110*Math.sin(a)}`;
  return <figure className="cost-pie" aria-label="Expense head midpoint shares">
    <svg viewBox="0 0 240 240" role="img" aria-label="Pie chart of priced expense heads">
      {slices.map((slice,index)=>{
        const start=angle,sweep=slice.midpoint/sum*2*Math.PI;angle+=sweep;
        const label=`${costLabel(slice.name)} · ${slice.share}`;
        return slices.length===1?<circle key={index} cx="120" cy="120" r="110" fill={colours[index]}><title>{label}</title></circle>:
          <path key={index} d={`M120,120 L${point(start)} A110,110 0 ${sweep>Math.PI?1:0},1 ${point(angle)} Z`} fill={colours[index]} stroke="var(--linen)" strokeWidth="1"><title>{label}</title></path>;
      })}
    </svg>
    <figcaption><ul>{slices.map((slice,index)=><li key={index}><span className="cost-pie-key" style={{background:colours[index]}} aria-hidden="true"/><span>{costLabel(slice.name)} · {slice.share}</span></li>)}</ul></figcaption>
  </figure>;
}
