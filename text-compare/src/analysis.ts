import { type DiffStats, diffLineArrays, linesOf, statsFromOps } from "./diff-core";
import type { CompareOptions } from "./normalize";

export interface AnalysisRequest {
  id: number;
  a: string;
  b: string;
  options: CompareOptions;
}

export interface AnalysisResult {
  id: number;
  stats: DiffStats;
}

export function analyze(req: AnalysisRequest): AnalysisResult {
  const la = linesOf(req.a), lb = linesOf(req.b);
  const ops = diffLineArrays(la, lb, req.options);
  return { id: req.id, stats: statsFromOps(ops, la, lb, req.options) };
}
