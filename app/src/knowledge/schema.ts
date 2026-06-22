import AjvModule, { type ErrorObject } from 'ajv';
import addFormatsModule from 'ajv-formats';

const Ajv: any = (AjvModule as any).default ?? AjvModule;
const addFormats: any = (addFormatsModule as any).default ?? addFormatsModule;

// Knowledge base entries are separate from decisions: they capture what you've
// learned from an article / post / video / link, summarized and linked to source.

export const KNOWLEDGE_TYPES = ['article', 'post', 'video', 'link', 'note'] as const;
export type KnowledgeType = (typeof KNOWLEDGE_TYPES)[number];

export const KNOWLEDGE_ID_PATTERN = '^KNW-[0-9]{3,}$';
export const KNOWLEDGE_ID_REGEX = new RegExp(KNOWLEDGE_ID_PATTERN);

export interface KnowledgeEntry {
  id: string;
  title: string;
  /** URL the entry was captured from, or "manual" for pasted text. */
  source: string;
  type: KnowledgeType;
  /** ISO date the entry was added. */
  date: string;
  /** Concise summary of the resource. */
  summary: string;
  /** Key takeaways / insights. */
  takeaways?: string[];
  tags?: string[];
  author?: string;
  /** Optional short excerpt of the original text. */
  excerpt?: string;
}

export const knowledgeSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'https://adamas.local/schemas/knowledge.json',
  type: 'object',
  additionalProperties: false,
  required: ['id', 'title', 'source', 'type', 'date', 'summary'],
  properties: {
    id: { type: 'string', pattern: KNOWLEDGE_ID_PATTERN },
    title: { type: 'string', minLength: 1, maxLength: 300 },
    source: { type: 'string', minLength: 1 },
    type: { type: 'string', enum: [...KNOWLEDGE_TYPES] },
    date: { type: 'string', format: 'date' },
    summary: { type: 'string', minLength: 1 },
    takeaways: { type: 'array', items: { type: 'string' } },
    tags: { type: 'array', items: { type: 'string' } },
    author: { type: 'string' },
    excerpt: { type: 'string' },
  },
} as const;

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validateFn = ajv.compile(knowledgeSchema);

export function validateKnowledge(value: unknown): { valid: boolean; errors: ErrorObject[] } {
  const valid = validateFn(value) as boolean;
  return { valid, errors: valid ? [] : [...(validateFn.errors ?? [])] };
}

export function assertKnowledge(value: unknown): asserts value is KnowledgeEntry {
  const { valid, errors } = validateKnowledge(value);
  if (!valid) {
    throw new Error('Knowledge entry failed validation:\n' + errors.map((e) => `  - ${e.instancePath} ${e.message}`).join('\n'));
  }
}
