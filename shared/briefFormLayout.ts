import {fieldLabels, missingField, type BriefField, type FieldKey, type Requirements} from './brief.ts';
import {mapHead} from './proposal.ts';
export const serviceNames=['Décor','Entertainment','Bartenders','Licenses & Permissions','Design & Collaterals','Photo & Video','Other Costs'] as const;
export const functionNames=['Lunch','High Tea','Dinner','After Party'] as const;
export type FormFunction={name:string;guests:string;custom?:boolean};
export type FormService={name:string;note:string;custom?:boolean};
export type FormLayoutDraft={eventType:string;dates:string;city:string;rooms:string[];transfers:string[];food:FormFunction[][];services:FormService[]};
export const emptyFoodDay=():FormFunction[]=>functionNames.map(name=>({name,guests:''}));
export const emptyFormLayout=():FormLayoutDraft=>({eventType:'',dates:'',city:'',rooms:[''],transfers:[''],food:[emptyFoodDay()],services:serviceNames.map(name=>({name,note:''}))});
const printRows=[['Event type',''],['Event dates',''],['City',''],['Guest Rooms','Day 1'],['Guest Transfers','Day 1'],...functionNames.map(name=>['Food & Beverage',`Day 1 - ${name}`]),...serviceNames.map(name=>['Services Mentioned',name])];
// A fixed blank sheet: no client input is included in the download.
export const printableBlankBrief=`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Blank client brief</title><style>@page{size:A4;margin:15mm}body{font:12px Arial,sans-serif;color:#222}h1{font-size:20px}table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{border:1px solid #777;padding:9px;text-align:left;vertical-align:top}th:first-child,td:first-child{width:23%}th:nth-child(2),td:nth-child(2){width:29%}td:last-child{height:22px}tr{break-inside:avoid}p{font-size:11px}</style></head><body><h1>Client brief</h1><p>Leave unknown details blank. Add further day, function or service rows as needed.</p><table aria-label="Blank client brief"><thead><tr><th>Section</th><th>Row</th><th>Your details</th></tr></thead><tbody>${printRows.map(([section,row])=>`<tr><th scope="row">${section}</th><td>${row}</td><td></td></tr>`).join('')}</tbody></table></body></html>`;

const provided=(value:string,source=value):BriefField=>value.trim()?{value:value.trim(),source,status:'provided',reason:''}:missingField();
export function requirementsFromForm(draft:FormLayoutDraft):Requirements {
  const fields=Object.fromEntries(Object.keys(fieldLabels).map(key=>[key,missingField()])) as Record<FieldKey,BriefField>;
  fields.city=provided(draft.city);fields.dates=provided(draft.dates);
  const duration=/\b(\d+)\s*days?\b/i.exec(draft.dates);if(duration)fields.days=provided(duration[1]+' days',draft.dates);
  const transfers=draft.transfers.map((count,i)=>({count,day:i+1})).filter(row=>row.count.trim());
  if(transfers.length)fields.outOfTownGuests=provided(String(transfers.reduce((sum,row)=>sum+Number(row.count),0)),transfers.map(row=>`Day ${row.day}: ${row.count} pax`).join('; '));
  return {fromBriefForm:true,fields,roomNights:draft.rooms.flatMap((count,i)=>count.trim()?[provided(count,`Day ${i+1}: ${count} rooms`)]:[]),functions:draft.food.flatMap((day,i)=>day.filter(f=>f.guests.trim()).map(f=>({day:provided(`Day ${i+1}`),name:provided(f.name),guests:provided(f.guests)}))),scalingRules:[],serviceNotes:draft.services.filter(s=>s.note.trim()).map(s=>({name:s.name.trim(),text:s.note.trim()}))};
}
export function layoutBriefText(draft:FormLayoutDraft):string {
  const r=requirementsFromForm(draft);
  return [draft.eventType.trim()&&`Event type: ${draft.eventType.trim()}`,draft.dates.trim()&&`Dates: ${draft.dates.trim()}`,draft.city.trim()&&`City: ${draft.city.trim()}`,...(r.roomNights??[]).map(f=>f.source),r.fields.outOfTownGuests.source,...r.functions.map(f=>`${f.day.value} · ${f.name.value} · ${f.guests.value} guests`),...(r.serviceNotes??[]).map(s=>`${s.name}: ${s.text}`)].filter(Boolean).join('\n');
}
export function notesForHead(requirements:Requirements,budget:{heads:{name:string}[]},head:string):string[] {
  const aliases:Record<string,string>={'Décor':'Decor','Bartenders':'Bar Tenders','Licenses & Permissions':'Licenses','Design & Collaterals':'Graphic Design','Photo & Video':'Photo / Video'};
  return (requirements.serviceNotes??[]).filter(note=>(mapHead(aliases[note.name]??note.name,budget)?.name??mapHead('Other Costs',budget)?.name)===head).map(note=>`${note.name}: ${note.text}`);
}
