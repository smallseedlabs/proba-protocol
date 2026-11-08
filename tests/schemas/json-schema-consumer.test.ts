/**
 * JSON Schema bundle compatibility for Web/Hub consumers.
 * Unwraps both zod-to-json-schema nested $ref wrappers (0.5.0) and
 * Zod 4 z.toJSONSchema flat objects (0.6.0).
 */

import { describe, it, expect } from '@jest/globals';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  commandEnvelopeSchema,
  eventEnvelopeSchema,
  userSuppliedInputSchema,
  researchReviewAskSchema,
  validateCommandPayload,
  validateEventPayload,
} from '../../src/schemas/index.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

interface JsonSchemaNode {
  type?: string;
  required?: string[];
  properties?: Record<string, unknown>;
  additionalProperties?: unknown;
  definitions?: Record<string, JsonSchemaNode>;
  $ref?: string;
}

interface Bundle {
  version: string;
  $schema: string;
  definitions: Record<string, JsonSchemaNode>;
}

interface Contract {
  definitions: Record<
    string,
    { required: string[]; properties?: string[]; propertyNames?: string[] }
  >;
}

function unwrap(def: JsonSchemaNode, name: string): JsonSchemaNode {
  // Zod 4 z.toJSONSchema: flat object with top-level properties (nested $defs
  // may exist for UI). Prefer that so we do not pick an inner ServerUI schema.
  if (def.properties) {
    return def;
  }
  // zod-to-json-schema 0.5.0: { $ref, definitions: { [name]: { properties } } }
  const named = def.definitions?.[name];
  if (named?.properties) {
    return named;
  }
  const nested = def.definitions ? Object.values(def.definitions) : [];
  if (nested.length === 1 && nested[0]?.properties) {
    return nested[0];
  }
  return def;
}

const bundle = JSON.parse(readFileSync(join(root, 'schemas/index.json'), 'utf8')) as Bundle;
const contract = JSON.parse(
  readFileSync(join(root, 'tests/fixtures/web-consumer-schema-contract.json'), 'utf8')
) as Contract;

describe('JSON Schema consumer contract (Web/Hub)', () => {
  it('keeps draft-07 bundle envelope and contracted definition names', () => {
    expect(bundle.$schema).toBe('http://json-schema.org/draft-07/schema#');
    expect(['0.5.0', '0.6.0']).toContain(bundle.version);
    for (const name of Object.keys(contract.definitions)) {
      expect(bundle.definitions[name]).toBeDefined();
    }
  });

  it('preserves required wire fields for each contracted definition', () => {
    for (const [name, spec] of Object.entries(contract.definitions)) {
      const node = unwrap(bundle.definitions[name], name);
      // z.unknown() fields (envelope payload) are properties on both generators but
      // zod-to-json-schema (0.5.0) omits them from `required`; assert properties separately.
      expect(node.required).toEqual(expect.arrayContaining(spec.required));
      for (const field of spec.required) {
        expect(node.properties).toHaveProperty(field);
      }
      for (const field of spec.properties ?? []) {
        expect(node.properties).toHaveProperty(field);
      }
      if (spec.propertyNames) {
        expect(Object.keys(node.properties ?? {}).sort()).toEqual([...spec.propertyNames].sort());
        expect(node.additionalProperties).toBe(false);
      }
    }
  });

  it('UserSuppliedInput has no default landing URL in JSON Schema', () => {
    const json = JSON.stringify(bundle.definitions.UserSuppliedInput);
    expect(json).not.toMatch(/smallseedlabs\.com/);
    expect(json).not.toMatch(/"default"\s*:/);
    const node = unwrap(bundle.definitions.UserSuppliedInput, 'UserSuppliedInput');
    expect(node.properties?.landingPageUrl).toMatchObject({ type: 'string' });
  });

  it('runtime validators still accept committed Web/Hub examples', () => {
    const docs = join(root, 'docs/research');
    const goal = JSON.parse(readFileSync(join(docs, 'create-goal-with-landing.example.json'), 'utf8')) as {
      type: string;
      payload: { userSuppliedInput: unknown };
    };
    expect(commandEnvelopeSchema.safeParse(goal).success).toBe(true);
    expect(validateCommandPayload(goal.type, goal.payload)).toBe(true);
    expect(userSuppliedInputSchema.safeParse(goal.payload.userSuppliedInput).success).toBe(true);

    const ask = JSON.parse(readFileSync(join(docs, 'research-review-ask.example.json'), 'utf8')) as {
      type: string;
      payload: { research: unknown };
    };
    expect(eventEnvelopeSchema.safeParse(ask).success).toBe(true);
    expect(validateEventPayload(ask.type, ask.payload)).toBe(true);
    expect(researchReviewAskSchema.safeParse(ask.payload.research).success).toBe(true);
  });
});
