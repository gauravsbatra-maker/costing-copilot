import type { Requirements } from './brief.ts';
import type { Budget } from './costing.ts';
import { mapHead, mappedHeads } from './proposal.ts';
import { costLabel } from './displayLabels.ts';

const displayMatches=(name:string,budget:Budget)=>{
  const normalize=(text:string)=>text.toLowerCase().replace(/[^a-z0-9]/g,'');
  const display=budget.heads.find(h=>normalize(costLabel(h.name))===normalize(costLabel(name)));
  return display ? [display] : mappedHeads(name,budget);
};

// Presentation only: retain original indices, rules and sheet keys used for pricing.
export function scalingRuleReview(requirements: Requirements, budget: Budget | null) {
  const rules=requirements.scalingRules;
  const key=(index:number)=>{
    const row=rules[index];
    const heads=budget ? displayMatches(row.head.value,budget) : [];
    return heads.length ? heads.map(h=>h.row).sort((a,b)=>a-b).join(',') : row.head.value.trim().toLowerCase();
  };
  const food=budget ? mapHead('Food',budget) : null;
  return rules.flatMap((row,index)=>{
    const duplicate=rules.some((other,i)=>i!==index && key(i)===key(index) && other.rule.value.trim() && (!row.rule.value.trim() || (i<index && other.rule.value===row.rule.value)));
    if(duplicate)return [];
    const matched=budget ? displayMatches(row.head.value,budget) : [];
    return [{row,index,label:food && matched.length===1 && matched[0].row===food.row ? costLabel(food.name) : costLabel(row.head.value)}];
  });
}
export function hasScalingRule(name:string, requirements:Requirements, budget:Budget|null): boolean {
  return requirements.scalingRules.some(row=>row.head.value===name || Boolean(budget && displayMatches(row.head.value,budget).some(h=>h.name===name)));
}
