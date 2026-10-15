export class CalculationClient {
  constructor(factory = () => new Worker(new URL('./calculation-worker.js', import.meta.url), { type: 'module' })) {
    this.factory = factory;
    this.active = null;
  }

  cancel() {
    if (!this.active) return;
    this.active.worker.terminate();
    this.active.resolve(null);
    this.active = null;
  }

  calculate(options) {
    this.cancel();
    return new Promise((resolve, reject) => {
      const worker = this.factory();
      const request = { worker, resolve };
      this.active = request;
      const finish = (rows, error) => {
        if (this.active !== request) return;
        worker.terminate();
        this.active = null;
        if (error) reject(new Error(error));
        else resolve(rows);
      };
      worker.onmessage = event => finish(event.data.rows, event.data.error);
      worker.onerror = event => finish(null, event.message || 'Calculation worker failed');
      worker.postMessage(options);
    });
  }
}
