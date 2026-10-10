import { test, expect } from '@playwright/test';
import { inventedBrief, inventedExtraction } from './fixtures/brief';
import { validateRequirements } from '../shared/brief';
import * as XLSX from 'xlsx';
test('review a simulated brief reply, correct amber fields and preserve the Excel readback', async ({ page }) => {
  const raw = inventedExtraction(); raw.fields.roomRate = 'Unclear: two room rates are listed';
  const value = validateRequirements(raw, inventedBrief);
  const sent: unknown[] = [];
  await page.route('**/api/action', async route => {
    const data = route.request().postDataJSON(); sent.push(data);
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'success', value }) });
  });
  await page.goto('/');
  const briefBox = page.getByLabel('Paste the brief');
  const workbook = page.getByLabel('Excel costing sheet');
  expect(await briefBox.evaluate(element => element.getBoundingClientRect().top)).toBeLessThan(await workbook.evaluate(element => element.getBoundingClientRect().top));
  await briefBox.fill(inventedBrief);
  await page.getByRole('button', { name: 'Read the brief', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Review the requirements' })).toBeVisible();
  expect(sent).toHaveLength(1);
  expect((sent[0] as { args: unknown[] }).args).toEqual([{ brief: inventedBrief }]);
  await expect(page.getByLabel('City', { exact: true })).toHaveValue('Jaipur');
  await expect(page.getByLabel('Seasonal premium', { exact: true })).toHaveAttribute('placeholder', 'Missing');
  await expect(page.getByLabel('Room rate', { exact: true })).toHaveAttribute('placeholder', 'Unclear: two room rates are listed');
  await expect(page.getByRole('heading', { name: 'Headcounts differ' })).toBeVisible();
  await expect(page.getByLabel('Headcount driving Food')).toHaveValue('');
  await page.getByLabel('Headcount driving Food').fill('Welcome dinner: 150');
  await page.getByLabel('Room count – Night 1', { exact: true }).fill('45');
  await expect(page.getByLabel('Room count – Night 1', { exact: true })).toHaveValue('45');
  await page.getByLabel('Seasonal premium', { exact: true }).fill('No premium');
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([
    ['Sr No', 'Description', '', '', '', '', 'Cost (W/O GST)', 'NW', 'W'],
    [1, 'Food', '', '', '', '', 1000, 600, 400], ['', 'Meal', '', '', '', '', 1000, 600, 400], ['', 'Total', '', '', '', '', 1000, 600, 400],
  ]), 'Overall WIP');
  await workbook.setInputFiles({ name: 'made-up.xlsx', mimeType: 'application/octet-stream', buffer: XLSX.write(book, { type: 'buffer', bookType: 'xlsx' }) });
  await page.getByRole('button', { name: /Food Row/ }).click();
  await expect(page.getByRole('row').filter({ hasText: 'Meal' })).toContainText('1,000');
  expect(sent).toHaveLength(1);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByLabel('Room count – Night 1', { exact: true })).toBeVisible();
  await page.getByRole('heading', { name: 'Review the requirements' }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: '/tmp/brief-reader-mobile.png' });
  await page.getByRole('heading', { name: 'Headcounts differ' }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: '/tmp/brief-headcounts-mobile.png' });
  await page.reload();
  await expect(page.getByLabel('Paste the brief')).toHaveValue('');
  await expect(page.getByRole('heading', { name: 'Review the requirements' })).toHaveCount(0);
});
test('show a quota error without fake requirements and allow a deliberate retry', async ({ page }) => {
  const message = 'OpenAI is unavailable because of an account quota or request limit. Check your OpenAI account and try later.';
  let calls = 0;
  await page.route('**/api/action', async route => {
    calls++;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'error', errorMessage: message, errorData: message }) });
  });
  await page.goto('/');
  await page.getByLabel('Paste the brief').fill(inventedBrief);
  await page.getByRole('button', { name: 'Read the brief', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText(message);
  await expect(page.getByRole('heading', { name: 'Review the requirements' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Read the brief', exact: true })).toBeEnabled();
  expect(calls).toBe(1);
});
