import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import { readCosting, visibleSheetNames } from '../shared/costing.ts';
export function fixture(format: XLSX.BookType = 'xlsx') {
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([['Ignore hidden']]), 'Hidden first');
  const sheet = XLSX.utils.aoa_to_sheet([
    ['Budget estimate'],
    ['Sr No', 'Description', 'Qty', 'Days', 'Total', 'Rate', 'Cost (W/O GST)', 'NW', 'W', 'GST', 'Total (with GST)'],
    [1, 'Venue', '', '', '', '', 100000, 60000, 40000, 18000, 118000],
    ['', 'Hall rental', 1, 1, 1, 80000, 80000, 50000, 30000, 14400, 94400],
    ['', 'Missing figure', 1, 1, 1, '', '', 10000, 10000],
    [2, 'Production', '', '', '', '', 50000, 20000, 30000],
    ['', 'Sound', 1, 1, 1, 50000, 50000, 20000, 30000],
    ['', 'Total', '', '', '', '', 150000, 80000, 70000, 27000, 177000],
  ]);
  XLSX.utils.book_append_sheet(book, sheet, 'Overall WIP');
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([['Ignore later']]), 'Later visible');
  book.Workbook = { Sheets: [{ name:'Hidden first', Hidden:1 }, { name:'Overall WIP', Hidden:0 }, { name:'Later visible', Hidden:1 }] };
  return { book, sheet, buffer: XLSX.write(book, { type:'buffer', bookType:format }) as Uint8Array };
}
test('reads the only visible budget, groups line items and preserves pre-GST totals', () => {
  for (const format of ['xlsx', 'xls', 'xlsb'] as const) {
    const result = readCosting(fixture(format).buffer,undefined,6);
    assert.equal(result.sheet, 'Overall WIP');
    assert.deepEqual(result.heads.map(h => [h.name,h.cost,h.nw,h.w,h.items.length]), [['Venue',100000,'could not read','could not read',2],['Production',50000,'could not read','could not read',1]]);
    assert.equal(result.heads[0].items[1].cost, 'could not read');
    assert.equal(result.total.cost,130000);
    assert.equal(result.total.nw,'could not read');
    assert.equal(result.total.w,'could not read');
  }
});
test('flags missing formula caches, errors and missing total instead of calculating', () => {
  const {book,sheet} = fixture();
  sheet.G4={t:'n',f:'1+2'};
  sheet.H4={t:'e',v:7};
  delete sheet.B8;
  const result=readCosting(XLSX.write(book,{type:'buffer',bookType:'xlsx'}),undefined,6);
  assert.equal(result.heads[0].items[0].cost,'could not read');
  assert.equal(result.heads[0].items[0].nw,'could not read');
  assert.equal(result.total.cost,50000); // Missing item cache is excluded; no sheet total is used.
});
test('rejects hidden-only workbooks but never requires a named header', () => {
  const {book,sheet}=fixture();
  book.Workbook!.Sheets!.forEach(s=>s.Hidden=2);
  assert.throws(()=>readCosting(XLSX.write(book,{type:'buffer',bookType:'xlsx'}),undefined,6), /No visible tab/);
  book.Workbook!.Sheets![1].Hidden=0; sheet.G2={t:'s',v:'GST'};
  assert.doesNotThrow(()=>readCosting(XLSX.write(book,{type:'buffer',bookType:'xlsx'}),undefined,6));
});
test('reads merged two-row headers with W/0 GST and starts data on row 3', () => {
  const { book, sheet } = fixture();
  sheet.A1 = { t: 's', v: ' sR nO ' };
  sheet.B1 = { t: 's', v: 'Description' };
  sheet.G1 = { t: 's', v: ' cOsT ' };
  for (const column of ['A', 'B', 'C', 'D', 'E', 'F', 'J', 'K']) delete sheet[column + '2'];
  sheet.G2 = { t: 's', v: ' W/0 gSt ' };
  sheet.H2 = { t: 's', v: ' nW ' };
  sheet.I2 = { t: 's', v: ' w ' };
  sheet['!merges'] = [XLSX.utils.decode_range('A1:A2'), XLSX.utils.decode_range('B1:B2')];
  const result = readCosting(XLSX.write(book, { type: 'buffer', bookType: 'xlsx' }),undefined,6);
  assert.equal(result.sheet, 'Overall WIP');
  assert.equal(result.heads[0].row, 3);
  assert.deepEqual(result.heads.map(h => [h.name, h.cost, h.nw, h.w, h.items.length]), [['Venue', 100000, 'could not read', 'could not read', 2], ['Production', 50000, 'could not read', 'could not read', 1]]);
  assert.equal(result.unread.length, 0);
  assert.deepEqual([result.total.cost, result.total.nw, result.total.w], [130000, 'could not read', 'could not read']);
});

