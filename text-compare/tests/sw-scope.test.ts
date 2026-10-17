import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { expect, it } from 'vitest';

it('does not remove caches owned by sibling lab projects', async () => {
  const listeners: Record<string, (event: any) => void> = {};
  const deleted: string[] = [];
  const self = { registration: {scope: 'https://example.test/lab/text-compare/'}, addEventListener: (name: string, fn: any) => listeners[name] = fn, clients: {claim: async () => {}}, skipWaiting() {} };
  runInNewContext(readFileSync('public/sw.js', 'utf8'), {
    self, URL, location: {origin: 'https://example.test'},
    caches: {keys: async () => ['personal-workbench-v2', 'vcl-text-compare-old'], delete: async (name: string) => {deleted.push(name);}},
  });
  let done: Promise<unknown> = Promise.resolve();
  listeners.activate({waitUntil: (promise: Promise<unknown>) => done = promise});
  await done;
  expect(deleted).not.toContain('personal-workbench-v2');
  expect(deleted).toContain('vcl-text-compare-old');
});
