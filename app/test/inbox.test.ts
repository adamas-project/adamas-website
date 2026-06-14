import { describe, it, expect, afterEach } from 'vitest';
import { Ledger } from '../src/ledger/ledger.js';
import { CaptureInbox } from '../src/evaluation/inbox.js';
import { LocalLLMProvider } from '../src/evaluation/local.js';
import { SAMPLE_SOURCES } from '../src/evaluation/fixtures.js';
import { validateDecision } from '../src/schema/validate.js';
import { DOMAIN_PREFIX } from '../src/schema/decision.schema.js';
import { nextId } from '../src/ledger/ids.js';
import path from 'node:path';
import { tempVault } from './helpers.js';

const cleanups: Array<() => void> = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()!();
});

async function setup() {
  const { root, cleanup } = tempVault();
  cleanups.push(cleanup);
  const ledger = await Ledger.open(root);
  const inbox = await CaptureInbox.open(path.join(root, 'candidates.json'), ledger);
  return { root, ledger, inbox, provider: new LocalLLMProvider() };
}

describe('evaluation — extraction', () => {
  it('extracts at least one candidate per sample source', async () => {
    const { inbox, provider } = await setup();
    const added = await inbox.ingest(provider, SAMPLE_SOURCES);
    expect(added.length).toBeGreaterThanOrEqual(SAMPLE_SOURCES.length);
  });

  it('every extracted draft maps to a schema-valid decision', async () => {
    const { inbox, provider } = await setup();
    await inbox.ingest(provider, SAMPLE_SOURCES);
    for (const c of inbox.list('pending')) {
      const candidateDecision = {
        ...c.draft,
        id: `${DOMAIN_PREFIX[c.draft.domain]}-001`,
        status: 'active',
      };
      const { valid, errors } = validateDecision(candidateDecision);
      expect(valid, JSON.stringify(errors)).toBe(true);
    }
  });

  it('records the source ref on every candidate (traceability)', async () => {
    const { inbox, provider } = await setup();
    await inbox.ingest(provider, SAMPLE_SOURCES);
    for (const c of inbox.list('pending')) {
      expect(c.draft.sources.length).toBeGreaterThan(0);
      expect(c.draft.sources[0]).toBe(c.source.ref);
    }
  });

  it('captures dissent when present in the source', async () => {
    const { inbox, provider } = await setup();
    await inbox.ingest(provider, SAMPLE_SOURCES);
    const withDissent = inbox.list('pending').find((c) => (c.draft.owner.dissent ?? []).length > 0);
    expect(withDissent).toBeDefined();
  });

  it('ingest is idempotent', async () => {
    const { inbox, provider } = await setup();
    const first = await inbox.ingest(provider, SAMPLE_SOURCES);
    const second = await inbox.ingest(provider, SAMPLE_SOURCES);
    expect(second).toHaveLength(0);
    expect(inbox.list('pending')).toHaveLength(first.length);
  });
});

describe('capture inbox — nothing enters the ledger unreviewed', () => {
  it('ingest does not add anything to the ledger', async () => {
    const { ledger, inbox, provider } = await setup();
    await inbox.ingest(provider, SAMPLE_SOURCES);
    expect(ledger.count).toBe(0);
  });

  it('dismiss never touches the ledger', async () => {
    const { ledger, inbox, provider } = await setup();
    const added = await inbox.ingest(provider, SAMPLE_SOURCES);
    await inbox.dismiss(added[0]!.candidateId);
    expect(ledger.count).toBe(0);
    expect(inbox.list('pending')).toHaveLength(added.length - 1);
  });

  it('only confirm creates a real decision, with the right domain prefix', async () => {
    const { ledger, inbox, provider } = await setup();
    const added = await inbox.ingest(provider, SAMPLE_SOURCES);
    const target = added[0]!;
    const expectedNextId = nextId(target.draft.domain, []);

    const created = await ledger.count; // 0 before
    expect(created).toBe(0);

    const decision = await inbox.confirm(target.candidateId);
    expect(ledger.count).toBe(1);
    expect(decision.id).toBe(expectedNextId);
    expect(decision.id.startsWith(DOMAIN_PREFIX[target.draft.domain])).toBe(true);
    expect(validateDecision(decision).valid).toBe(true);
  });

  it('cannot confirm or dismiss twice', async () => {
    const { inbox, provider } = await setup();
    const added = await inbox.ingest(provider, SAMPLE_SOURCES);
    const id = added[0]!.candidateId;
    await inbox.confirm(id);
    await expect(inbox.confirm(id)).rejects.toThrow();
    await expect(inbox.dismiss(id)).rejects.toThrow();
  });

  it('applies reviewer overrides on confirm', async () => {
    const { inbox, provider } = await setup();
    const added = await inbox.ingest(provider, SAMPLE_SOURCES);
    const decision = await inbox.confirm(added[0]!.candidateId, { title: 'Reviewer-edited title' });
    expect(decision.title).toBe('Reviewer-edited title');
  });
});
