import AjvModule, { type ErrorObject } from 'ajv';
import addFormatsModule from 'ajv-formats';
import { decisionSchema, type Decision } from './decision.schema.js';

// Ajv 8 / ajv-formats ship CJS default exports; normalize across interop modes.
const Ajv: any = (AjvModule as any).default ?? AjvModule;
const addFormats: any = (addFormatsModule as any).default ?? addFormatsModule;

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

const validateFn = ajv.compile(decisionSchema);

export class ValidationError extends Error {
  readonly errors: ErrorObject[];
  constructor(errors: ErrorObject[]) {
    super(
      'Decision failed schema validation:\n' +
        errors.map((e) => `  - ${e.instancePath || '(root)'} ${e.message}`).join('\n'),
    );
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

export interface ValidationResult {
  valid: boolean;
  errors: ErrorObject[];
}

/** Non-throwing validation. */
export function validateDecision(value: unknown): ValidationResult {
  const valid = validateFn(value) as boolean;
  return { valid, errors: valid ? [] : [...(validateFn.errors ?? [])] };
}

/** Throwing validation that also narrows the type. */
export function assertDecision(value: unknown): asserts value is Decision {
  const { valid, errors } = validateDecision(value);
  if (!valid) throw new ValidationError(errors);
}
