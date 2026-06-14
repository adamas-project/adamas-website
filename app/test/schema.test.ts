import { describe, it, expect } from 'vitest';
import { validateDecision } from '../src/schema/validate.js';
import { nextId, slugify, fileName, sequenceOf } from '../src/ledger/ids.js';

const base = {
  id: 'SAL-021',
  domain: 'sales',
  date: '2025-04-11',
  title: 'Decline the automotive OEM frame contract',
  context: 'A large OEM offered a high-volume frame contract.',
  decision: 'Decline the contract and keep capacity for higher-margin cells.',
  owner: { role: 'founder' },
};

describe('schema validation', () => {
  it('accepts a minimal valid decision', () => {
    expect(validateDecision(base).valid).toBe(true);
  });

  it('rejects a missing required field (owner)', () => {
    const { owner, ...rest } = base;
    void owner;
    expect(validateDecision(rest).valid).toBe(false);
  });

  it('rejects an owner without a role (principle #2)', () => {
    expect(validateDecision({ ...base, owner: { name: 'Massimo' } }).valid).toBe(false);
  });

  it('accepts dissent recorded as roles', () => {
    expect(validateDecision({ ...base, owner: { role: 'founder', dissent: ['head-of-ops'] } }).valid).toBe(true);
  });

  it('rejects a bad id pattern', () => {
    expect(validateDecision({ ...base, id: 'sal-21' }).valid).toBe(false);
    expect(validateDecision({ ...base, id: 'SALES-021' }).valid).toBe(false);
  });

  it('rejects a title over 120 chars', () => {
    expect(validateDecision({ ...base, title: 'x'.repeat(121) }).valid).toBe(false);
  });

  it('rejects an unknown domain', () => {
    expect(validateDecision({ ...base, domain: 'marketing' }).valid).toBe(false);
  });

  it('rejects additional properties', () => {
    expect(validateDecision({ ...base, foo: 'bar' }).valid).toBe(false);
  });

  it('rejects an invalid date format', () => {
    expect(validateDecision({ ...base, date: '11-04-2025' }).valid).toBe(false);
  });

  it('rejects a link that is not an id pattern', () => {
    expect(validateDecision({ ...base, links: ['not-an-id'] }).valid).toBe(false);
  });
});

describe('id generation', () => {
  it('increments per-domain sequence and zero-pads', () => {
    expect(nextId('sales', [])).toBe('SAL-001');
    expect(nextId('sales', ['SAL-001', 'SAL-009'])).toBe('SAL-010');
    expect(nextId('finance', ['SAL-021', 'FIN-016'])).toBe('FIN-017');
  });

  it('ignores other domains when computing the next sequence', () => {
    expect(nextId('product', ['SAL-099', 'FIN-099'])).toBe('PRD-001');
  });

  it('slugifies titles safely', () => {
    expect(slugify('Decline the automotive OEM frame contract')).toBe('decline-the-automotive-oem-frame-contract');
    expect(slugify('  Weird///chars!! ')).toBe('weird-chars');
  });

  it('builds the canonical filename', () => {
    expect(fileName('SAL-021', 'Decline the automotive OEM frame contract')).toBe(
      'SAL-021_decline-the-automotive-oem-frame-contract.md',
    );
  });

  it('reads sequence numbers', () => {
    expect(sequenceOf('FIN-016')).toBe(16);
  });
});
