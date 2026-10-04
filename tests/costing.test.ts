import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import { readCosting } from '../shared/costing.ts';
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
  book.Workbook = { Sheets: [{ name:'Hidden first', Hidden:1 }, { name:'Overall WIP', Hidden:0 }, { name:'Later visible', Hidden:0 }] };
  return { book, sheet, buffer: XLSX.write(book, { type:'buffer', bookType:format }) as Uint8Array };
}
test('reads first visible budget, groups line items and preserves pre-GST totals', () => {
  for (const format of ['xlsx', 'xls', 'xlsb'] as const) {
    const result = readCosting(fixture(format).buffer);
    assert.equal(result.sheet, 'Overall WIP');
    assert.deepEqual(result.heads.map(h => [h.name,h.cost,h.nw,h.w,h.items.length]), [['Venue',100000,60000,40000,2],['Production',50000,20000,30000,1]]);
    assert.equal(result.heads[0].items[1].cost, 'could not read');
    assert.equal(result.total.cost,150000);
    assert.equal(result.total.nw,80000);
    assert.equal(result.total.w,70000);
  }
});
test('flags missing formula caches, errors and missing total instead of calculating', () => {
  const {book,sheet} = fixture();
  sheet.G4={t:'n',f:'1+2'};
  sheet.H4={t:'e',v:7};
  delete sheet.B8;
  const result=readCosting(XLSX.write(book,{type:'buffer',bookType:'xlsx'}));
  assert.equal(result.heads[0].items[0].cost,'could not read');
  assert.equal(result.heads[0].items[0].nw,'could not read');
  assert.equal(result.total.cost,'could not read');
});
test('rejects hidden-only workbooks and malformed headers', () => {
  const {book,sheet}=fixture();
  book.Workbook!.Sheets!.forEach(s=>s.Hidden=2);
  assert.throws(()=>readCosting(XLSX.write(book,{type:'buffer',bookType:'xlsx'})), /No visible tab/);
  book.Workbook!.Sheets![1].Hidden=0; sheet.G2={t:'s',v:'GST'};
  assert.throws(()=>readCosting(XLSX.write(book,{type:'buffer',bookType:'xlsx'})), /Could not read the header/);
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
  const result = readCosting(XLSX.write(book, { type: 'buffer', bookType: 'xlsx' }));
  assert.equal(result.sheet, 'Overall WIP');
  assert.equal(result.heads[0].row, 3);
  assert.deepEqual(result.heads.map(h => [h.name, h.cost, h.nw, h.w, h.items.length]), [['Venue', 100000, 60000, 40000, 2], ['Production', 50000, 20000, 30000, 1]]);
  assert.equal(result.unread.length, 0);
  assert.deepEqual([result.total.cost, result.total.nw, result.total.w], [150000, 80000, 70000]);
});
