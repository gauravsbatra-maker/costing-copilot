import { test, expect } from '@playwright/test';
import { inventedBrief } from './fixtures/brief';
test('read a made-up WhatsApp brief through Convex and OpenAI, flag missing fields and edit in memory', async ({ page }) => {
  test.setTimeout(75000);
  await page.goto('/');
  await page.getByLabel('Paste the brief').fill(inventedBrief);
  await page.getByRole('button', { name: 'Read the brief', exact: true }).click();
  const errors = page.getByRole('alert').filter({ hasNot: page.getByRole('heading', { name: 'Headcounts differ' }) });
  await expect(page.getByRole('heading', { name: 'Review the requirements' }).or(errors).first()).toBeVisible({ timeout: 65000 });
  expect(await errors.allTextContents(), 'The real AI request must succeed').toEqual([]);
  await expect(page.getByRole('heading', { name: 'Review the requirements' })).toBeVisible();
  await expect(page.getByLabel('City', { exact: true })).toHaveValue('Jaipur');
  await expect(page.getByLabel('Number of days', { exact: true })).toHaveValue('2');
  await expect(page.getByLabel('Rooms', { exact: true })).toHaveValue('40');
  await expect(page.getByLabel('Function 1 guest count', { exact: true })).toHaveValue('150');
  await expect(page.getByLabel('Function 2 guest count', { exact: true })).toHaveValue('250');
  await expect(page.getByLabel('Seasonal premium', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('Seasonal premium', { exact: true })).toHaveAttribute('placeholder', 'Missing');
  await expect(page.getByRole('heading', { name: 'Headcounts differ' })).toBeVisible();
  await expect(page.getByLabel('Headcount driving Food')).toHaveValue('');
  await page.getByLabel('Headcount driving Food').fill('Welcome dinner: 150');
  await page.getByLabel('Rooms', { exact: true }).fill('45');
  await expect(page.getByLabel('Rooms', { exact: true })).toHaveValue('45');
  await page.getByLabel('Seasonal premium', { exact: true }).fill('No premium confirmed by project head');
  await expect(page.getByLabel('Seasonal premium', { exact: true })).toHaveValue('No premium confirmed by project head');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: '/tmp/brief-reader-mobile.png', fullPage: true });
  await page.reload();
  await expect(page.getByLabel('Paste the brief')).toHaveValue('');
  await expect(page.getByRole('heading', { name: 'Review the requirements' })).toHaveCount(0);
});
test('real AI keeps the event city amber when Mumbai describes guests and the benchmark', async ({ page }) => {
  test.setTimeout(75000);
  const { hometownBrief } = await import('./fixtures/brief');
  await page.goto('/');
  await page.getByLabel('Paste the brief').fill(hometownBrief);
  await page.getByRole('button', { name: 'Read the brief', exact: true }).click();
  const errors = page.getByRole('alert').filter({ hasNot: page.getByRole('heading', { name: 'Headcounts differ' }) });
  await expect(page.getByRole('heading', { name: 'Review the requirements' }).or(errors).first()).toBeVisible({ timeout: 65000 });
  expect(await errors.allTextContents(), 'The real AI request must succeed').toEqual([]);
  await expect(page.getByLabel('City', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('City', { exact: true })).toHaveAttribute('placeholder', "Unclear: brief says client's hometown");
  await expect(page.getByText("Unclear: brief says client's hometown", { exact: true })).toBeVisible();
  for (const label of ['Dates', 'Number of days', 'Out-of-town guests', 'Rooms', 'Nights', 'Room rate', 'Seasonal premium', 'GST treatment', 'Variance']) {
    const value = await page.getByLabel(label, { exact: true }).inputValue();
    if (value) expect(hometownBrief.includes(value), `${label} must quote the brief word for word`).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByLabel('City', { exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: '/tmp/hometown-city-mobile.png' });
});
test('real AI fills the detailed two-day brief with eight functions and four scaling rules, keeping City amber', async ({ page }) => {
  test.setTimeout(75000);
  const { detailedBrief, detailedExtraction } = await import('./fixtures/brief');
  const expected = detailedExtraction();
  await page.goto('/');
  await page.getByLabel('Paste the brief').fill(detailedBrief);
  await page.getByRole('button', { name: 'Read the brief', exact: true }).click();
  const errors = page.getByRole('alert').filter({ hasNot: page.getByRole('heading', { name: 'Headcounts differ' }) });
  await expect(page.getByRole('heading', { name: 'Review the requirements' }).or(errors).first()).toBeVisible({ timeout: 65000 });
  expect(await errors.allTextContents(), 'The real AI request must succeed').toEqual([]);
  await expect(page.getByLabel('City', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('City', { exact: true })).toHaveAttribute('placeholder', "Unclear: brief says client's hometown");
  await expect(page.getByLabel('Dates', { exact: true })).toHaveValue('Last week of Dec 2026');
  await expect(page.getByLabel('Number of days', { exact: true })).toHaveValue(/^2(?: days)?$/);
  await expect(page.getByLabel('Out-of-town guests', { exact: true })).toHaveValue(/^75(?: guests)?$/);
  await expect(page.getByLabel('Rooms', { exact: true })).toHaveValue(/^40(?: rooms)?$/);
  await expect(page.getByLabel('Nights', { exact: true })).toHaveValue(/^2(?: nights)?$/);
  await expect(page.getByLabel('Room rate', { exact: true })).toHaveValue('₹35,000/room night');
  await expect(page.getByLabel('Benchmark project', { exact: true })).toHaveValue(/Aug 2026 Mumbai wedding/);
  await expect(page.getByLabel('Benchmark headcount', { exact: true })).toHaveValue(/^~700(?: pax)?$/);
  await expect(page.getByLabel('Seasonal premium', { exact: true })).toHaveValue('+10%');
  await expect(page.getByLabel('GST treatment', { exact: true })).toHaveValue('GST extra');
  await expect(page.getByLabel('Variance', { exact: true })).toHaveValue('±10%');
  await expect(page.getByRole('textbox', { name: /^Function \d+ name$/ })).toHaveCount(8);
  for (let i = 0; i < 8; i++) {
    const row = expected.functions[i];
    await expect(page.getByLabel(`Function ${i + 1} day / date`, { exact: true })).toHaveValue(row.day);
    await expect(page.getByLabel(`Function ${i + 1} name`, { exact: true })).toHaveValue(row.name);
    await expect(page.getByLabel(`Function ${i + 1} guest count`, { exact: true })).toHaveValue(new RegExp(`^${row.guests}(?: pax)?$`));
  }
  await expect(page.getByRole('textbox', { name: /^Cost head \d+$/ })).toHaveCount(4);
  for (let i = 0; i < 4; i++) {
    await expect(page.getByLabel(`Cost head ${i + 1}`, { exact: true })).toHaveValue(expected.scalingRules[i].head);
    const rule = expected.scalingRules[i].rule.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    await expect(page.getByLabel(`Scaling rule ${i + 1}`, { exact: true })).toHaveValue(new RegExp(`^${rule}\\.?$`));
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByLabel('City', { exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: '/tmp/detailed-brief-mobile.png' });
});


test('event city auto-fills from a named event city and planner input wins before and after reading', async ({ page }) => {
 const { inventedExtraction } = await import('./fixtures/brief');
 const { validateRequirements } = await import('../shared/brief');
 const r=validateRequirements(inventedExtraction(),inventedBrief);
 await page.route('**/api/action',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'success',value:r})}));
 await page.goto('/');await page.getByLabel('Paste the brief').fill(inventedBrief);
 await page.getByRole('button',{name:'Read the brief',exact:true}).click();
 await expect(page.getByLabel('Event city',{exact:true})).toHaveValue('Jaipur');
 await expect(page.getByLabel('City',{exact:true})).toHaveValue('Jaipur');
 await page.getByLabel('Event city',{exact:true}).fill('Mumbai');
 await expect(page.getByLabel('City',{exact:true})).toHaveValue('Mumbai');
 await page.getByRole('button',{name:'Read the brief',exact:true}).click();
 await expect(page.getByLabel('City',{exact:true})).toHaveValue('Mumbai');
 await page.getByLabel('Event city',{exact:true}).fill('');
 await expect(page.getByLabel('City',{exact:true})).toHaveValue('');
 await page.getByRole('button',{name:'Read the brief',exact:true}).click();
 await expect(page.getByLabel('City',{exact:true})).toHaveValue('');
 await page.getByLabel('City',{exact:true}).fill('Pune');
 await expect(page.getByLabel('Event city',{exact:true})).toHaveValue('Pune');
});
