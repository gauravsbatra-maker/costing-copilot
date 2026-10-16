import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import {readCosting} from '../shared/costing.ts';
import {isSerialMarker} from '../shared/sheetColumns.ts';
const upload=(rows:unknown[][],merges:string[]=[])=>{
 const book=XLSX.utils.book_new(),sheet=XLSX.utils.aoa_to_sheet(rows);
 sheet['!merges']=merges.map(XLSX.utils.decode_range);
 XLSX.utils.book_append_sheet(book,sheet,'Final');
 return XLSX.write(book,{type:'buffer',bookType:'xlsx'});
};
test('letter markers in A group the real B names and items without changing the cost column',()=>{
 const result=readCosting(upload([
  ['Serial','Expense','Pre-GST'],['A','Venue',3000],['','Hall rental',1000],['','Furniture',2000],
  ['B.','Decor',500],['','Flowers',500],['c)','Production',750],['','Sound',750],['','Total',4250]
 ]));
 assert.equal(result.reading?.nameColumn,1);assert.equal(result.reading?.costColumn,2);
 assert.deepEqual(result.heads.map(head=>[head.name,head.row,head.cost,head.items.map(item=>[item.name,item.row,item.cost])]),[
  ['Venue',2,3000,[['Hall rental',3,1000],['Furniture',4,2000]]],
  ['Decor',5,500,[['Flowers',6,500]]],['Production',7,750,[['Sound',8,750]]]
 ]);
 assert.equal(result.reading?.lineCount,4);assert.equal(result.total.cost,4250);
});
test('serial markers include letters, Roman numerals i–xx and existing positive integers only',()=>{
 for(const v of ['A','z.','b)','i','iv.','VIII)','xix','XX)',1,'02'])assert(isSerialMarker({t:typeof v==='number'?'n':'s',v}),String(v));
 for(const v of ['XXI','Venue','AV','A. Venue','i) note',0,-1,1.5])assert(!isSerialMarker({t:typeof v==='number'?'n':'s',v}),String(v));
});
test('most real text selects names over a shorter text column and blank Roman-marked heads retain items',()=>{
 const result=readCosting(upload([
  ['i','Venue'],['Note north','Hall rental',1500],['','Furniture',500],
  ['ii)','Decor'],['Note south','Flowers',2000]
 ]));
 assert.equal(result.reading?.nameColumn,1);assert.equal(result.reading?.costColumn,2);
 assert.deepEqual(result.heads.map(head=>[head.name,head.items.map(item=>item.name)]),[['Venue',['Hall rental','Furniture']],['Decor',['Flowers']]]);
 assert.equal(result.total.cost,4000);
});
test('no header: leftmost mostly-text names and rightmost mostly-numeric costs, skipping totals and blanks',()=>{
 const result=readCosting(upload([['Venue',2,1000],[],['Decor',3,2000],['Subtotal',5,3000],['Transport',1,500],['Grand total',6,3500]]));
 assert.deepEqual(result.heads.map(h=>[h.name,h.cost,h.row]),[['Venue',1000,1],['Decor',2000,3],['Transport',500,5]]);
 assert.equal(result.reading?.costColumn,2);assert.equal(result.reading?.nameColumn,0);
 assert.equal(result.reading?.lineCount,3);assert.equal(result.total.cost,3500);
});
test('merged two-row headers do not determine cost-column detection and item totals are not counted twice',()=>{
 const result=readCosting(upload([
 ['Agency estimate','','',''],['','Descriptions','Work',''],['','','Qty','Amount'],
 [1,'Venue',null,1000],['','Hall rental',2,1000],['','Subtotal',null,1000],
 [2,'Decor',null,2000],['','Flowers',4,2000],['','TOTAL',null,3000]
 ],['A1:D1','B2:B3','C2:D2']));
 assert.deepEqual(result.heads.map(h=>[h.name,h.cost,h.items.map(i=>i.name)]),[['Venue',1000,['Hall rental']],['Decor',2000,['Flowers']]]);
 assert.equal(result.reading?.lineCount,2);assert.equal(result.reading?.costColumn,3);assert.equal(result.total.cost,3000);
});
test('final numeric column can be J and a sparse later numeric column is ignored; picker can use G',()=>{
 const data=upload([['Venue',null,null,null,null,null,100,null,null,150,99999],['Decor',null,null,null,null,null,200,null,null,250],['Transport',null,null,null,null,null,300,null,null,350]]);
 const result=readCosting(data);
 assert.equal(result.reading?.costColumn,9);assert.equal(result.total.cost,750);
 assert.deepEqual(result.reading?.numericColumns,[6,9,10]);
 const changed=readCosting(data,undefined,6);
 assert.equal(changed.reading?.costColumn,6);assert.equal(changed.total.cost,600);
 assert.deepEqual(changed.heads.map(h=>h.row),result.heads.map(h=>h.row));
});
test('the only content-detection error is no numeric column; numeric cells need no named header',()=>{
 assert.throws(()=>readCosting(upload([['Name','Cost'],['Venue','Not supplied']])),{message:'No numeric column found.'});
 assert.doesNotThrow(()=>readCosting(upload([['Venue',123]])));
});
