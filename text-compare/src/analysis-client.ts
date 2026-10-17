import { type AnalysisRequest, type AnalysisResult, analyze } from "./analysis";

/** Runs analysis in a worker, dropping results that were superseded by newer requests. */
export class Analyzer {
  private worker: Worker | null = null;
  private latest = 0;

  constructor(private onResult: (r: AnalysisResult) => void) {
    try {
      this.worker = new Worker(new URL("./analysis.worker.ts", import.meta.url), { type: "module" });
      this.worker.onmessage = (e: MessageEvent<AnalysisResult>) => this.deliver(e.data);
      this.worker.onerror = () => {
        this.worker = null;
      };
    } catch {
      this.worker = null;
    }
  }

  request(req: Omit<AnalysisRequest, "id">): void {
    const full = { ...req, id: ++this.latest };
    if (this.worker) this.worker.postMessage(full);
    else setTimeout(() => this.deliver(analyze(full)), 0);
  }

  private deliver(r: AnalysisResult) {
    if (r.id === this.latest) this.onResult(r);
  }
}
