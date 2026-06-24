import { describe, it, expect } from 'vitest';
import { qs } from '../web/src/query.js';

// Regression: the Knowledge tab showed no entries because empty filters were
// serialized as ?q=undefined&tag=undefined, which the server treated as real
// filters. qs() must drop undefined/null/empty values entirely.
describe('qs query-string builder', () => {
  it('returns empty string for no/empty/undefined params', () => {
    expect(qs({})).toBe('');
    expect(qs({ q: undefined, tag: undefined })).toBe('');
    expect(qs({ q: '', tag: '' })).toBe('');
    expect(qs({ q: undefined, tag: null })).toBe('');
  });

  it('includes only the provided values', () => {
    expect(qs({ tag: 'finance' })).toBe('?tag=finance');
    expect(qs({ q: 'margin', tag: undefined })).toBe('?q=margin');
    expect(qs({ domain: 'sales', status: '', role: 'owner' })).toBe('?domain=sales&role=owner');
  });

  it('never emits the literal string "undefined"', () => {
    expect(qs({ q: undefined, tag: undefined })).not.toContain('undefined');
  });
});
