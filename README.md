# @smallseedlabs/proba-protocol

Shared protocol library for **Proba** - an AI-native platform for testing products with ads.

This library defines the complete communication contract between the Proba client (proba-web) and the Interaction Hub (proba-hub), including TypeScript types, JSON Schema definitions, and runtime validation.

## Overview

Proba uses a structured protocol where an LLM "brain" operates within fixed guardrail code. The protocol defines how commands flow from client to server and how events flow back, with server-driven UI components for rich client rendering.

### Architecture

```mermaid
sequenceDiagram
    participant Client as proba-web
    participant Hub as proba-hub
    participant Brain as AI Brain

    Client->>Hub: POST /v1/commands (create_goal)
    Hub-->>Client: 202 {status: accepted}
    Hub->>Brain: Process goal
    Brain->>Hub: Clarify request
    Hub-->>Client: SSE event (ask)
    
    Client->>Hub: POST /v1/commands (answer_ask)
    Hub->>Brain: Process answer
    Brain->>Hub: Generate plan
    Hub-->>Client: SSE event (ask - plan_approval)
    
    Client->>Hub: POST /v1/commands (approve_plan)
    Hub->>Brain: Execute plan
    Brain->>Hub: Request approval
    Hub-->>Client: SSE event (ask - action_approval)
    
    Client->>Hub: POST /v1/commands (answer_ask with edit)
    Hub->>Brain: Execute with modifications
    Brain->>Hub: Decision
    Hub-->>Client: SSE event (message + goal_updated)
```

## Installation

### From npm (GitHub Packages)

```bash
npm install @smallseedlabs/proba-protocol
```

Configure `.npmrc` to use GitHub Packages:

```
@smallseedlabs:registry=https://npm.pkg.github.com
```

### From Git Repository

```bash
npm install github:smallseedlabs/proba-protocol#v0.1.0
```

Or in `package.json`:

```json
{
  "dependencies": {
    "@smallseedlabs/proba-protocol": "github:smallseedlabs/proba-protocol#v0.1.0"
  }
}
```

## Usage

### TypeScript Types

```typescript
import type {
  CommandEnvelope,
  EventEnvelope,
  SendMessagePayload,
  AskPayload
} from '@smallseedlabs/proba-protocol';

// Build and send a command
import { buildSendMessageCommand } from '@smallseedlabs/proba-protocol';

const command = buildSendMessageCommand({
  text: 'Create a campaign for our new product'
});
```

### Runtime Validation

```typescript
import {
  commandEnvelopeSchema,
  validateCommandPayload
} from '@smallseedlabs/proba-protocol';

// Validate a command envelope
const result = commandEnvelopeSchema.safeParse(receivedCommand);
if (!result.success) {
  console.error('Invalid command:', result.error);
}

// Validate specific payload
const isValid = validateCommandPayload('send_message', payload);
```

### Type Guards

```typescript
import { isCommandEnvelope, isEventEnvelope } from '@smallseedlabs/proba-protocol';

if (isCommandEnvelope(data)) {
  // TypeScript knows data is CommandEnvelope
  console.log(data.clientMsgId);
}
```

### Brain Output Mapping

```typescript
import { mapBrainOutputToEvent } from '@smallseedlabs/proba-protocol';
import type { BrainReply } from '@smallseedlabs/proba-protocol';

const brainReply: BrainReply = {
  type: 'reply',
  text: 'I understand. Let me create a plan.'
};

const event = mapBrainOutputToEvent(brainReply, {
  seq: 5,
  threadId: 'thread-123'
});
```

### JSON Schema (Non-TypeScript Clients)

```javascript
const schemas = require('@smallseedlabs/proba-protocol/schemas');

// Use with your JSON Schema validator
validate(data, schemas.definitions.CommandEnvelope);
```

## Audit and Metrics Contract

Every Proba service logs every action to a global audit trail, and ad-platform numbers are normalised into one shape. The contract for both lives here. Like the rest of this package it is I/O-free: schemas, types, builders and validators only. There is no database, bus or network code; services bring their own.

Import from the package root or from the dedicated subpath:

```typescript
import {
  buildAuditEvent,
  validateAuditEvent,
  isAuditEvent,
  AUDIT_ACTIONS,
  validateMetricObservation,
} from '@smallseedlabs/proba-protocol/audit';
```

### AuditEvent (version 1)

Producers emit `AuditEvent`s. The audit consumer stores them as `StoredAuditEvent`s.

