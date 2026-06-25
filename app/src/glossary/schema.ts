import AjvModule, { type ErrorObject } from 'ajv';
import addFormatsModule from 'ajv-formats';

const Ajv: any = (AjvModule as any).default ?? AjvModule;
const addFormats: any = (addFormatsModule as any).default ?? addFormatsModule;

// Glossary: the company- and industry-specific terms that make ADAMAS the single
// source of truth — usable for employee handbooks and new-joiner training.

export const GLOSSARY_ID_PATTERN = '^GLO-[0-9]{3,}$';
export const GLOSSARY_ID_REGEX = new RegExp(GLOSSARY_ID_PATTERN);

export interface GlossaryEntry {
  id: string;
  /** The term being defined (e.g. "FAT", "Takt time"). */
  term: string;
  /** Plain-language definition in the company's own context. */
  definition: string;
  /** ISO date the entry was added. */
  date: string;
  /** Synonyms / abbreviations that mean the same thing. */
  aliases?: string[];
  tags?: string[];
  /** Where the definition comes from (a decision, doc, or "manual"). */
  source?: string;
}

export const glossarySchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'https://adamas.local/schemas/glossary.json',
  type: 'object',
  additionalProperties: false,
  required: ['id', 'term', 'definition', 'date'],
  properties: {
    id: { type: 'string', pattern: GLOSSARY_ID_PATTERN },
    term: { type: 'string', minLength: 1, maxLength: 200 },
    definition: { type: 'string', minLength: 1 },
    date: { type: 'string', format: 'date' },
    aliases: { type: 'array', items: { type: 'string' } },
    tags: { type: 'array', items: { type: 'string' } },
    source: { type: 'string' },
  },
} as const;

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validateFn = ajv.compile(glossarySchema);

export function validateGlossary(value: unknown): { valid: boolean; errors: ErrorObject[] } {
  const valid = validateFn(value) as boolean;
  return { valid, errors: valid ? [] : [...(validateFn.errors ?? [])] };
}

export function assertGlossary(value: unknown): asserts value is GlossaryEntry {
  const { valid, errors } = validateGlossary(value);
  if (!valid) {
    throw new Error('Glossary entry failed validation:\n' + errors.map((e) => `  - ${e.instancePath} ${e.message}`).join('\n'));
  }
}
