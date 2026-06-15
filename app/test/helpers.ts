import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { DecisionInput } from '../src/ledger/ledger.js';

export function tempVault(): { root: string; cleanup: () => void } {
  const root = mkdtempSync(path.join(tmpdir(), 'adamas-test-'));
  return { root, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

export function sampleInput(over: Partial<DecisionInput> = {}): DecisionInput {
  return {
    domain: 'sales',
    date: '2025-04-11',
    title: 'Sample decision title',
    context: 'Some context at the time, with constraints and pressures.',
    decision: 'We chose the concrete, falsifiable option.',
    owner: { role: 'head-of-sales' },
    ...over,
  };
}
