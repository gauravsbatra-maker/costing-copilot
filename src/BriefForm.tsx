import {blankBriefForm,type BriefFormDraft} from '../shared/briefForm';
export default function BriefForm({draft,onChange,busy}:{draft:BriefFormDraft;onChange:(draft:BriefFormDraft)=>void;busy:boolean}) {
 const field=(label:string,key:'eventType'|'dates'|'city')=><label className="brief-field"><span>{label}</span><input value={draft[key]} disabled={busy} maxLength={500} onChange={e=>onChange({...draft,[key]:e.target.value})}/></label>;
 return <div role="tabpanel" id="form-brief-panel" aria-labelledby="form-brief-tab">
  <div className="brief-grid">{field('Event type','eventType')}{field('Event dates','dates')}{field('City','city')}</div>
  <p>Include the duration with the dates if known. Leave anything unknown blank.</p>
  <h3>Functions</h3>{draft.functions.map((f,i)=><div className="function-grid" key={i}>{(['day','name','guests'] as const).map((key,j)=><label className="brief-field" key={key}><span>{['Day / date','Function name','Guest count'][j]} – Function {i+1}</span><input disabled={busy} maxLength={500} inputMode={key==='guests'?'numeric':undefined} value={f[key]} onChange={e=>onChange({...draft,functions:draft.functions.map((row,index)=>index===i?{...row,[key]:e.target.value}:row)})}/></label>)}</div>)}
  <button className="add-detail" type="button" disabled={busy||draft.functions.length>=30} onClick={()=>onChange({...draft,functions:[...draft.functions,{day:'',name:'',guests:''}]})}>Add function</button>
  <label className="brief-field"><span>Services mentioned</span><textarea disabled={busy} rows={6} maxLength={12000} value={draft.services} onChange={e=>onChange({...draft,services:e.target.value})}/></label>
  <p>Include any room needs, travel, quoted rates and costing instructions stated.</p>
  <button className="add-detail" type="button" onClick={()=>{const url=URL.createObjectURL(new Blob([blankBriefForm],{type:'text/plain;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download='blank-client-brief.txt';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}}>Download blank brief form</button>
 </div>;
}
