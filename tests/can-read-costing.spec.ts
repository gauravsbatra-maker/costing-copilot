import { test, expect } from '@playwright/test';
import * as XLSX from 'xlsx';
test('upload a workbook and expand pre-GST line items without sending the file', async ({ page }) => {
  const book=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet([['hidden sentinel']]),'Hidden');
  XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet([
    ['Sr No','Description','Qty','Days','Total','Rate','Cost (W/O GST)','NW','W','GST','Total (with GST)'],
    [1,'Venue','','','','',100000,60000,40000,18000,118000],
    ['','Hall rental','','','','',80000,50000,30000],
    ['','Unreadable item','','','','','unknown',10000,10000],
    ['','Total','','','','',100000,60000,40000,18000,118000]
  ]),'Overall WIP');
  book.Workbook={Sheets:[{name:'Hidden',Hidden:1},{name:'Overall WIP',Hidden:0}]};
  let posts=0; page.on('request',r=>{if(r.method()==='POST')posts++;});
  await page.goto('/');
  await page.getByLabel('Excel costing sheet').setInputFiles({name:'test-costing.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:XLSX.write(book,{type:'buffer',bookType:'xlsx'})});
  await expect(page.getByRole('heading',{name:'Overall WIP'})).toBeVisible();
  await expect(page.getByRole('table')).toHaveCount(1);
  await expect(page.getByRole('row').filter({hasText:'Venue'})).toContainText('1,00,000');
  await expect(page.getByText('Hall rental')).toHaveCount(0);
  await page.getByRole('button',{name:/Venue/}).click();
  await expect(page.getByText('Hall rental')).toBeVisible();
  await expect(page.getByRole('row').filter({hasText:'Unreadable item'})).toContainText('could not read');
  await expect(page.getByText('hidden sentinel')).toHaveCount(0);
  await expect(page.getByRole('columnheader',{name:'GST',exact:true})).toHaveCount(0);
  await expect(page.getByText('1,18,000',{exact:true})).toHaveCount(0);
  expect(posts).toBe(0);
  await page.setViewportSize({width:390,height:844});
  await expect(page.getByRole('button',{name:/Venue/})).toBeVisible();
  await page.screenshot({path:'/tmp/costing-reader.png',fullPage:true});
  await page.getByLabel('Excel costing sheet').setInputFiles({name:'broken.xlsx',mimeType:'application/octet-stream',buffer:Buffer.from('broken')});
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('table')).toHaveCount(0);
});
