import { test } from 'node:test';
import assert from 'node:assert/strict';
import { budgetTotals } from '../shared/planning.ts';

test('quantities use entered prices; spending and remaining budget use actual costs', () => {
  assert.deepEqual(budgetTotals([{quantity: 3, unitPriceCents: 12550, actualCents: 40000}, {quantity: 2, unitPriceCents: 5000}, {quantity: 12}], 100000), {estimated: 47650, actual: 40000, remaining: 60000, unpriced: 1});
});
test('zero is a known price and overspending produces a negative remaining budget', () => {
  assert.deepEqual(budgetTotals([{quantity: 1, unitPriceCents: 0, actualCents: 200}], 100), {estimated: 0, actual: 200, remaining: -100, unpriced: 0});
});