```typescript
const event = buildAuditEvent({
  traceId: command.clientMsgId, // root of the trace: the web command's clientMsgId, or a job run id
  workspaceId: 'seedbed',
  userId,
  threadId,
  actor: { type: 'user', id: userId },
  service: 'hub',
  action: 'command.received', // dotted, lower-case
  category: 'command',
  outcome: 'success',
  details: { commandType: command.type },
});
// buildAuditEvent fills version, eventId, spanId, occurredAt and details when omitted.

const result = validateAuditEvent(event); // zod SafeParseReturnType
if (!result.success) console.error(result.error.issues);
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `version` | `1` | yes | Defaulted by `buildAuditEvent` |
| `eventId` | uuid | yes | Producer-generated; the consumer dedupes on it |
| `traceId` | uuid | yes | Groups everything caused by one root. Stays a UUID; remove the dashes to get the 32-hex OpenTelemetry trace id |
| `spanId` | 16 lowercase hex chars, not all zeros | yes | OpenTelemetry style; generated by `buildAuditEvent` if omitted |
| `parentSpanId` | same format as `spanId` | no | Absent on the root span |
| `workspaceId` | string | yes | Free string. Suggested default: `seedbed` (display name "Seedbed"); documentation only, no schema constraint |
| `userId` | uuid | no | |
| `goalId` / `threadId` | uuid | no | |
| `campaignId` | string | no | Free string, not a uuid: campaign ids usually come from ad platforms, whose ids are not uuids. `goalId` and `threadId` stay uuids |
| `actor` | `{ type: 'user' \| 'brain' \| 'system' \| 'service', id: string }` | yes | |
| `service` | string | yes | Emitting service, e.g. `hub` |
| `action` | string | yes | Dotted lower-case, at least two segments, e.g. `brain.llm_call` |
| `category` | `command` \| `brain` \| `tool` \| `policy` \| `approval` \| `data_access` \| `memory` \| `metrics` \| `auth` \| `config` \| `system` | yes | |
| `target` | `{ type: string, id: string }` | no | |
| `outcome` | `success` \| `failure` \| `denied` \| `partial` | yes | |
| `errorCode` / `errorMessage` | string | no | |
| `riskLevel` | `low` \| `medium` \| `high` | no | |
| `cost` | `{ tokensIn?, tokensOut?, currency?, amount? }` | no | `currency` (3 letters) and `amount` go together |
| `durationMs` | number >= 0 | no | |
| `occurredAt` | UTC ISO 8601 datetime (trailing `Z`) | yes | When the action happened; defaulted to now. See Timestamps |
| `details` | `Record<string, unknown>` | yes | Defaulted to `{}`. See the rule below |
| `tags` | string[] | no | |

**Rule for `details`: no secrets and no raw personal data.** Never put API keys, tokens, passwords, cookies, auth headers or platform credentials in an audit event, and refer to people and records by id, not by name, email or free text. This rule is documentation only: validation does not inspect keys or values, so producers are responsible for it.

#### Action catalog

Actions are dotted, lower-case and shaped `<domain>.<verb_or_event>`. The first segment is the *domain*; the `category` field is the fixed, coarser enum above (consumers index on it), so a domain need not equal a category: `goal.created` is category `data_access`, `control.paused` is category `config`, `stream.connected` is category `data_access`.

The catalog is a recommendation, not an allow-list: any dotted lower-case action validates, and every action published in an earlier version stays valid (the catalog only grows). Exports (from the package root or `/audit`):

- `AUDIT_ACTIONS`: action names grouped by domain (`AUDIT_ACTIONS.goal`, `AUDIT_ACTIONS.control`, ...). The 11 category names are still keys, so `AUDIT_ACTIONS[category]` keeps working.
- `AUDIT_ACTION_INFO`: per action the recommended `category`, default `riskLevel`, `status` and `description`, plus `preferred` for generic and alias actions.
- `isKnownAuditAction(action)` (type guard to `AuditActionName`) and `getAuditActionInfo(action)`.
- Types `AuditActionName`, `AuditActionDomain`, `AuditActionInfo`, `AuditActionStatus`.

`status` is `specific` (the preferred name for what happened), `generic` (still valid, but too broad: use a `preferred` action when one fits) or `alias` (same meaning as its single `preferred` action, kept for compatibility). Default risk levels are recommendations; a producer may raise or lower the level for a given event. Never put secrets or raw personal data in `details` (see above).

| Action | Category | Risk | Status | Use instead |
|---|---|---|---|---|
| `command.received` | `command` | low | specific |  |
| `command.accepted` | `command` | low | specific |  |
| `command.rejected` | `command` | low | specific |  |
| `command.processed` | `command` | low | specific |  |
| `command.duplicate` | `command` | low | specific |  |
| `thread.created` | `command` | low | specific |  |
| `thread.message_received` | `command` | low | specific |  |
| `thread.access_denied` | `policy` | medium | specific |  |
| `goal.created` | `data_access` | low | specific |  |
| `goal.updated` | `data_access` | low | specific |  |
| `goal.status_changed` | `data_access` | low | specific |  |
| `goal.clarification_answered` | `data_access` | low | specific |  |
| `goal.budget_proposed` | `policy` | medium | specific |  |
| `goal.budget_approved` | `approval` | medium | specific |  |
| `goal.budget_declined` | `approval` | low | specific |  |
| `budget.evaluated` | `policy` | medium | specific |  |
| `budget.limit_reached` | `policy` | high | specific |  |
| `campaign.created` | `command` | low | specific | |
| `campaign.launched` | `command` | high | specific | |
| `campaign.paused` | `command` | medium | specific | |
| `campaign.resumed` | `command` | medium | specific | |
| `campaign.stopped` | `command` | medium | specific | |
| `campaign.budget_changed` | `policy` | high | specific | |
| `campaign.synced` | `metrics` | low | specific | |
| `campaign.sync_failed` | `metrics` | medium | specific | |
| `campaign.metrics_attributed` | `metrics` | low | specific | |
| `brain.llm_call` | `brain` | low | specific |  |
| `brain.reply_generated` | `brain` | low | specific |  |
| `brain.explanation_generated` | `brain` | low | specific |  |
| `brain.clarification_requested` | `brain` | low | specific |  |
| `brain.clarify_requested` | `brain` | low | alias | `brain.clarification_requested` |
| `brain.plan_created` | `brain` | low | specific |  |
| `brain.decision_made` | `brain` | medium | specific |  |
| `brain.error` | `brain` | medium | specific |  |
| `tool.proposed` | `tool` | low | specific |  |
| `tool.executed` | `tool` | medium | specific |  |
| `tool.failed` | `tool` | medium | specific |  |
| `tool.called` | `tool` | low | generic | `tool.proposed`, `tool.executed` |
| `tool.completed` | `tool` | medium | alias | `tool.executed` |
| `policy.evaluated` | `policy` | low | generic | `budget.evaluated` |
| `policy.allowed` | `policy` | low | specific |  |
| `policy.denied` | `policy` | medium | generic | `thread.access_denied` |
| `approval.requested` | `approval` | low | specific |  |
| `approval.granted` | `approval` | medium | specific |  |
| `approval.rejected` | `approval` | low | specific |  |
| `approval.expired` | `approval` | low | specific |  |
| `control.paused` | `config` | medium | specific |  |
| `control.resumed` | `config` | medium | specific |  |
| `control.emergency_stopped` | `config` | high | specific |  |
| `control.killed` | `config` | high | specific |  |
| `stream.connected` | `data_access` | low | specific |  |
| `stream.disconnected` | `data_access` | low | specific |  |
| `auth.sign_in` | `auth` | low | specific |  |
| `auth.sign_out` | `auth` | low | specific |  |
| `auth.session_issued` | `auth` | low | specific |  |
| `auth.session_revoked` | `auth` | low | specific |  |
| `auth.session_expired` | `auth` | low | specific |  |
| `auth.denied` | `auth` | medium | specific |  |
| `data_access.read` | `data_access` | low | generic | `stream.connected`, `stream.disconnected`, `memory.retrieved` |
| `data_access.write` | `data_access` | low | generic | `goal.created`, `goal.updated`, `goal.status_changed`, `goal.clarification_answered` |
| `data_access.export` | `data_access` | high | specific |  |
| `data_access.delete` | `data_access` | medium | specific |  |
| `memory.ingested` | `memory` | low | specific |  |
| `memory.promoted` | `memory` | low | specific |  |
| `memory.consolidated` | `memory` | low | specific |  |
| `memory.decayed` | `memory` | low | specific |  |
| `memory.retrieved` | `memory` | low | specific |  |
| `memory.read` | `memory` | low | generic | `memory.retrieved` |
| `memory.write` | `memory` | low | generic | `memory.ingested` |
| `memory.delete` | `memory` | medium | specific |  |
| `metrics.fetch_started` | `metrics` | low | specific |  |
| `metrics.fetch_completed` | `metrics` | low | specific |  |
| `metrics.fetch_failed` | `metrics` | medium | specific |  |
| `metrics.ingested` | `metrics` | low | specific |  |
| `metrics.restated` | `metrics` | low | specific |  |
| `metrics.rollup_run` | `metrics` | low | specific |  |
| `metrics.observation_stored` | `metrics` | low | alias | `metrics.ingested` |
| `config.changed` | `config` | medium | generic | `control.paused`, `control.resumed`, `control.emergency_stopped`, `control.killed` |
| `config.loaded` | `config` | low | specific |  |
| `system.started` | `system` | low | specific |  |
| `system.stopped` | `system` | low | specific |  |
| `system.job_run` | `system` | low | specific |  |
| `system.job_failed` | `system` | medium | specific |  |
| `system.error` | `system` | medium | specific |  |

**Moving from generic names to specific ones** (both stay valid; new code should use the right-hand side):

| Instead of | Emit |
|------------|------|
| `data_access.write` for goal changes | `goal.created`, `goal.updated`, `goal.status_changed`, `goal.clarification_answered` |
| `data_access.read` for SSE connect / disconnect | `stream.connected`, `stream.disconnected` |
| `policy.evaluated` with a budget (`enforced: false`) | `budget.evaluated`; `budget.limit_reached` when a limit is hit |
| `policy.denied` for thread ownership | `thread.access_denied` |
| `config.changed` for pause / resume / stop / kill | `control.paused`, `control.resumed`, `control.emergency_stopped`, `control.killed` |
| `tool.called` | `tool.proposed` (not run yet) or `tool.executed` (ran) |
| `tool.completed` (alias) | `tool.executed` |
| `brain.clarify_requested` (alias) | `brain.clarification_requested` |
| a reply only inside the `brain.llm_call` summary | `brain.reply_generated` / `brain.explanation_generated` (keep `brain.llm_call` for the invocation itself) |
| `memory.read` / `memory.write` | `memory.retrieved` / `memory.ingested` |
| `metrics.observation_stored` (alias) | `metrics.ingested` |

`control.emergency_stopped` halts everything in its scope (usually the workspace) at once; `control.killed` terminates a single goal, run or agent for good. Put the scope in `target` and `details.scope`.

**Stored form.** `StoredAuditEvent` extends `AuditEvent` with `prevHash` (`string | null`, null for the first event), `hash`, `ingestedAt` and `schemaVersion`. Producers never set these; the audit consumer adds them when it appends the event to the hash chain. `canonicalizeAuditEvent(event)` returns the canonical JSON (keys sorted recursively, `undefined` omitted, no whitespace) that the consumer can hash. The hash algorithm and the chaining rule belong to the consumer and are not implemented here.

### Timestamps

Every timestamp in this contract is ISO 8601 / RFC 3339, in UTC, with a trailing `Z` and millisecond precision, exactly what `Date.toISOString()` produces (for example `2026-10-25T21:00:00.000Z`). Validation requires the `Z` and rejects offsets such as `+01:00`. Services store and send UTC only; UIs convert to local time for display. For ad metrics, the account's reporting timezone is carried separately in `MetricObservation.timezone`.

### MetricObservation (version 1)

One normalised reading of a campaign's ad-platform numbers for a period.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `version` | `1` | yes | |
| `platform` | `meta` \| `google` \| `reddit` \| `x` \| `microsoft` \| `other` | yes | |
| `accountId` / `campaignId` | string | yes | |
| `adsetId` / `adId` | string | no | |
| `granularity` | `hour` \| `day` | yes | |
| `periodStart` / `periodEnd` | UTC ISO 8601 datetime (trailing `Z`) | yes | `periodEnd` must be after `periodStart`. See Timestamps |
| `metrics.impressions` / `metrics.clicks` | integer >= 0 | yes | |
| `metrics.spend` | number >= 0 | yes | Major units of `currency` |
| `metrics.conversions` | number >= 0 | yes | May be fractional (modelled conversions) |
| `metrics.reach` / `metrics.videoViews` | integer >= 0 | no | |
| `metrics.revenue` | number >= 0 | no | Major units of `currency` |
| `currency` | string (3 letters) | yes | ISO 4217 |
| `fetchedAt` | UTC ISO 8601 datetime (trailing `Z`) | yes | |
| `timezone` | IANA zone name | no | The ad account's reporting timezone, e.g. `Europe/London`. Defines what a `day` period means for the account (local midnight to local midnight); `periodStart`/`periodEnd` stay UTC instants. Must be non-empty and accepted by `Intl.DateTimeFormat` |
| `revision` | integer >= 0 | yes | 0 is the first fetch of the period; each restatement of the same period increments it |
| `sourceRef` | string | no | Opaque pointer to the raw source; never credentials |

Validate with `validateMetricObservation(value)` (zod result) or `isMetricObservation(value)` (type guard). The JSON Schema bundle also includes `AuditEvent`, `StoredAuditEvent` and `MetricObservation`.

## Transport Contract

### REST Endpoint: Commands

**POST `/v1/commands`**

Submit a command from client to server. Returns immediately with acceptance status.

**Request:** Command envelope (JSON)

**Response:** `202 Accepted`
```json
{
  "status": "accepted",
  "clientMsgId": "550e8400-e29b-41d4-a716-446655440000"
}
```

or `202` with rejection:
```json
{
  "status": "rejected",
  "clientMsgId": "550e8400-e29b-41d4-a716-446655440000",
  "reason": "validation_error"
}
```

### SSE Stream: Events

**GET `/v1/events`**

Server-Sent Events stream with automatic reconnection via `Last-Event-ID`.

**Headers:**
- `Last-Event-ID: <seq>` - Resume from sequence number

**Stream format:**
```
id: 1
event: message
data: {"kind":"event","seq":1,"type":"message",...}

