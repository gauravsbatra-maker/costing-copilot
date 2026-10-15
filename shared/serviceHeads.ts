export const technicalServiceName='Technicals & Production';
export const addedServiceNames=[technicalServiceName,'Crew & Manpower','Venue Rentals','Gifting & Giveaways'] as const;

const aliases:Record<string,RegExp>={
  [technicalServiceName]:/^\s*(?:technicals?(?:\s*&\s*production)?|production|av|audio\s+visual|sound\s*(?:&|and)\s*light)(?:\s*\([^)]*\))?\s*$/i,
  'Crew & Manpower':/^(?:Crew|Manpower|Crew & Manpower|Staffing|Event Staff)$/i,
  'Venue Rentals':/^(?:Venue|Venue Rental|Venue Rentals|Venue Hire|Hall Rental)$/i,
  'Gifting & Giveaways':/^(?:Gifting|Gifts|Giveaways|Hampers|Favours|Favors|Return Gifts)$/i,
};
export const hasServiceAliases=(name:string)=>Object.hasOwn(aliases,name);

// Keep service aliases separate from the existing costing/scaling rules.
export function serviceHead<T extends {name:string}>(name:string,budget:{heads:T[]}):T|null {
  return hasServiceAliases(name)?budget.heads.find(head=>aliases[name].test(head.name.trim()))??null:null;
}
