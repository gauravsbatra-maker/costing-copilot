import BriefForm from './BriefFormLayout';
import {layoutBriefText,emptyFormLayout,requirementsFromForm} from '../shared/briefFormLayout';
import { scalingRuleReview, hasScalingRule } from '../shared/scalingRuleReview';
import { nightlyRooms, totalRoomNights } from '../shared/roomNights';
import { costLabel, costText } from '../shared/displayLabels';
import type { SavedCosting } from '../shared/savedCosting';
import { selectedEventCity } from '../shared/eventCity';
import CostingReview from './CostingReview';
import type { Budget } from '../shared/costing';
import { prepareReview, suggestedHeadChoices } from '../shared/reviewChoices';
import { numberIn } from '../shared/proposal';
import { useRef, useState, type ReactNode } from 'react';
import { ConvexHttpClient } from 'convex/browser';
import { ConvexError } from 'convex/values';
import { api } from '../convex/_generated/api';
import { fieldLabels, fieldNotice, hasHeadcountConflict, missingField, type BriefField, type FieldKey, type Requirements } from '../shared/brief';

function Editable({ label, field, onChange, headNames=[] }: { headNames?:string[]; label: string; field: BriefField; onChange: (field: BriefField) => void }) {
  const notice = fieldNotice(field);
  return <label className={`brief-field ${notice ? 'needs-review' : ''}`}><span>{label}</span><input aria-label={label} value={costText(field.value,headNames)} placeholder={notice || label} onChange={e => onChange(e.target.value.trim() ? { ...field, value: e.target.value, status: 'corrected', reason: '' } : { ...missingField(), source: field.source })} />
    {notice && <small className="amber">{notice}</small>}
    {field.source && <small>From brief: “{costText(field.source,headNames)}”</small>}
    {field.status === 'corrected' && <small>{field.reason ? `Pre-filled: ${field.reason}` : 'Your correction · kept only in this page'}</small>}
  </label>;
}
export default function BriefReader({ costHeads, budget, onReview, saved }: { saved?: SavedCosting | null; costHeads: string[]; budget: Budget | null; onReview: (page: ReactNode) => void }) {
  const [client] = useState(() => new ConvexHttpClient(import.meta.env.VITE_CONVEX_URL));
  const [brief, setBrief] = useState(saved?.brief ?? '');
  const [entryMode,setEntryMode]=useState<'paste'|'form'>('paste');
  const [formDraft,setFormDraft]=useState(emptyFormLayout);
  const [costingBrief,setCostingBrief]=useState(saved?.brief ?? '');
  const [cityEntry, setCityEntry] = useState<string | null>(saved?.requirements.fields.city.value ?? null);
  const [result, setResult] = useState<Requirements | null>(saved?.requirements ?? null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [drivers, setDrivers] = useState<Record<string, string>>(saved?.drivers ?? {});
  const request = useRef(0);
  function switchEntryMode(mode:'paste'|'form') { setEntryMode(mode); }
  const inputBrief=entryMode==='paste'?brief:layoutBriefText(formDraft);
  async function read() {
    const text=inputBrief, preferredCity=entryMode==='form'?(formDraft.city.trim()||null):cityEntry;setCostingBrief(text);
    const id = ++request.current;
    setResult(null); setError(''); setDrivers({}); setBusy(true);
    try { const next = entryMode==='form'?requirementsFromForm(formDraft):await client.action(api.brief.structure, { brief:text }); if (request.current === id) { const reviewed = entryMode==='form'?next:prepareReview(next, text); reviewed.fields.city = selectedEventCity(reviewed.fields.city, preferredCity); setResult(reviewed); } }
    catch (e) { if (request.current === id) setError(e instanceof ConvexError && typeof e.data === 'string' ? e.data : 'The brief could not be read. Please try again.'); }
    finally { if (request.current === id) setBusy(false); }
  }
  function editField(key: FieldKey, field: BriefField) { if(key==='city') setCityEntry(field.value); setResult(prev => prev && { ...prev, fields: { ...prev.fields, [key]: field } }); }
  function editFunction(index: number, key: 'day' | 'name' | 'guests', field: BriefField) { setDrivers({}); setResult(prev => prev && { ...prev, functions: prev.functions.map((row, i) => i === index ? { ...row, [key]: field } : row) }); }
  function editRule(index: number, key: 'head' | 'rule', field: BriefField) { setResult(prev => prev && { ...prev, scalingRules: prev.scalingRules.map((row, i) => i === index ? { ...row, [key]: field } : row) }); }
  const suggestions = budget && result ? suggestedHeadChoices(budget, result) : {};
  const selectedDrivers = Object.fromEntries(Object.entries(suggestions).map(([head, choice])=>[head, drivers[head] ?? choice.driver]));
  const heads = budget ? budget.heads.map(h=>h.name) : result ? Array.from(new Set([...costHeads, ...result.scalingRules.map(row => row.head.value).filter(Boolean)])) : [];
  const rules = result ? heads.filter(name=>!hasScalingRule(name,result,budget)) : [];
  return <section className="brief-reader" aria-label="Brief requirements">
    <div className="brief-tabs" role="tablist" aria-label="Brief entry method">{(['paste','form'] as const).map(mode=><button key={mode} type="button" role="tab" id={`${mode}-brief-tab`} aria-controls={`${mode}-brief-panel`} aria-selected={entryMode===mode} tabIndex={entryMode===mode?0:-1} disabled={busy} onClick={()=>switchEntryMode(mode)} onKeyDown={e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const next=e.key==='Home'?'paste':e.key==='End'?'form':mode==='paste'?'form':'paste';switchEntryMode(next);document.getElementById(`${next}-brief-tab`)?.focus();}}}>{mode==='paste'?'Paste client brief':'Fill brief form'}</button>)}</div>
    <form onSubmit={e => { e.preventDefault(); void read(); }}><div className={`brief-entry ${entryMode==='form'?'form-entry':''}`}><div>{entryMode==='paste'?<div role="tabpanel" id="paste-brief-panel" aria-labelledby="paste-brief-tab"><label htmlFor="brief-text">Paste the brief</label><p>Paste WhatsApp text. The AI reads the brief; your Excel file stays in your browser.</p><textarea id="brief-text" rows={7} maxLength={16000} required value={brief} disabled={busy} onChange={e => { setBrief(e.target.value); setResult(null); setDrivers({}); setError(''); }} placeholder="Paste your event brief here" /></div>:<BriefForm draft={formDraft} busy={busy} onChange={draft=>{setFormDraft(draft);setResult(null);setDrivers({});setError('');}}/>}</div>
      {entryMode==='paste'&&<label className="brief-field"><span>Event city (optional)</span><input aria-label="Event city" value={cityEntry ?? result?.fields.city.value ?? ''} disabled={busy} onChange={e=>{setCityEntry(e.target.value);setResult(prev=>prev && {...prev,fields:{...prev.fields,city:selectedEventCity(prev.fields.city,e.target.value)}});}} placeholder="Enter the event city"/><small>Your entry takes priority over the brief.</small></label>}</div>
      <div className="brief-actions"><button className="read-brief" type="submit" disabled={busy || (entryMode==='paste' && !inputBrief.trim())}>{busy ? 'Reading the brief…' : 'Read the brief'}</button><small>Up to 30 AI calls per hour across this app. Your brief and edits are not saved.</small></div>
    </form>
    {busy && <p role="status">Reading requirements from your brief…</p>}
    {error && <p className="error" role="alert">{error}</p>}
    {result && <div className="requirements"><h2>Review the requirements</h2><p>Every filled value quotes your brief. Amber fields need your input. Changes stay on this page.</p>
      {!result.fields.city.value.trim() && <p className="amber">{result.fromBriefForm?'City not confirmed':'Enter the event city in the City field below before costing.'}</p>}
      <div className="brief-grid">{(Object.keys(fieldLabels) as FieldKey[]).filter(key=>key!=='rooms' && key!=='nights').map(key => <Editable key={key} label={fieldLabels[key]} field={result.fields[key]} onChange={field => editField(key, field)} />)}</div>
      <section aria-label="Room nights"><h3>Rooms per night</h3>{nightlyRooms(result).map((field,index)=><Editable key={index} label={`Room count – Night ${index+1}`} field={field} onChange={next=>setResult(prev=>prev && {...prev,roomNights:nightlyRooms(prev).map((row,i)=>i===index?next:row)})}/>)}
      <button className="add-detail" type="button" onClick={()=>setResult(prev=>prev && {...prev,roomNights:[...nightlyRooms(prev),missingField()]})}>Add night</button>
      <p>Total room nights: {totalRoomNights(nightlyRooms(result)) ?? 'Enter a valid room count for every night'}</p></section>
      <h3>Functions per day</h3>{!result.functions.length && <p className="amber">Missing: no functions were stated in the brief.</p>}
      {result.functions.map((row, index) => <div className="function-grid" key={index}><Editable label={`Function ${index + 1} day / date`} field={row.day} onChange={field => editFunction(index, 'day', field)} /><Editable label={`Function ${index + 1} name`} field={row.name} onChange={field => editFunction(index, 'name', field)} /><Editable label={`Function ${index + 1} guest count`} field={row.guests} onChange={field => editFunction(index, 'guests', field)} /></div>)}
      <button className="add-detail" type="button" onClick={() => setResult(prev => prev && { ...prev, functions: [...prev.functions, { day: missingField(), name: missingField(), guests: missingField() }] })}>Add a missing function</button>
      <h3>Scaling rule for each cost head</h3>{!result.scalingRules.length && !costHeads.length && <p className="amber">Missing: no cost heads or scaling rules were stated in the brief.</p>}
      {scalingRuleReview(result,budget).map(({row,index,label},position) => <div className="rule-grid" key={index}><Editable headNames={heads} label={`Cost head ${position + 1}`} field={{...row.head,value:label}} onChange={field => editRule(index, 'head', field)} /><Editable headNames={heads} label={`Scaling rule ${position + 1}`} field={row.rule} onChange={field => editRule(index, 'rule', field)} /></div>)}
      {rules.map(name => <div className="worksheet-rule" key={name}><strong>{costLabel(name)}</strong><p className="amber">Missing: no scaling rule for this Excel cost head was stated in the brief.</p><button className="add-detail" type="button" onClick={() => setResult(prev => prev && { ...prev, scalingRules: [...prev.scalingRules, { head: { value: name, status: 'corrected', source: '', reason: '' }, rule: missingField() }] })}>Enter a rule for {costLabel(name)}</button></div>)}
      <button className="add-detail" type="button" onClick={() => setResult(prev => prev && { ...prev, scalingRules: [...prev.scalingRules, { head: missingField(), rule: missingField() }] })}>Add a missing cost head</button>
      {(hasHeadcountConflict(result) || new Set(result.functions.map(f => numberIn(f.guests.value)).filter(n => n !== null)).size > 1) && <div className="headcount-flag" role="alert"><h3>Headcounts differ</h3><p>Your rules are pre-filled below. Review the reasons and change any choice before confirming.</p>
        {!heads.length && <p>Add the cost heads stated in the brief or upload your Excel sheet to identify the heads that need a choice.</p>}
        {heads.map(head => <label className="brief-field" key={head}><span>Headcount driving {costLabel(head)}</span><input aria-label={`Headcount driving ${costLabel(head)}`} value={drivers[head] ?? selectedDrivers[head] ?? ''} placeholder="Choose the function and headcount, or explain the basis" onChange={e => setDrivers(prev => ({ ...prev, [head]: e.target.value }))} /><small>{drivers[head] !== undefined ? 'Your edited choice replaces the suggested headcount.' : `Pre-filled. ${suggestions[head]?.reason ?? ''}`}</small>{!(drivers[head] ?? selectedDrivers[head])?.trim() && <small className="amber">Missing: which headcount should drive {costLabel(head)}?</small>}</label>)}
    </div>}
      {budget && <CostingReview initial={saved?.requirements===result ? saved : null} key={JSON.stringify(result)} budget={budget} requirements={result} brief={costingBrief} drivers={selectedDrivers} setDrivers={setDrivers} onReview={onReview} />}
    </div>}
  </section>;
}
