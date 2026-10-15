import { calculate } from './engine.js';
self.onmessage = event => {
  try { self.postMessage({ rows: calculate(event.data) }); }
  catch (error) { self.postMessage({ error: error.message }); }
};
