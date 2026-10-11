import * as XLSX from 'xlsx';
import {readVisibleWorksheet} from './visibleWorksheets.ts';
export {visibleSheetNames,readVisibleWorksheet} from './visibleWorksheets.ts';
import {detectSheetHeader} from './sheetHeader.ts';

export type Figure = number | 'could not read';
// NW/W remain empty legacy fields so older saved snapshots still reopen. They are never read or used for costing.
export type CostRow = { row: number; name: string; cost: Figure; nw: Figure; w: Figure };
export type CostHead = CostRow & { items: CostRow[] };
export type Budget = { sheet: string; heads: CostHead[]; total: CostRow; unread: CostRow[] };

export function readCosting(data: ArrayBuffer | Uint8Array, selected?: string): Budget {
  const {sheet, sheetName} = readVisibleWorksheet(data, selected);
  return readCostingWorksheet(sheet, sheetName);
}
export function readCostingWorksheet(sheet: XLSX.WorkSheet, sheetName: string): Budget {
  if (!sheet?.['!ref']) throw new Error('The chosen tab is empty.');
  const range = XLSX.utils.decode_range(sheet['!ref']);
  if (range.e.r > 100000) throw new Error('This tab is too large to read safely. Please upload a smaller costing sheet.');
  const cell = (r: number, c: number) => sheet[XLSX.utils.encode_cell({ r, c })] as XLSX.CellObject | undefined;
  const {lastRow:header} = detectSheetHeader(sheet);
  const figure = (r: number, c: number): Figure => {
    const entry = cell(r, c);
    if (!entry || entry.t === 'e' || entry.t === 'b') return 'could not read';
    if (typeof entry.v === 'number' && Number.isFinite(entry.v)) return entry.v;
    // Accept numeric text, including Indian comma grouping; never calculate formulas.
    if (typeof entry.v === 'string') {
      const text = entry.v.trim();
      if (/^[+-]?(?:\d+|\d{1,3}(?:,\d{2,3})+)(?:\.\d+)?$/.test(text)) return Number(text.replaceAll(',', ''));
    }
    return 'could not read';
  };
  const heads: CostHead[] = [], unread: CostRow[] = [];
  let current: CostHead | undefined;
  let total: CostRow | undefined;
  for (let r = header + 1; r <= range.e.r; r++) {
    const relevant = [0, 1, 6];
    if (!relevant.some(c => cell(r, c)?.v !== undefined || cell(r, c)?.f)) continue;
    const rawName = cell(r, 1);
    const name = rawName?.t !== 'e' && typeof rawName?.v === 'string' && rawName.v.trim() ? rawName.v.trim() : 'could not read';
    const row: CostRow = { row: r + 1, name, cost: figure(r, 6), nw: 'could not read', w: 'could not read' };
    if (name.toLowerCase() === 'total') { total = row; break; }
    const serial = cell(r, 0)?.v;
    const numbered = (typeof serial === 'number' || typeof serial === 'string') && /^\d+$/.test(String(serial).trim()) && Number(serial) > 0;
    if (numbered) { current = { ...row, items: [] }; heads.push(current); }
    else if (current) current.items.push(row);
    else unread.push({ ...row, name: `could not read — row ${r + 1}${name !== 'could not read' ? ': ' + name : ''}` });
  }
  if (!heads.length) throw new Error('Could not read any numbered cost heads in the chosen tab.');
  return { sheet: sheetName, heads, unread, total: total ?? { row: 0, name: 'Total', cost: 'could not read', nw: 'could not read', w: 'could not read' } };
}
