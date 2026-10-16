import {addedServiceNames} from '../shared/serviceHeads';
import {emptyFormLayout,type FormLayoutDraft} from '../shared/briefFormLayout';

const key='costing-brief-form-v1';
const strings=(value:unknown):value is string[]=>Array.isArray(value)&&value.length<=30&&value.every(item=>typeof item==='string');
export function readBriefFormDraft():FormLayoutDraft {
  try {
    const draft=JSON.parse(localStorage.getItem(key)??'null');
    if(draft && ['eventType','dates','city'].every(field=>typeof draft[field]==='string') &&
      strings(draft.rooms)&&strings(draft.transfers)&&Array.isArray(draft.food)&&draft.food.length<=30&&
      draft.food.every((day:unknown)=>Array.isArray(day)&&day.length<=30&&day.every(row=>row&&typeof row.name==='string'&&typeof row.guests==='string'&&(row.custom===undefined||typeof row.custom==='boolean')))&&
      Array.isArray(draft.services)&&draft.services.length<=34&&draft.services.every((row:FormLayoutDraft['services'][number])=>row&&typeof row.name==='string'&&typeof row.note==='string'&&(row.custom===undefined||typeof row.custom==='boolean'))){
      for(const [index,name] of addedServiceNames.entries()) if(!draft.services.some((row:FormLayoutDraft['services'][number])=>row.name===name)){
        const previous=index===0?'Design & Collaterals':addedServiceNames[index-1];
        const after=draft.services.findIndex((row:FormLayoutDraft['services'][number])=>row.name===previous);
        draft.services.splice(after<0?draft.services.length:after+1,0,{name,note:''});
      }
      if(!draft.miscellaneous || typeof draft.miscellaneous.description!=='string' || typeof draft.miscellaneous.amount!=='string')draft.miscellaneous={description:'',amount:''};
      return draft;
    }
  } catch { /* A blocked browser store or invalid old draft must not stop costing. */ }
  return emptyFormLayout();
}
export function writeBriefFormDraft(draft:FormLayoutDraft) {
  try { localStorage.setItem(key,JSON.stringify(draft)); } catch { /* The form remains usable without browser storage. */ }
}
export function clearBriefFormDraft() {
  try { localStorage.removeItem(key); } catch { /* Clear the on-screen form even when storage is blocked. */ }
}