test('cost detection ignores header wording and a sparse later numeric column',()=>{
 const {book,sheet}=fixture();
 for(const key of Object.keys(sheet))if(/^[H-Z]+\d+$/.test(key))delete sheet[key];
 sheet.H2={t:'s',v:'Cost (W/O GST)'};sheet.H3={t:'n',v:99999999};
 const result=readCosting(XLSX.write(book,{type:'buffer',bookType:'xlsx'}),undefined,6);
 assert.equal(result.heads[0].cost,100000);assert.equal(result.heads[0].items[0].cost,80000);
 assert.equal(result.heads[0].nw,'could not read');assert.equal(result.heads[0].w,'could not read');
});
test('selecting G preserves its costs and line membership when later columns change',()=>{
 const {book,sheet}=fixture();
 const before=readCosting(XLSX.write(book,{type:'buffer',bookType:'xlsx'}),undefined,6);
 for(const key of Object.keys(sheet))if(/^[H-Z]+\d+$/.test(key))sheet[key]={t:'s',v:'ignored changed value'};
 const after=readCosting(XLSX.write(book,{type:'buffer',bookType:'xlsx'}),undefined,6);
 assert.deepEqual(after.heads,before.heads); assert.equal(after.total.cost,before.total.cost);
 const rows=[['Sr No','Cost head','Qty','Days','Total','Rate','Cost (W/O GST)'],[1,'Venue',null,null,null,null,1000],[null,null,null,null,null,null,null,88888],[null,'Rental',1,1,1,1000,1000],[null,'Total',null,null,null,null,1000]];
 const one=XLSX.utils.book_new();XLSX.utils.book_append_sheet(one,XLSX.utils.aoa_to_sheet(rows),'Overall WIP');
 assert.equal(readCosting(XLSX.write(one,{type:'buffer',bookType:'xlsx'})).heads[0].items.length,1);
});


test('detects a two-row costing header whose description column uses the project title',()=>{
  const book=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet([
    ['Sr No','Estimated Work In Progress Event Cost Sheet','Qty','Days','Total','Rate','Cost'],
    ['','','','Shift','','','W/0 GST'],
    [1,'Venue','','','','',1000],
    ['','Hall rental',2,1,2,500,1000],
    ['','Total','','','','',1000]
  ]),'Overall WIP');
  const result=readCosting(XLSX.write(book,{type:'array',bookType:'xlsx'}));
  assert.equal(result.heads[0].row,3);
  assert.equal(result.heads[0].cost,1000);
  assert.equal(result.heads[0].items[0].row,4);
});


for(const format of ['xlsx','xls','xlsb'] as const) test(`${format}: several visible tabs require an explicit choice and hidden tabs cannot be chosen`,()=>{
 const {book}=fixture();
 book.Workbook!.Sheets![2].Hidden=0;
 const data=XLSX.write(book,{type:'buffer',bookType:format});
 assert.deepEqual(visibleSheetNames(data),['Overall WIP','Later visible']);
 assert.throws(()=>readCosting(data),/Choose a costing tab/);
 assert.equal(readCosting(data,'Overall WIP',6).total.cost,130000);
 assert.throws(()=>readCosting(data,'Hidden first'),/Choose a visible costing tab/);
 assert.throws(()=>readCosting(data,'Missing tab'),/Choose a visible costing tab/);
});
for(const format of ['xlsx','xls','xlsb'] as const) test(`${format}: a single visible tab works with any name and both hidden states are excluded`,()=>{
 const book=XLSX.utils.book_new();
 const {sheet}=fixture();
 XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet([['Not costing data']]),'Overall WIP');
 XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet([['Not costing data']]),'Private');
 XLSX.utils.book_append_sheet(book,sheet,'Final costs');
 book.Workbook={Sheets:[{name:'Overall WIP',Hidden:1},{name:'Private',Hidden:2},{name:'Final costs',Hidden:0}]};
 const data=XLSX.write(book,{type:'buffer',bookType:format});
 assert.deepEqual(visibleSheetNames(data),['Final costs']);
 const result=readCosting(data,undefined,6);
 assert.equal(result.sheet,'Final costs');assert.equal(result.total.cost,130000);
});


test('legacy xls hidden worksheet records are never passed to the cell reader',()=>{
 const original=fixture('xls').buffer;
 const container=XLSX.CFB.read(original,{type:'buffer'});
 const stream=XLSX.CFB.find(container,'Workbook')!.content;
 const bytes=Uint8Array.from(stream), view=new DataView(bytes.buffer);
 for(let pos=0;pos+4<=bytes.length;){
  const type=view.getUint16(pos,true),size=view.getUint16(pos+2,true);
  if(type===0x85 && view.getUint8(pos+8)!==0){
   const offset=view.getUint32(pos+4,true);
   // Corrupt the hidden sheet's opening record; parsing it would stop the workbook reader.
   view.setUint16(offset,0x2f,true);
  }
  pos+=4+size;if(type===0x0a)break;
 }
 XLSX.CFB.find(container,'Workbook')!.content=bytes;
 const data=XLSX.CFB.write(container,{type:'buffer'});
 assert.deepEqual(visibleSheetNames(data),['Overall WIP']);
 assert.equal(readCosting(data,undefined,6).total.cost,130000);
});