id: 2
event: ask
data: {"kind":"event","seq":2,"type":"ask",...}
```

Heartbeats are sent every 30 seconds to maintain the connection.

### Polling Fallback

**GET `/v1/events?after=<seq>`**

Poll for events after a given sequence number.

**Response:**
```json
{
  "events": [...],
  "nextSeq": 5,
  "hasMore": false
}
```

## Protocol Components

### Commands (Client → Server)

| Type | Description | Payload |
|------|-------------|---------|
| `send_message` | Send a text message with optional attachments | `SendMessagePayload` |
| `answer_ask` | Answer a question (approve/reject/edit) | `AnswerAskPayload` |
| `create_goal` | Create a new campaign goal | `CreateGoalPayload` |
| `approve_plan` | Approve or reject a plan | `ApprovePlanPayload` |
| `control` | Control execution (pause/resume/kill) | `ControlPayload` |
| `explain` | Request explanation for a decision | `ExplainPayload` |
| `mark_read` | Mark events as read up to sequence | `MarkReadPayload` |

### Events (Server → Client)

| Type | Description | Payload |
|------|-------------|---------|
| `message` | Text message from brain or system | `MessagePayload` |
| `ask` | Question requiring user input | `AskPayload` |
| `ask_resolved` | Resolution of a previous ask | `AskResolvedPayload` |
| `status` | Current system status | `StatusPayload` |
| `alert` | User alert or notification | `AlertPayload` |
| `goal_updated` | Goal progress or metrics updated | `GoalUpdatedPayload` |
| `ack` | Command acknowledgment | `AckPayload` |
| `error` | Error occurred | `ErrorPayload` |

### Server-Driven UI Components

Events can include a `ui` field with a component specification for rich rendering:

- **text** - Formatted text with markdown support
- **plan_card** - Multi-step plan with cost estimates
- **approval_card** - Action approval with before/after comparison
- **question_choice** - Multiple choice question
- **question_text** - Free-text input
- **metric_tile** - Single metric with trend
- **metric_chart** - Time-series chart
- **table** - Tabular data
- **spend_bar** - Budget vs spend progress bar
- **status_banner** - Current system status
- **alert** - Dismissible alert
- **timeline_item** - Timeline entry
- **goal_summary** - Goal overview with metrics
- **form** - Multi-field form
- **number_input** - Numeric input with constraints
- **select** - Dropdown selection
- **confirm** - Confirmation dialog

Clients must gracefully fall back to `fallbackText` for unknown components or versions.

## Examples

See [`examples/happy-path-conversation.json`](./examples/happy-path-conversation.json) for a complete conversation flow demonstrating:

1. Goal creation
2. Clarification question
3. Plan approval
4. Action approval with edit (+20% → +10%)
5. Decision with evidence

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Lint
npm run lint

# Type check
npm run typecheck

# Run all validations
npm run validate
```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## Versioning

This project follows [Semantic Versioning](https://semver.org/):

- **Major**: Breaking changes to the protocol
- **Minor**: New features, backward-compatible
- **Patch**: Bug fixes, backward-compatible

Current version: **0.1.0** (initial release)

## License

Apache-2.0 © Small Seed Labs

See [LICENSE](./LICENSE) for full license text.

---

**Related Projects:**
- [proba-hub](https://github.com/smallseedlabs/proba-hub) - Interaction Hub (protocol service)
- [proba-web](https://github.com/smallseedlabs/proba-web) - Client UI

For questions, please open an issue on GitHub.
