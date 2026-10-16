import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateNumber, isValidDate, safeUrl } from '../js/validation.js';
test('numbers enforce minimum, maximum and decimal step', () => {
  assert.equal(validateNumber('-1', {min:0}), false);
  assert.equal(validateNumber('101', {max:100}), false);
  assert.equal(validateNumber('1.234', {min:0, step:0.01}), false);
  assert.equal(validateNumber('0.29', {min:0, step:0.01}), true);
  assert.equal(validateNumber('Infinity'), false);
  assert.equal(validateNumber('1oops'), false);
});
test('calendar dates cannot silently roll over', () => {
  assert.equal(isValidDate('2026-02-29'), false);
  assert.equal(isValidDate('2028-02-29'), true);
  assert.equal(isValidDate('2026-13-01'), false);
});
test('external links cannot use executable schemes or credentials', () => {
  assert.equal(safeUrl('javascript:alert(1)'), null);
  assert.equal(safeUrl('https://user:secret@example.com'), null);
  assert.equal(safeUrl('https://example.com/news'), 'https://example.com/news');
});
