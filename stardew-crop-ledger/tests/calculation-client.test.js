import test from 'node:test';
import assert from 'node:assert/strict';
const { CalculationClient } = await import('../calculation-client.js').catch(() => ({}));

test('obsolete heavy calculations terminate and cannot overwrite newer result', async () => {
  assert.equal(typeof CalculationClient, 'function');
  const workers = [];
  const client = new CalculationClient(() => {
    const worker = { terminated: false, postMessage(value) { this.request = value; }, terminate() { this.terminated = true; } };
    workers.push(worker);
    return worker;
  });
  const first = client.calculate({ planted: 10000 });
  const second = client.calculate({ planted: 50 });
  assert.equal(workers[0].terminated, true);
  assert.equal(await first, null);
  workers[1].onmessage({ data: { rows: [{ profit: 10 }] } });
  assert.deepEqual(await second, [{ profit: 10 }]);
  client.cancel();
});

test('worker failure rejects rather than keeping a perpetual calculating state', async () => {
  assert.equal(typeof CalculationClient, 'function');
  let worker;
  const client = new CalculationClient(() => (worker = { postMessage() {}, terminate() {} }));
  const result = client.calculate({});
  worker.onerror({ message: 'Unable to calculate' });
  await assert.rejects(result, /Unable to calculate/);
});
