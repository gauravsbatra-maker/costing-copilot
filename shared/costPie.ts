import type {ContingencyResult} from './contingency.ts';
import {midpointShares} from './costDisplay.ts';

export function costPieSlices(costing:ContingencyResult,names:string[]) {
  const shares=midpointShares(costing);
  const heads=names.map(name=>({name,midpoint:costing.heads[name]?.range?.midpoint??0,tenths:Math.round(parseFloat(shares[name]??'0')*10)}))
    .filter(head=>head.midpoint>0).sort((a,b)=>b.midpoint-a.midpoint);
  const slices=heads.slice(0,6),rest=heads.slice(6);
  if(rest.length)slices.push({name:'Other',midpoint:rest.reduce((sum,head)=>sum+head.midpoint,0),tenths:rest.reduce((sum,head)=>sum+head.tenths,0)});
  return slices.map(slice=>({...slice,share:`${(slice.tenths/10).toFixed(1)}%`}));
}
