import {test,expect} from '@playwright/test';
import * as XLSX from 'xlsx';
import {requirementsFromForm,layoutBriefText,emptyFormLayout} from '../shared/briefFormLayout';
const workbook=()=>{
 const heads=['Taj Hotel Expenses','Bar Tenders','Guests Transfer (Toyota Crysta)','Entertainment','Technicals','Decor','Licenses & Permissions','Graphic Design & Printables','Photo / Video','Other Costs'];
 const rows:unknown[][]=[['Sr No','Description','Qty','Days','Total','Rate','Cost'],[null,null,null,null,null,null,'W/0 GST','NW','W']];
 heads.forEach((name,i)=>{rows.push([i+1,name,null,null,null,null,1000,0,1000]);if(i===0)rows.push([null,'Oct 24 - Lunch',100,1,100,8,800,0,800],[null,'Oct 24 - Sangeet',100,1,100,2,200,0,200],[null,'Oct 25 - High Tea',100,1,100,5,500,0,500]);});
 rows.push([null,'Total',null,null,null,null,10000,0,10000]);
 const book=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet(rows),'Overall WIP');

 return XLSX.write(book,{type:'buffer',bookType:'xlsx'});
};
test('three-column form stays optional, preserves notes without pricing them, and matches equivalent paste',async({page})=>{
 const draft=emptyFormLayout();draft.eventType='Wedding';draft.city='Jaipur';draft.dates='2 days';draft.rooms=['30','40'];draft.transfers=['75'];draft.food[0].forEach((f,i)=>f.guests=['250','250','1000','150'][i]);draft.services[0].note='Quoted ₹99: keep the white flowers';
 const expected=requirementsFromForm(draft);let calls=0;
 await page.route('**/api/action',route=>{if(route.request().postDataJSON().path!=='brief:structure')return route.continue();calls++;return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'success',value:{...expected,fromBriefForm:undefined,serviceNotes:undefined}})});});
 await page.goto('/');await page.getByRole('tab',{name:'Fill brief form',exact:true}).click();
 const form=page.getByRole('tabpanel',{name:'Fill brief form',exact:true});
 for(const input of await form.locator('input,textarea').all())expect(await input.inputValue()).toBe('');
 expect(await form.locator('td:not(:nth-child(3)) input,th input').count()).toBe(0);
 await form.getByLabel('Event type',{exact:true}).fill('Wedding');await form.getByLabel('Event dates',{exact:true}).fill('2 days');await form.getByLabel('City',{exact:true}).fill('Jaipur');
 await form.getByLabel('Guest Rooms – Day 1',{exact:true}).fill('30');await form.locator('tbody[aria-label="Guest Rooms"]').getByRole('button',{name:'Add day',exact:true}).click();await form.getByLabel('Guest Rooms – Day 2',{exact:true}).fill('40');
 await form.getByLabel('Guest Transfers – Day 1',{exact:true}).fill('75');
 for(const f of draft.food[0])await form.getByLabel('Day 1 - '+f.name,{exact:true}).fill(f.guests);
 await form.getByLabel('Décor',{exact:true}).fill(draft.services[0].note);
 await form.locator('tbody[aria-label="Guest Transfers"]').getByRole('button',{name:'Add day',exact:true}).click();await expect(form.getByLabel('Guest Transfers – Day 2',{exact:true})).toHaveValue('');
 await form.getByRole('button',{name:'Add function',exact:true}).click();await form.getByLabel('Function name – Day 1, function 5',{exact:true}).fill('Welcome');await expect(form.getByLabel('Day 1 - Function 5',{exact:true})).toHaveValue('');
 await form.getByRole('button',{name:'Add service',exact:true}).click();await form.getByLabel('Service name 8',{exact:true}).fill('Welcome gifts');await expect(form.getByLabel('Service instructions 8',{exact:true})).toHaveValue('');
 const downloading=page.waitForEvent('download');await form.getByRole('button',{name:'Download blank brief form'}).click();const download=await downloading;expect(download.suggestedFilename()).toBe('blank-client-brief.html');const stream=await download.createReadStream();let blank='';for await(const part of stream!)blank+=part.toString();expect(blank).not.toContain('Jaipur');expect(blank).toContain('<th>Your details</th>');
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByLabel('Excel costing sheet').setInputFiles({name:'invented.xlsx',mimeType:'application/octet-stream',buffer:workbook()});
 await page.getByRole('button',{name:'Read the brief',exact:true}).click();
 const confirm=async()=>{await page.getByLabel('Room rate',{exact:true}).fill('₹40,000/room night');await page.getByLabel('Variance',{exact:true}).fill('10%');await page.getByLabel('Guests the past transfers covered',{exact:true}).fill('60');await page.getByRole('button',{name:'Confirm all',exact:true}).click();};
 await confirm();expect(calls).toBe(0);
 const proposal=page.getByRole('region',{name:'Costed proposal',exact:true});const total=await proposal.locator('.proposal-total').innerText();
 await expect(proposal.locator('.service-note')).toHaveText('Décor: '+draft.services[0].note);
 await expect(proposal).toContainText('70 room nights × ₹40,000');await expect(proposal).toContainText('Guest rooms · ₹25,20,000–₹30,80,000 · midpoint ₹28,00,000');
 await proposal.getByRole('button',{name:'Review proposal',exact:true}).click();await expect(page.getByRole('main',{name:'Proposal review'}).locator('.service-note')).toHaveText('Décor: '+draft.services[0].note);await page.getByRole('button',{name:'Back to edit',exact:true}).click();
 await page.getByRole('tab',{name:'Paste client brief',exact:true}).click();await page.getByLabel('Paste the brief').fill(layoutBriefText(draft));await page.getByRole('button',{name:'Read the brief',exact:true}).click();await confirm();expect(await proposal.locator('.proposal-total').innerText()).toBe(total);expect(calls).toBe(1);
});
test('mostly blank form costs without inventing rooms, transfer pax or function guests',async({page})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/');await page.getByRole('tab',{name:'Fill brief form',exact:true}).click();await page.getByRole('tabpanel',{name:'Fill brief form'}).getByLabel('Event type',{exact:true}).fill('Celebration');
 await page.getByLabel('Excel costing sheet').setInputFiles({name:'invented.xlsx',mimeType:'application/octet-stream',buffer:workbook()});await page.getByRole('button',{name:'Read the brief',exact:true}).click();await page.getByLabel('Variance',{exact:true}).fill('10%');await page.getByRole('button',{name:'Confirm all',exact:true}).click();
 const proposal=page.getByRole('region',{name:'Costed proposal',exact:true});await expect(proposal.locator('.proposal-total')).toContainText('Pre-GST total');await expect(page.getByRole('region',{name:'Costing review',exact:true})).toContainText('City not confirmed');await expect(proposal.locator('.service-note')).toHaveCount(0);await expect(proposal).not.toContainText('room nights ×');await expect(proposal.locator('.pricing-status')).toContainText('To quote: 2 lines not in this total');expect(errors).toEqual([]);
});
