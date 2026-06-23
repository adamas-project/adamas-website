import { describe, it, expect } from 'vitest';
import { LocalLLMProvider } from '../src/evaluation/local.js';
import { runEval } from '../eval/run.js';
import { cases } from '../eval/cases.js';

// Guards the eval harness itself, and acts as a regression floor for the
// deterministic baseline: the local heuristic must keep extracting decisions
// with sane domain/owner accuracy. A change that drops below the floor fails CI.
describe('extraction eval harness', () => {
  it('runs the fixtures and reports per-field accuracy', async () => {
    const res = await runEval(new LocalLLMProvider());
    expect(res.total).toBe(cases.length);
    expect(res.score).toBeGreaterThan(0);
    expect(res.score).toBeLessThanOrEqual(1);
    // Baseline floor for the deterministic provider (raise as we improve).
    expect(res.domainAcc).toBeGreaterThanOrEqual(0.6);
    expect(res.ownerAcc).toBeGreaterThanOrEqual(0.6);
  });
});
