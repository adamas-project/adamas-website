import type { Candidate, LLMProvider, SourceDocument } from './provider.js';
import { runHeuristicExtraction } from './extract.js';

/**
 * CloudLLMProvider — the OPTIONAL hybrid-cloud route. It is the only component
 * that would transmit content off the machine, and it refuses to do so unless
 * explicitly authorized per task by the boundary approval flow. Each authorized
 * call consumes one authorization; nothing transmits without one.
 */
export class CloudLLMProvider implements LLMProvider {
  readonly id = 'cloud';
  readonly location = 'cloud' as const;

  /** Number of documents this provider is currently authorized to transmit. */
  private authorizedCalls = 0;
  /** Audit counter: how many documents have actually been transmitted. */
  public transmissions = 0;

  /** Granted by the boundary service after explicit per-task approval. */
  authorize(count: number): void {
    this.authorizedCalls += count;
  }

  get isArmed(): boolean {
    return this.authorizedCalls > 0;
  }

  async extractCandidates(doc: SourceDocument): Promise<Omit<Candidate, 'candidateId'>[]> {
    if (this.authorizedCalls <= 0) {
      throw new Error(
        'Cloud transmission blocked: this task was not approved. ADAMAS is local-first; ' +
          'the cloud route requires explicit per-task approval.',
      );
    }
    this.authorizedCalls -= 1;
    this.transmissions += 1; // the content "leaves the machine" here
    // A real provider would call a remote API. Results return to the local vault.
    return runHeuristicExtraction(doc, this.id);
  }
}
