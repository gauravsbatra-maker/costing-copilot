import * as XLSX from 'xlsx';
import {readVisibleWorksheet} from './visibleWorksheets.ts';
export {visibleSheetNames,readVisibleWorksheet} from './visibleWorksheets.ts';
import {detectSheetColumns,isTotalRow,sheetFigure,isSerialMarker} from './sheetColumns.ts';

export type Figure = number | 'could not read';
// Empty legacy fields keep old saved copies compatible. They are not used for pricing.
export type CostRow = { row: number; name: string; cost: Figure; nw: Figure; w: Figure };
export type CostHead = CostRow & { items: CostRow[] };
export type Budget = { sheet: string; heads: CostHead[]; total: CostRow; unread: CostRow[]; reading?: {nameColumn:number;costColumn:number;numericColumns:number[];firstDataRow:number;lineCount:number;total:number} };

export function readCosting(data: ArrayBuffer | Uint8Array, selected?: string, costColumn?:number): Budget {
 const {sheet,sheetName}=readVisibleWorksheet(data,selected);
 return readCostingWorksheet(sheet,sheetName,costColumn);
}
export function readCostingWorksheet(sheet:XLSX.WorkSheet,sheetName:string,selectedColumn?:number):Budget {
 const {nameColumn,costColumn,numericColumns,firstDataRow,rows}=detectSheetColumns(sheet,selectedColumn);
 const heads:CostHead[]=[];
 let current:CostHead|undefined;
 const hasNumberedHeads=rows.some(([r,cells])=>r>=firstDataRow && [...cells].some(([c,cell])=>c<nameColumn && isSerialMarker(cell)) && typeof cells.get(nameColumn)?.v==='string');
 for(const [r,cells] of rows){
  if(r<firstDataRow)continue;
  const raw=cells.get(nameColumn);
  if(raw?.t==='e' || typeof raw?.v!=='string' || !raw.v.trim() || typeof sheetFigure(raw)==='number' || isSerialMarker(raw))continue;
  const name=raw.v.trim();if(isTotalRow(name))continue;
  const numbered=[...cells].some(([c,cell])=>c<nameColumn && isSerialMarker(cell));
  const amountCell=cells.get(costColumn);
  if(!numbered && ![...cells.values()].some(cell=>typeof sheetFigure(cell)==='number') && !amountCell?.f && amountCell?.v===undefined)continue;
  const row:CostRow={row:r+1,name,cost:sheetFigure(cells.get(costColumn)),nw:'could not read',w:'could not read'};
  if(!hasNumberedHeads || numbered){current={...row,items:[]};heads.push(current);}
  else if(current)current.items.push(row);
  else {current={...row,items:[]};heads.push(current);}
 }
 // Parent cost heads are retained for the existing costing rules, but their
 // summary amounts are not counted twice in the readback confirmation.
 const lines=heads.flatMap(head=>head.items.length?head.items:[head]);
 const sum=lines.reduce((total,line)=>total+(typeof line.cost==='number'?line.cost:0),0);
 const total=Math.round((sum+Number.EPSILON)*100)/100;
 return {sheet:sheetName,heads,unread:[],total:{row:0,name:'Total',cost:total,nw:'could not read',w:'could not read'},reading:{nameColumn,costColumn,numericColumns,firstDataRow,lineCount:lines.length,total}};
}
