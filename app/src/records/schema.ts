import AjvModule, { type ErrorObject } from 'ajv';
import addFormatsModule from 'ajv-formats';

const Ajv: any = (AjvModule as any).default ?? AjvModule;
const addFormats: any = (addFormatsModule as any).default ?? addFormatsModule;

// Diligence records: the commercial / financial / risk / IP facts an M&A buyer
// underwrites. One flexible record type backs several categories, each with a
// few category-specific fields. Stored portable Markdown + JSON, like the rest.

export const RECORD_CATEGORIES = ['customer', 'financial', 'risk', 'ip'] as const;
export type RecordCategory = (typeof RECORD_CATEGORIES)[number];

export const RECORD_CATEGORY_LABEL: Record<RecordCategory, string> = {
  customer: 'Customers & contracts',
  financial: 'Financial KPIs',
  risk: 'Risk register',
  ip: 'IP & assets',
};

export const RECORD_ID_PATTERN = '^REC-[0-9]{3,}$';
export const RECORD_ID_REGEX = new RegExp(RECORD_ID_PATTERN);

export interface RecordEntry {
  id: string;
  category: RecordCategory;
  title: string;
  date: string;
  /** Description / context. */
  summary: string;
  /** Who owns this (role or name). */
  owner?: string;
  /** Lifecycle: active, at-risk, churned, mitigated, expired, etc. */
  status?: string;
  /** Monetary value (ARR / contract value / metric value). */
  amount?: number;
  currency?: string;
  /** Customers: revenue is recurring (vs one-off). */
  recurring?: boolean;
  /** Financial KPIs: the metric name + period (e.g. "Gross margin", "FY2025"). */
  metric?: string;
  period?: string;
  /** Risk: severity + mitigation. */
  severity?: 'low' | 'medium' | 'high';
  mitigation?: string;
  /** Renewal / expiry / due date. */
  dueDate?: string;
  tags?: string[];
  /** Traceable source (where the fact comes from). */
  source?: string;
  links?: string[];
}

export const recordSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'https://adamas.local/schemas/record.json',
  type: 'object',
  additionalProperties: false,
  required: ['id', 'category', 'title', 'date', 'summary'],
  properties: {
    id: { type: 'string', pattern: RECORD_ID_PATTERN },
    category: { type: 'string', enum: [...RECORD_CATEGORIES] },
    title: { type: 'string', minLength: 1, maxLength: 200 },
    date: { type: 'string', format: 'date' },
    summary: { type: 'string', minLength: 1 },
    owner: { type: 'string' },
    status: { type: 'string' },
    amount: { type: 'number' },
    currency: { type: 'string' },
    recurring: { type: 'boolean' },
    metric: { type: 'string' },
    period: { type: 'string' },
    severity: { type: 'string', enum: ['low', 'medium', 'high'] },
    mitigation: { type: 'string' },
    dueDate: { type: 'string' },
    tags: { type: 'array', items: { type: 'string' } },
    source: { type: 'string' },
    links: { type: 'array', items: { type: 'string' } },
  },
} as const;

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validateFn = ajv.compile(recordSchema);

export function validateRecord(value: unknown): { valid: boolean; errors: ErrorObject[] } {
  const valid = validateFn(value) as boolean;
  return { valid, errors: valid ? [] : [...(validateFn.errors ?? [])] };
}

export function assertRecord(value: unknown): asserts value is RecordEntry {
  const { valid, errors } = validateRecord(value);
  if (!valid) {
    throw new Error('Record failed validation:\n' + errors.map((e) => `  - ${e.instancePath} ${e.message}`).join('\n'));
  }
}
