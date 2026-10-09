import { Fragment, useRef, useState, type ReactNode } from 'react';
import SavedCostings from './SavedCostings';
import type { SavedCosting } from '../shared/savedCosting';
import BriefReader from './BriefReader';
import { readProposalSheet } from '../shared/proposal';
import {  type Budget, type CostRow, type Figure } from '../shared/costing';
const format = (value: Figure) => typeof value === 'number' ? new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(value) : value;
function Values({ row }: { row: CostRow }) { return <><td>{format(row.cost)}</td><td>{format(row.nw)}</td><td>{format(row.w)}</td></>; }
export default function App() {
  const [saved, setSaved] = useState<SavedCosting | null>(null);
  const [builderKey, setBuilderKey] = useState(0);
  const [reviewPage, setReviewPage] = useState<ReactNode>(null);
  const [budget, setBudget] = useState<Budget | null>(null);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const request = useRef(0);
  async function upload(file?: File) {
    if (!file) return;
    const id = ++request.current;
    setBudget(null); setError(''); setExpanded(new Set()); setFileName(file.name); setBusy(true);
    try {
      if (!/\.(xlsx|xls|xlsm|xlsb)$/i.test(file.name)) throw new Error('Please choose an Excel workbook (.xlsx, .xls, .xlsm or .xlsb).');
      if (file.size > 25 * 1024 * 1024) throw new Error('Please choose a workbook smaller than 25 MB.');
      const result = readProposalSheet(await file.arrayBuffer());
      if (request.current === id) setBudget(result);
    } catch (e) { if (request.current === id) setError(e instanceof Error ? e.message : 'could not read this workbook'); }
    finally { if (request.current === id) setBusy(false); }
  }
  return <SavedCostings onOpen={copy=>{++request.current;setSaved(copy);setBudget(copy.budget);setFileName('Saved source rows');setReviewPage(null);setBuilderKey(k=>k+1);}} onSignOut={()=>{if(saved){setSaved(null);setBudget(null);setReviewPage(null);setBuilderKey(k=>k+1);}}}><main hidden={reviewPage !== null}>
    <header><span className="eyebrow">MILESTONE 1 · YOUR COSTING DATA</span><h1>Read back your costing sheet.</h1><p>Upload one Excel workbook to check its cost heads and figures before going further.</p></header>
    <BriefReader key={builderKey} saved={saved} costHeads={budget?.heads.map(head => head.name) ?? []} budget={budget} onReview={setReviewPage} />
    <section className="upload"><label htmlFor="workbook">Excel costing sheet</label><p>Only the Overall WIP tab is used.</p><input id="workbook" type="file" accept=".xlsx,.xls,.xlsm,.xlsb" onChange={e => { void upload(e.target.files?.[0]); e.target.value = ''; }} /><small>Your file stays in this browser. Nothing is uploaded or saved. No login required.</small></section>
    {busy && <p role="status">Reading your workbook…</p>}
    {error && <p className="error" role="alert">{error}</p>}
    {budget && <section aria-label="Costing results"><div className="result-heading"><div><h2>{budget.sheet}</h2><p>{fileName} · Excel figures as supplied · Pre-GST only</p></div><span>Amounts in Rs</span></div><p className="hint">Click a cost head to see its line items. “could not read” means the sheet did not provide a readable value; nothing is estimated.</p><div className="table-wrap"><table><thead><tr><th scope="col">Cost head / line item</th><th scope="col">Cost (W/O GST)</th><th scope="col">NW</th><th scope="col">W</th></tr></thead><tbody>
      {budget.unread.map(row => <tr key={row.row}><th scope="row">{row.name}</th><Values row={row}/></tr>)}
      {budget.heads.map(head => <Fragment key={head.row}><tr className="head"><th scope="row"><button aria-expanded={expanded.has(head.row)} onClick={() => setExpanded(prev => { const next = new Set(prev); next.has(head.row) ? next.delete(head.row) : next.add(head.row); return next; })}><span aria-hidden="true">{expanded.has(head.row) ? '−' : '+'}</span>{head.name}<small>Row {head.row} · {head.items.length} line items</small></button></th><Values row={head}/></tr>{expanded.has(head.row) && (head.items.length ? head.items.map(item => <tr className="item" key={item.row}><th scope="row">{item.name}<small>Row {item.row}</small></th><Values row={item}/></tr>) : <tr><td colSpan={4}>No line items in this cost head.</td></tr>)}</Fragment>)}
    </tbody><tfoot><tr><th scope="row">Total{budget.total.row > 0 && <small>Sheet row {budget.total.row}</small>}</th><Values row={budget.total}/></tr></tfoot></table></div></section>}
  </main>{reviewPage}</SavedCostings>;
}
