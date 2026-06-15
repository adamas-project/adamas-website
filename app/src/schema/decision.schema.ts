// Canonical ADAMAS decision schema (JSON Schema draft-07) and matching types.
// The schema is the contract: every entry is validated against it on write.

export const DOMAINS = ['hiring', 'sales', 'product', 'finance', 'ops'] as const;
export type Domain = (typeof DOMAINS)[number];

export const STATUSES = ['active', 'superseded', 'reversed'] as const;
export type Status = (typeof STATUSES)[number];

// 3-letter id prefix per domain. The schema only enforces the [A-Z]{3} shape;
// the ledger layer enforces that the prefix matches the domain for consistency.
export const DOMAIN_PREFIX: Record<Domain, string> = {
  hiring: 'HIR',
  sales: 'SAL',
  product: 'PRD',
  finance: 'FIN',
  ops: 'OPS',
};

export const PREFIX_DOMAIN: Record<string, Domain> = Object.fromEntries(
  Object.entries(DOMAIN_PREFIX).map(([d, p]) => [p, d as Domain]),
) as Record<string, Domain>;

export const ID_PATTERN = '^[A-Z]{3}-[0-9]{3,}$';
export const ID_REGEX = new RegExp(ID_PATTERN);

export interface Owner {
  /** A role, never a name (principle #2). Required. */
  role: string;
  /** Optional person name. */
  name?: string;
  /** Roles that dissented (principle #3 — never erased). */
  dissent?: string[];
}

export interface Decision {
  id: string;
  domain: Domain;
  /** ISO date (YYYY-MM-DD) the decision was made (not recorded). */
  date: string;
  /** Phrased as the choice made. maxLength 120. */
  title: string;
  /** Situation at the time: constraints, pressures, what was known. */
  context: string;
  /** The exact choice, falsifiable. */
  decision: string;
  owner: Owner;
  tradeoffs?: string[];
  /** Bi-directional links to other decision ids. */
  links?: string[];
  /** Traceable refs, e.g. "email:2025-04-02#thread-114". */
  sources?: string[];
  status?: Status;
  /** Successor id when superseded/reversed. */
  superseded_by?: string;
}

export const decisionSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'https://adamas.local/schemas/decision.json',
  type: 'object',
  additionalProperties: false,
  required: ['id', 'domain', 'date', 'title', 'context', 'decision', 'owner'],
  properties: {
    id: { type: 'string', pattern: ID_PATTERN },
    domain: { type: 'string', enum: [...DOMAINS] },
    date: { type: 'string', format: 'date' },
    title: { type: 'string', minLength: 1, maxLength: 120 },
    context: { type: 'string', minLength: 1 },
    decision: { type: 'string', minLength: 1 },
    owner: {
      type: 'object',
      additionalProperties: false,
      required: ['role'],
      properties: {
        role: { type: 'string', minLength: 1 },
        name: { type: 'string' },
        dissent: { type: 'array', items: { type: 'string' } },
      },
    },
    tradeoffs: { type: 'array', items: { type: 'string' } },
    links: { type: 'array', items: { type: 'string', pattern: ID_PATTERN } },
    sources: { type: 'array', items: { type: 'string', minLength: 1 } },
    status: { type: 'string', enum: [...STATUSES], default: 'active' },
    superseded_by: { type: 'string', pattern: ID_PATTERN },
  },
} as const;
