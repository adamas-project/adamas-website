import AjvModule, { type ErrorObject } from 'ajv';
import addFormatsModule from 'ajv-formats';

const Ajv: any = (AjvModule as any).default ?? AjvModule;
const addFormats: any = (addFormatsModule as any).default ?? addFormatsModule;

// People (human resources) are first-class for M&A diligence: who runs the
// company, what they do, and the key-person risk a buyer underwrites. Stored
// separately from decisions/knowledge, portable Markdown + JSON.

export const PERSON_KINDS = ['founder', 'employee', 'advisor', 'board', 'contractor'] as const;
export type PersonKind = (typeof PERSON_KINDS)[number];

export const PERSON_ID_PATTERN = '^PER-[0-9]{3,}$';
export const PERSON_ID_REGEX = new RegExp(PERSON_ID_PATTERN);

export interface PersonEntry {
  id: string;
  name: string;
  /** Job title / function, e.g. "Head of Engineering". */
  role: string;
  kind: PersonKind;
  /** ISO date the record was added. */
  date: string;
  /** CV summary / bio (synthesized from the CV or written by hand). */
  summary: string;
  /** Skills / specialties (tags). */
  skills?: string[];
  /** Notable experience / highlights from the CV. */
  highlights?: string[];
  /** A key person whose departure is a material risk (drives key-person risk). */
  keyPerson?: boolean;
  startDate?: string;
  location?: string;
  email?: string;
  /** Linked decision/knowledge ids. */
  links?: string[];
  /** Short excerpt of the original CV text. */
  excerpt?: string;
}

export const personSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'https://adamas.local/schemas/person.json',
  type: 'object',
  additionalProperties: false,
  required: ['id', 'name', 'role', 'kind', 'date', 'summary'],
  properties: {
    id: { type: 'string', pattern: PERSON_ID_PATTERN },
    name: { type: 'string', minLength: 1, maxLength: 200 },
    role: { type: 'string', minLength: 1, maxLength: 200 },
    kind: { type: 'string', enum: [...PERSON_KINDS] },
    date: { type: 'string', format: 'date' },
    summary: { type: 'string', minLength: 1 },
    skills: { type: 'array', items: { type: 'string' } },
    highlights: { type: 'array', items: { type: 'string' } },
    keyPerson: { type: 'boolean' },
    startDate: { type: 'string' },
    location: { type: 'string' },
    email: { type: 'string' },
    links: { type: 'array', items: { type: 'string' } },
    excerpt: { type: 'string' },
  },
} as const;

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validateFn = ajv.compile(personSchema);

export function validatePerson(value: unknown): { valid: boolean; errors: ErrorObject[] } {
  const valid = validateFn(value) as boolean;
  return { valid, errors: valid ? [] : [...(validateFn.errors ?? [])] };
}

export function assertPerson(value: unknown): asserts value is PersonEntry {
  const { valid, errors } = validatePerson(value);
  if (!valid) {
    throw new Error('Person entry failed validation:\n' + errors.map((e) => `  - ${e.instancePath} ${e.message}`).join('\n'));
  }
}
