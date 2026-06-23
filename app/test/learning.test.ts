import { describe, it, expect, afterEach } from 'vitest';
import path from 'node:path';
import { LearningStore } from '../src/learning/store.js';
import { LearningProvider } from '../src/learning/provider.js';
import { LocalLLMProvider } from '../src/evaluation/local.js';
import { DOMAINS } from '../src/schema/decision.schema.js';
import { runEval } from '../eval/run.js';
import type { SourceDocument } from '../src/evaluation/provider.js';
import { tempVault } from './helpers.js';

const cleanups: Array<() => void> = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()!();
});

const trickyDoc: SourceDocument = {
  ref: 'eval:trick',
  kind: 'doc',
  date: '2026-01-01',
  title: '',
  text: 'The legacy onboarding flow was confusing. We decided to sunset the onboarding flow and rebuild it. Owner: lead.',
};

describe('learning store', () => {
  it('records confirmed examples and suggests from a strong match', async () => {
    const v = tempVault();
    cleanups.push(v.cleanup);
    const store = await LearningStore.open(path.join(v.root, 'learning'));
    await store.record({ text: 'Sunset the onboarding flow and rebuild the product experience', domain: 'product', ownerRole: 'head-of-product', label: 'confirmed' });

    const s = store.suggest('We decided to sunset the onboarding flow in the product.');
    expect(s.domain).toBe('product');
    expect(s.ownerRole).toBe('head-of-product');

    // No match for unrelated text.
    expect(store.suggest('We hired a new finance controller for payroll.').domain).toBeUndefined();
  });
});

describe('learning loop raises the eval score', () => {
  it('a confirmed example steers extraction to what you taught it', async () => {
    const v = tempVault();
    cleanups.push(v.cleanup);
    const store = await LearningStore.open(path.join(v.root, 'learning'));
    const base = new LocalLLMProvider();

    // Whatever the heuristic decides, teach a *different* domain and prove the
    // learning layer applies it — so an eval keyed to your label improves.
    const baseDomain = (await base.extractCandidates(trickyDoc))[0]!.draft.domain;
    const target = DOMAINS.find((d) => d !== baseDomain)!;
    const evalCase = { name: 'tricky', doc: trickyDoc, expect: { domain: target } };

    const before = await runEval(base, [evalCase]);
    expect(before.domainAcc).toBe(0); // heuristic disagrees with the (taught) label

    await store.record({ text: trickyDoc.text, domain: target, ownerRole: 'head-of-product', label: 'confirmed' });
    const learned = new LearningProvider(base, store);
    const after = await runEval(learned, [evalCase]);
    expect(after.domainAcc).toBe(1); // the number moved after one correction
  });
});
