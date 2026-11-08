/**
 * Script to generate JSON Schema bundle from Zod schemas.
 * Zod 4: native z.toJSONSchema() (draft-07). Does not use zod-to-json-schema.
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function toDraft7(schema) {
  return z.toJSONSchema(schema, {
    target: 'draft-07',
    unrepresentable: 'any',
  });
}

async function generateSchemas() {
  const { commandEnvelopeSchema, commandTypeSchema } = await import(
    '../dist/schemas/command.js'
  );
  const { eventEnvelopeSchema, eventTypeSchema } = await import(
    '../dist/schemas/event.js'
  );
  const { serverUISchema, componentTypeSchema } = await import(
    '../dist/schemas/ui.js'
  );

  const { auditEventSchema, storedAuditEventSchema } = await import(
    '../dist/schemas/audit.js'
  );
  const { metricObservationSchema } = await import('../dist/schemas/metrics.js');
  const {
    stepTypeSchema,
    contextRequestSchema,
    contextPacketSchema,
    contextNeedSchema,
    actAsAssertionClaimsSchema,
    contextAuditDetailsSchema,
    brainContextAttachedDetailsSchema,
  } = await import('../dist/schemas/context.js');
  const {
    userSuppliedInputSchema,
    researchArtifactSchema,
    researchReviewAskSchema,
    researchAcceptanceBindingSchema,
    landingPageUrlSchema,
  } = await import('../dist/schemas/research.js');

  const schemas = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    $id: 'https://github.com/smallseedlabs/proba-protocol/schemas',
    title: 'Proba Protocol Schemas',
    version: '0.6.0',
    definitions: {
      CommandType: toDraft7(commandTypeSchema),
      CommandEnvelope: toDraft7(commandEnvelopeSchema),
      EventType: toDraft7(eventTypeSchema),
      EventEnvelope: toDraft7(eventEnvelopeSchema),
      ComponentType: toDraft7(componentTypeSchema),
      ServerUI: toDraft7(serverUISchema),
      AuditEvent: toDraft7(auditEventSchema),
      StoredAuditEvent: toDraft7(storedAuditEventSchema),
      MetricObservation: toDraft7(metricObservationSchema),
      StepType: toDraft7(stepTypeSchema),
      ContextRequest: toDraft7(contextRequestSchema),
      ContextPacket: toDraft7(contextPacketSchema),
      ContextNeed: toDraft7(contextNeedSchema),
      ActAsAssertionClaims: toDraft7(actAsAssertionClaimsSchema),
      ContextAuditDetails: toDraft7(contextAuditDetailsSchema),
      BrainContextAttachedDetails: toDraft7(brainContextAttachedDetailsSchema),
      LandingPageUrl: toDraft7(landingPageUrlSchema),
      UserSuppliedInput: toDraft7(userSuppliedInputSchema),
      ResearchArtifact: toDraft7(researchArtifactSchema),
      ResearchReviewAsk: toDraft7(researchReviewAskSchema),
      ResearchAcceptanceBinding: toDraft7(researchAcceptanceBindingSchema),
    },
  };

  const schemasDir = join(__dirname, '../schemas');
  mkdirSync(schemasDir, { recursive: true });

  const outputPath = join(schemasDir, 'index.json');
  writeFileSync(outputPath, JSON.stringify(schemas, null, 2));

  console.log(`✓ Generated JSON Schema bundle at ${outputPath}`);
}

generateSchemas().catch((error) => {
  console.error('Failed to generate schemas:', error);
  process.exit(1);
});
