import * as XLSX from 'xlsx';
import type {Figure} from './costing.ts';
export const noNumericColumn = 'No numeric column found.';
export function isSerialMarker(cell?:XLSX.CellObject):boolean {
 if(!cell || cell.t==='e' || cell.t==='b')return false;
 const figure=sheetFigure(cell);
 if(typeof figure==='number'&&Number.isInteger(figure)&&Number(cell.v)>0)return true;
 return typeof cell.v==='string'&&/^(?:[a-z]|i{1,3}|iv|vi{0,3}|ix|xi{0,3}|xiv|xvi{0,3}|xix|xx)[.)]?$/i.test(cell.v.trim());
}
export function sheetFigure(entry?: XLSX.CellObject): Figure {
 if (!entry || entry.t==='e' || entry.t==='b') return 'could not read';
 if (typeof entry.v==='number' && Number.isFinite(entry.v)) return entry.v;
 if (typeof entry.v==='string' && /^[+-]?(?:\d+|\d{1,3}(?:,\d{2,3})+)(?:\.\d+)?$/.test(entry.v.trim())) return Number(entry.v.trim().replaceAll(',',''));
 return 'could not read';
}
export const isTotalRow=(name:string)=>/^(?:(?:grand|sub)[\s-]*)?total\b|\b(?:subtotal|sub[\s-]+total|grand[\s-]+total)\s*$/i.test(name.trim());
export function detectSheetColumns(sheet:XLSX.WorkSheet, selected?:number) {
 const rows=new Map<number,Map<number,XLSX.CellObject>>();
 for(const [address,entry] of Object.entries(sheet??{})) {
  if(!/^[A-Z]+\d+$/.test(address))continue;
  const {r,c}=XLSX.utils.decode_cell(address);
  if(!rows.has(r))rows.set(r,new Map());
  rows.get(r)!.set(c,entry as XLSX.CellObject);
 }
 const ordered=[...rows].sort(([a],[b])=>a-b);
 const numericRows=ordered.filter(([,cells])=>[...cells.values()].some(cell=>typeof sheetFigure(cell)==='number'));
 if(!numericRows.length)throw new Error(noNumericColumn);
 const isText=(cell?:XLSX.CellObject)=>cell?.t!=='e' && typeof cell?.v==='string' && cell.v.trim()!=='' && typeof sheetFigure(cell)!=='number' && !isSerialMarker(cell);
 const textCounts=new Map<number,number>();
 for(const [,cells] of numericRows)for(const [c,cell] of cells)if(isText(cell))textCounts.set(c,(textCounts.get(c)??0)+1);
 const textColumns=[...textCounts.keys()].sort((a,b)=>textCounts.get(b)!-textCounts.get(a)! || a-b);
 const nameColumn=textColumns[0] ?? 0;
 const namedRows=numericRows.filter(([,cells])=>isText(cells.get(nameColumn))&&!isTotalRow(String(cells.get(nameColumn)!.v)));
 const candidates=namedRows.length?namedRows:numericRows;
 const numericCounts=new Map<number,number>();
 for(const [,cells] of candidates)for(const [c,cell] of cells)if(typeof sheetFigure(cell)==='number')numericCounts.set(c,(numericCounts.get(c)??0)+1);
 const columns=[...numericCounts.keys()].sort((a,b)=>a-b);
 const majority=columns.filter(c=>numericCounts.get(c)!>candidates.length/2);
 // With sparse data but readable numbers, let the planner choose rather than rejecting the sheet.
 const numericColumns=columns;
 const defaultColumns=majority.length?majority:columns;
 const costColumn=selected!==undefined&&numericColumns.includes(selected)?selected:defaultColumns.at(-1)!;
 const firstHeadRow=ordered.find(([,cells])=>isText(cells.get(nameColumn))&&!isTotalRow(String(cells.get(nameColumn)!.v))&&[...cells].some(([c,cell])=>c<nameColumn&&isSerialMarker(cell)))?.[0];
 return {nameColumn,costColumn,numericColumns,firstDataRow:Math.min(candidates[0][0],firstHeadRow??candidates[0][0]),rows:ordered};
}
// Optional quantity/rate labels preserve the existing meal basis. They are never
// required to read names or costs, and never supply a guessed rate or quantity.
export function quantityRateColumns(sheet:XLSX.WorkSheet,firstDataRow:number) {
 const normalize=(v:unknown)=>String(v??'').toLowerCase().replace(/[^a-z]/g,'');
 let quantity=-1,rate=-1;
 for(const [address,entry] of Object.entries(sheet??{})){
  if(!/^[A-Z]+\d+$/.test(address))continue;
  const {r,c}=XLSX.utils.decode_cell(address);if(r>=firstDataRow)continue;
  const label=normalize((entry as XLSX.CellObject).v);
  if(['qty','quantity'].includes(label))quantity=c;
  if(['rate','unitrate','unitcost'].includes(label))rate=c;
 }
 return {quantity,rate};
}

export const sheetColumnName=(column:number)=>XLSX.utils.encode_col(column);
