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
  ]),'Final costing');
  book.Workbook={Sheets:[{name:'Hidden',Hidden:1},{name:'Final costing',Hidden:0}]};
  let posts=0; page.on('request',r=>{if(r.method()==='POST')posts++;});
  await page.goto('/');
  await page.getByLabel('Excel costing sheet').setInputFiles({name:'test-costing.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:XLSX.write(book,{type:'buffer',bookType:'xlsx'})});
  await expect(page.getByRole('heading',{name:'Final costing'})).toBeVisible();
  await expect(page.getByRole('combobox',{name:'Costing tab'})).toHaveCount(0);
  await expect(page.getByRole('table')).toHaveCount(1);
  await expect(page.getByRole('row').filter({hasText:'Venue'})).toContainText('1,00,000');
  await expect(page.getByText('Hall rental')).toHaveCount(0);
  await page.getByRole('button',{name:/Venue/}).click();
  await expect(page.getByText('Hall rental')).toBeVisible();
  await expect(page.getByRole('row').filter({hasText:'Unreadable item'})).toContainText('could not read');
  await expect(page.getByText('hidden sentinel')).toHaveCount(0);
  await expect(page.getByRole('columnheader',{name:'GST',exact:true})).toHaveCount(0);
  await expect(page.getByText('1,18,000',{exact:true})).toHaveCount(0);
  await expect(page.getByRole('columnheader')).toHaveCount(2);
  await expect(page.getByText('60,000',{exact:true})).toHaveCount(0);
  await expect(page.getByText(/headers.*row [12]|row [12].*headers/i)).toHaveCount(0);
  expect(posts).toBe(0);
  await page.setViewportSize({width:390,height:844});
  await expect(page.getByRole('button',{name:/Venue/})).toBeVisible();
  await page.screenshot({path:'/tmp/costing-reader.png',fullPage:true});
  await page.getByLabel('Excel costing sheet').setInputFiles({name:'broken.xlsx',mimeType:'application/octet-stream',buffer:Buffer.from('broken')});
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('table')).toHaveCount(0);
});


test('detects a two-row header using only A:G and gives a plain error when no header exists', async ({page})=>{
  const upload=async(rows:unknown[][])=>{
    const book=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet(rows),'Overall WIP');
    await page.getByLabel('Excel costing sheet').setInputFiles({name:'test-costing.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:XLSX.write(book,{type:'buffer',bookType:'xlsx'})});
  };
  await page.goto('/');
  await upload([
    ['Example costing'],
    ['Sr No','Cost head','','','','','Cost'],
    ['','','Qty','Days','Total','Rate','W/O GST'],
    [1,'Venue','','','','',1000],
    ['','Hall rental',2,1,2,500,1000],
    ['','Total','','','','',1000]
  ]);
  await expect(page.getByRole('row').filter({hasText:'Venue'})).toContainText('1,000');
  await page.getByRole('button',{name:/Venue/}).click();
  await expect(page.getByText('Hall rental')).toBeVisible();
  await expect(page.getByRole('columnheader')).toHaveCount(2);
  await expect(page.getByRole('alert')).toHaveCount(0);
  await upload([['Unknown sheet'],[1,'Venue',1000]]);
  await expect(page.getByRole('alert')).toHaveText("Could not read the header. Please check the sheet's column labels and try again.");
  await expect(page.getByRole('table')).toHaveCount(0);
  await expect(page.getByRole('combobox')).toHaveCount(0);
});


test('choose among visible tabs only and use the chosen tab without reading hidden costing tabs',async({page})=>{
  const book=XLSX.utils.book_new();
  const rows=(name:string,amount:number)=>[['Sr No','Description','Qty','Days','Total','Rate','Cost'],[1,name,null,null,null,null,amount,999999],[null,'Total',null,null,null,null,amount,999999]];
  XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet([['Unreadable hidden header']]),'Overall WIP');
  XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet(rows('Venue',1000)),'Budget draft');
  XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet([['Private data']]),'Private');
  XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet(rows('Decor',2000)),'Final costing');
  book.Workbook={Sheets:[{name:'Overall WIP',Hidden:1},{name:'Budget draft',Hidden:0},{name:'Private',Hidden:2},{name:'Final costing',Hidden:0}]};
  await page.goto('/');
  await expect(page.getByText("Before uploading: keep only your final costing tab visible and hide all other tabs, for your privacy. Make sure the last column of numbers is your pre-GST total. We read only the visible tab and use its last number column, hidden tabs are never opened.",{exact:true})).toBeVisible();
  await page.getByLabel('Excel costing sheet').setInputFiles({name:'visible-tabs.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:XLSX.write(book,{type:'buffer',bookType:'xlsx'})});
  const picker=page.getByRole('combobox',{name:'Costing tab',exact:true});
  await expect(picker).toBeVisible();
  await expect(picker.locator('option')).toHaveText(['Choose a costing tab','Budget draft','Final costing']);
  await expect(page.getByRole('table')).toHaveCount(0);
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByText("Before uploading: keep only your final costing tab visible and hide all other tabs, for your privacy. Make sure the last column of numbers is your pre-GST total. We read only the visible tab and use its last number column, hidden tabs are never opened.",{exact:true})).toBeVisible();
  await picker.selectOption('Final costing');
  await expect(page.getByRole('heading',{name:'Final costing',exact:true})).toBeVisible();
  await expect(page.getByRole('row').filter({hasText:'Decor'})).toContainText('2,000');
  await expect(page.getByText('9,99,999',{exact:true})).toHaveCount(0);
  await picker.selectOption('Budget draft');
  await expect(page.getByRole('heading',{name:'Budget draft',exact:true})).toBeVisible();
  await expect(page.getByRole('row').filter({hasText:'Venue'})).toContainText('1,000');
  await expect(page.getByRole('button',{name:/Decor/})).toHaveCount(0);
  await picker.selectOption('');
  await expect(page.getByRole('table')).toHaveCount(0);
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
