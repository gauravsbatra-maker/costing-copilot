import * as XLSX from 'xlsx';

export type Figure = number | 'could not read';
export type CostRow = { row: number; name: string; cost: Figure; nw: Figure; w: Figure };
export type CostHead = CostRow & { items: CostRow[] };
export type Budget = { sheet: string; heads: CostHead[]; total: CostRow; unread: CostRow[] };
const normalize = (value: unknown) => String(value ?? '').toLowerCase().replace(/0/g, 'o').replace(/[^a-z0-9]/g, '');

export function readCosting(data: ArrayBuffer | Uint8Array): Budget {
  // Read metadata first, then parse only the first visible worksheet.
  const metadata = XLSX.read(data, { type: 'array', sheets: [] });
  const sheetName = metadata.SheetNames.find(name => {
    const entry = metadata.Workbook?.Sheets?.find(s => s.name === name);
    return !entry?.Hidden;
  });
  if (!sheetName) throw new Error('No visible tab was found in this workbook.');
  const workbook = XLSX.read(data, { type: 'array', sheets: [sheetName], cellFormula: true });
  const sheet = workbook.Sheets[sheetName];
  if (!sheet?.['!ref']) throw new Error('The first visible tab is empty.');
  const range = XLSX.utils.decode_range(sheet['!ref']);
  if (range.e.r > 100000 || range.e.c > 1000) throw new Error('This tab is too large to read safely. Please upload a smaller costing sheet.');
  const cell = (r: number, c: number) => sheet[XLSX.utils.encode_cell({ r, c })] as XLSX.CellObject | undefined;
  let header = -1;
  let columns: number[] = [];
  for (let r = range.s.r; r <= range.e.r; r++) {
    if (normalize(cell(r, 0)?.v) !== 'srno') continue;
    const names = Array.from({ length: range.e.c + 1 }, (_, c) => normalize(cell(r, c)?.v));
    columns = ['costwogst', 'nw', 'w'].map(name => names.indexOf(name));
    if (columns.every(c => c >= 0)) { header = r; break; }
    if (r < range.e.r) {
      const below = names.map((_, c) => normalize(cell(r + 1, c)?.v));
      columns = ['costwogst', 'nw', 'w'].map(name => names.findIndex((top, c) =>
        top === name || below[c] === name || top + below[c] === name));
      if (columns.every(c => c >= 0)) { header = r + 1; break; }
    }
  }
  if (header < 0) throw new Error('Could not read the header. Expected Sr No, Cost (W/O GST), NW and W across one or two header rows.');
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
    const relevant = [0, 1, ...columns];
    if (!relevant.some(c => cell(r, c)?.v !== undefined || cell(r, c)?.f)) continue;
    const rawName = cell(r, 1);
    const name = rawName?.t !== 'e' && typeof rawName?.v === 'string' && rawName.v.trim() ? rawName.v.trim() : 'could not read';
    const row: CostRow = { row: r + 1, name, cost: figure(r, columns[0]), nw: figure(r, columns[1]), w: figure(r, columns[2]) };
    if (name.toLowerCase() === 'total') { total = row; break; }
    const serial = cell(r, 0)?.v;
    const numbered = (typeof serial === 'number' || typeof serial === 'string') && /^\d+$/.test(String(serial).trim()) && Number(serial) > 0;
    if (numbered) { current = { ...row, items: [] }; heads.push(current); }
    else if (current) current.items.push(row);
    else unread.push({ ...row, name: `could not read — row ${r + 1}${name !== 'could not read' ? ': ' + name : ''}` });
  }
  if (!heads.length) throw new Error('Could not read any numbered cost heads in the first visible tab.');
  return { sheet: sheetName, heads, unread, total: total ?? { row: 0, name: 'Total', cost: 'could not read', nw: 'could not read', w: 'could not read' } };
}
