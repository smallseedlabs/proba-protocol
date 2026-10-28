/**
 * Script to generate JSON Schema bundle from Zod schemas.
 */

import { zodToJsonSchema } from 'zod-to-json-schema';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

  const schemas = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    $id: 'https://github.com/smallseedlabs/proba-protocol/schemas',
    title: 'Proba Protocol Schemas',
    version: '0.4.0',
    definitions: {
      CommandType: zodToJsonSchema(commandTypeSchema, 'CommandType'),
      CommandEnvelope: zodToJsonSchema(commandEnvelopeSchema, 'CommandEnvelope'),
      EventType: zodToJsonSchema(eventTypeSchema, 'EventType'),
      EventEnvelope: zodToJsonSchema(eventEnvelopeSchema, 'EventEnvelope'),
      ComponentType: zodToJsonSchema(componentTypeSchema, 'ComponentType'),
      ServerUI: zodToJsonSchema(serverUISchema, 'ServerUI'),
      AuditEvent: zodToJsonSchema(auditEventSchema, 'AuditEvent'),
      StoredAuditEvent: zodToJsonSchema(storedAuditEventSchema, 'StoredAuditEvent'),
      MetricObservation: zodToJsonSchema(metricObservationSchema, 'MetricObservation'),
      StepType: zodToJsonSchema(stepTypeSchema, 'StepType'),
      ContextRequest: zodToJsonSchema(contextRequestSchema, 'ContextRequest'),
      ContextPacket: zodToJsonSchema(contextPacketSchema, 'ContextPacket'),
      ContextNeed: zodToJsonSchema(contextNeedSchema, 'ContextNeed'),
      ActAsAssertionClaims: zodToJsonSchema(actAsAssertionClaimsSchema, 'ActAsAssertionClaims'),
      ContextAuditDetails: zodToJsonSchema(contextAuditDetailsSchema, 'ContextAuditDetails'),
      BrainContextAttachedDetails: zodToJsonSchema(
        brainContextAttachedDetailsSchema,
        'BrainContextAttachedDetails'
      ),
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
