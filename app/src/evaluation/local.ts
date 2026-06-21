import type { Candidate, LLMProvider, SourceDocument } from './provider.js';
import { runHeuristicExtraction, heuristicSummarize } from './extract.js';

// LocalLLMProvider — the default, local-first evaluation provider (Hermes).
// Runs entirely on the local machine; a real on-device model (e.g. via Ollama)
// drops in behind this same interface.
export class LocalLLMProvider implements LLMProvider {
  readonly id = 'local';
  readonly location = 'local' as const;

  async extractCandidates(doc: SourceDocument): Promise<Omit<Candidate, 'candidateId'>[]> {
    return runHeuristicExtraction(doc, this.id);
  }

  async summarize(text: string): Promise<string> {
    return heuristicSummarize(text);
  }
}
