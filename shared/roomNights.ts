import type { BriefField, Requirements } from './brief.ts';
const empty = (): BriefField => ({value:'',status:'missing',source:'',reason:''});
export function roomCount(value: string): number | null {
  const match=/^\s*(\d[\d,]*)\s*(?:rooms?)?\s*$/i.exec(value);
  const n=match ? Number(match[1].replaceAll(',','')) : NaN;
  return Number.isSafeInteger(n) && n>=0 ? n : null;
}
export function nightlyRooms(requirements: Requirements): BriefField[] {
  if (requirements.roomNights) return requirements.roomNights;
  // Existing reviewed fields can include prose, such as “40 rooms at the venue hotel”.
  const legacyCount=(text:string)=>{
    const matches=text.match(/\d[\d,]*(?:\.\d+)?/g);
    const n=matches?.length===1 ? Number(matches[0].replaceAll(',','')) : NaN;
    return Number.isSafeInteger(n) && n>0 ? n : null;
  };
  const rooms=legacyCount(requirements.fields.rooms.value), nights=legacyCount(requirements.fields.nights.value);
  return nights && nights<=1000 ? Array.from({length:nights},()=>rooms===null ? empty() : {...requirements.fields.rooms,value:String(rooms)}) : [empty()];
}
export function totalRoomNights(rows: BriefField[]): number | null {
  const counts=rows.map(row=>row.status==='unclear' ? null : roomCount(row.value));
  const sum=counts.reduce<number>((sum,n)=>sum+(n??0),0);
  return counts.length && counts.every(n=>n!==null) && Number.isSafeInteger(sum) ? sum : null;
}
export function roomsFromBrief(requirements: Requirements, brief: string): BriefField[] {
  const stated=new Map<number,BriefField>();
  for (const line of brief.split(/[\r\n;]/)) {
    if (/\b(?:benchmark|historical|previous|past|old|last year|reference project)\b/i.test(line)) continue;
    const patterns=[/(\d[\d,]*)\s+rooms?\s*(?:for\s+|on\s+)?night\s*(\d+)/gi,/night\s*(\d+)\s*[:=–—-]?\s*(\d[\d,]*)\s+rooms?\b/gi];
    for (const [i,pattern] of patterns.entries()) for (const m of line.matchAll(pattern)) {
      const night=Number(m[i===0?2:1]), value=m[i===0?1:2].replaceAll(',','');
      if (!Number.isSafeInteger(night)||night<1||night>1000) continue;
      const previous=stated.get(night);
      stated.set(night,previous && (previous.status==='unclear'||previous.value!==value) ? {value:'',status:'unclear',source:line.trim(),reason:'The brief gives conflicting room counts for this night.'} : {value,status:'provided',source:line.trim(),reason:''});
    }
  }
  return stated.size ? Array.from({length:Math.max(...stated.keys())},(_,i)=>stated.get(i+1)??empty()) : nightlyRooms(requirements);
}
