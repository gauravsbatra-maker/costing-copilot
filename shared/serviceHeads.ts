export const technicalServiceName='Technicals & Production';
export const addedServiceNames=[technicalServiceName,'Crew & Manpower','Venue Rentals','Gifting & Giveaways'] as const;

const aliases:Record<string,RegExp>={
  [technicalServiceName]:/\b(?:technicals?|production|av|audio\s+visual|sound\s+light)\b/i,
  'Crew & Manpower':/\b(?:crew|manpower|staff(?:ing)?)\b/i,
  'Venue Rentals':/\b(?:venues?|halls?)\b/i,
  'Gifting & Giveaways':/\b(?:gift(?:s|ing)?|give\s*aways?|hampers?|favou?rs?)\b/i,
};
export const hasServiceAliases=(name:string)=>Object.hasOwn(aliases,name);
export const matchesServiceName=(service:string,text:string)=>hasServiceAliases(service)&&aliases[service].test(text.replace(/&|\band\b/gi,' ').replace(/[^a-z0-9]+/gi,' ').trim());

// Keep service aliases separate from the existing costing/scaling rules.
export function serviceHead<T extends {name:string;items?:{name:string}[];matchedServices?:string[]}>(name:string,budget:{heads:T[]}):T|null {
  if(!hasServiceAliases(name))return null;
  const matches=(text:string)=>matchesServiceName(name,text);
  return budget.heads.find(head=>matches(head.name))??budget.heads.find(head=>head.matchedServices?.includes(name)||head.items?.some(item=>matches(item.name)))??null;
}
