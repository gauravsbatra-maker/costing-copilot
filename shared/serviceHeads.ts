export const technicalServiceName='Technicals & Production';

// Keep this service's aliases separate from the existing costing/scaling rules.
export function technicalServiceHead<T extends {name:string}>(budget:{heads:T[]}):T|null {
  return budget.heads.find(head=>/^\s*(?:technicals?(?:\s*&\s*production)?|production|av|audio\s+visual|sound\s*(?:&|and)\s*light)(?:\s*\([^)]*\))?\s*$/i.test(head.name))??null;
}
