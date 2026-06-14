import { DOMAIN_PREFIX, ID_REGEX, type Domain } from '../schema/decision.schema.js';

/** Build a filesystem-safe slug from a title. */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'untitled';
}

export function isValidId(id: string): boolean {
  return ID_REGEX.test(id);
}

export function prefixOf(id: string): string {
  return id.slice(0, 3);
}

export function sequenceOf(id: string): number {
  const m = /-([0-9]+)$/.exec(id);
  return m && m[1] !== undefined ? parseInt(m[1], 10) : 0;
}

/**
 * Next id for a domain given the ids already in the ledger. Sequence is the max
 * existing sequence for that domain's prefix + 1, zero-padded to 3 digits.
 */
export function nextId(domain: Domain, existingIds: Iterable<string>): string {
  const prefix = DOMAIN_PREFIX[domain];
  let max = 0;
  for (const id of existingIds) {
    if (prefixOf(id) === prefix) max = Math.max(max, sequenceOf(id));
  }
  const seq = max + 1;
  return `${prefix}-${String(seq).padStart(3, '0')}`;
}

/** The canonical filename for an entry: `{ID}_{slug}.md`. */
export function fileName(id: string, title: string): string {
  return `${id}_${slugify(title)}.md`;
}
