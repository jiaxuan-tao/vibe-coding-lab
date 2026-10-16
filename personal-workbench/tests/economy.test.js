import { test } from 'node:test';
import assert from 'node:assert/strict';
import {calcPositions} from '../js/views/stocks.js';
import {asDate} from '../js/excel.js';
test('average-cost calculation with a partial sell',()=>{
  const [p]=calcPositions([
    {code:'a',side:'buy',price:100,qty:100,date:'2026-01-01'},
    {code:'a',side:'buy',price:120,qty:100,date:'2026-01-02'},
    {code:'a',side:'sell',price:150,qty:50,date:'2026-01-03'},
  ]);
  assert.equal(p.qty,150); assert.equal(p.cost,110); assert.equal(p.realized,2000);
});
test('missing buys never become fictitious realized profits',()=>{
  const [p]=calcPositions([{code:'a',side:'sell',price:100,qty:100,date:'2026-01-01'}]);
  assert.equal(p.realized,0); assert.equal(p.incomplete,true);
});
test('Excel date import rejects impossible dates',()=>{
  assert.equal(asDate('2026-02-31'),null);
  assert.equal(asDate('2028-02-29'),'2028-02-29');
});
