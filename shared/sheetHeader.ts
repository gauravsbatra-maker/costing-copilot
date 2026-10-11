import * as XLSX from 'xlsx';
const normalize=(value:unknown)=>String(value??'').toLowerCase().replace(/0/g,'o').replace(/[^a-z0-9]/g,'');
const serials=new Set(['srno','sno','serialno','serialnumber']);
const names=new Set(['description','costhead','costheads','expensehead','expenseheads','particulars']);
const costs=new Set(['cost','amount','total','costwogst','wogst','pregst','pregsttotal','totalpregst','costpregst','actualpregsttotal','actualpregstcost']);
const labels=new Set([...serials,...names,...costs,'qty','quantity','days','rate','unitrate','unitcost']);
export const sheetHeaderError="Could not read the header. Please check the sheet's column labels and try again.";
// Only A:G participate in detection. Extra breakdowns and tax columns are ignored.
export function detectSheetHeader(sheet:XLSX.WorkSheet):{lastRow:number;quantity:number;rate:number} {
 const range=XLSX.utils.decode_range(sheet['!ref']??'A1');
 const row=(r:number)=>Array.from({length:7},(_,c)=>normalize(sheet[XLSX.utils.encode_cell({r,c})]?.v));
 for(let r=range.s.r;r<=range.e.r;r++){
  const top=row(r),below=r<range.e.r?row(r+1):Array(7).fill('');
  const both=top.map((value,c)=>[value,below[c]]);
  if(!both[0].some(value=>serials.has(value)) || !both[1].some(Boolean))continue;
  if(![top[6],below[6],top[6]+below[6]].some(value=>costs.has(value)))continue;
  const nextSerial=sheet[XLSX.utils.encode_cell({r:r+1,c:0})]?.v;
  const nextIsData=/^\d+$/.test(String(nextSerial??''));
  const twoRows=!nextIsData && below.some(value=>labels.has(value));
  const find=(wanted:string[])=>top.findIndex((value,c)=>wanted.includes(value)||(twoRows && wanted.includes(below[c])));
  return {lastRow:r+(twoRows?1:0),quantity:find(['qty','quantity']),rate:find(['rate','unitrate','unitcost'])};
 }
 throw new Error(sheetHeaderError);
}
