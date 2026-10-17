import { type AnalysisRequest, analyze } from "./analysis";

// Stats and moved-block detection run here so large texts don't freeze the page.
self.onmessage = (e: MessageEvent<AnalysisRequest>) => {
  self.postMessage(analyze(e.data));
};
