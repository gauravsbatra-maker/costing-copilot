export type BriefFormDraft={eventType:string;dates:string;city:string;functions:{day:string;name:string;guests:string}[];services:string};
export const emptyBriefForm=():BriefFormDraft=>({eventType:'',dates:'',city:'',functions:[{day:'',name:'',guests:''}],services:''});
export function briefFromForm(draft:BriefFormDraft):string {
  const lines=[draft.eventType.trim() && `Event type: ${draft.eventType.trim()}`,draft.dates.trim() && `Dates: ${draft.dates.trim()}`,draft.city.trim() && `City: ${draft.city.trim()}`].filter(Boolean);
  for(const f of draft.functions)if(f.day.trim() || f.name.trim() || f.guests.trim())lines.push([f.day.trim(),f.name.trim(),f.guests.trim() && `${f.guests.trim()} guests`].filter(Boolean).join(' · '));
  if(draft.services.trim())lines.push(`Services mentioned:\n${draft.services.trim()}`);
  return lines.join('\n');
}
export const blankBriefForm=`CLIENT BRIEF

Event type:
Dates and duration:
City (leave blank if unconfirmed):

FUNCTIONS — add one line per function on each day
Day / date | Function name | Guest count
__________ | _____________ | ___________
__________ | _____________ | ___________
__________ | _____________ | ___________
__________ | _____________ | ___________

Services mentioned:
Include any room needs, travel, quoted rates and costing instructions stated.
Leave anything unknown blank; do not guess.
________________________________________________________
________________________________________________________
________________________________________________________
`;
