# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- Publish workflow listens only to version tag `push` (`v*.*.*`). It previously also ran on `release: published`, so creating a GitHub Release for a new tag started two `npm publish` jobs; the second always 409'd (`Cannot publish over existing version`). Does not change package 0.6.0 or republish.

## [0.6.0] - 2026-11-08

### Changed

- Security: depend on patched **Zod 4.6.7** (`zod@^4.6.7`, GHSA line >=4.6.6). There is no safe Zod 3 patch for the remaining production high. Do **not** use npm `overrides` to force Zod 4 onto an older protocol tag
- Replace `zod-to-json-schema` (Zod 3 generator) with Zod 4 `z.toJSONSchema(..., { target: "draft-07" })` in `scripts/generate-schemas.js`. Bundle envelope (`$schema`, `$id`, `definitions.<Name>`) is unchanged; nested per-schema `$ref` wrappers from the old generator are gone. Wire field names and `AuditEvent` required keys stay the same
- Schema API updates internal to this package only: `z.record(z.string(), …)`, `z.uuid()` / `z.url()` / `z.iso.datetime()` plus `utcDateTimeSchema` (still rejects `+01:00` offsets). `validateAuditEvent` / `buildAuditEvent` / `validateStoredAuditEvent` / `validateMetricObservation` keep the same function names and `{ success }` result

### Removed

- Dependency `zod-to-json-schema`

## [0.5.0] - 2026-11-08

### Added

- Research review contract (additive; v0.4.x commands, clarify/plan/action asks, and exports stay valid):
  - Optional `userSuppliedInput.landingPageUrl` on `create_goal` (campaign-goal command). Strict object: URL only. Omitted payloads still validate. Syntactic http(s), no credentials, max 2048, original string preserved. No default, hardcoded, or auto-prefilled destination
  - Optional `researchAcceptance` on `answer_ask` (artifactId + version + inputRevision). Optional `userSuppliedInput` on `answer_ask` only with `choice=edit`
  - `askType: "research_review"` with required `payload.research` (`verb: "research.accept"`, findings that must cite `sources`, assumptions, unknowns). Clarify / `plan_approval` / `action_approval` must omit `research`. `costEffect` forbidden; question `default` forbidden; `onExpire` if present must be `deny`
  - Zod schemas/types: `UserSuppliedInput`, `ResearchArtifact`, `ResearchSource` / `ResearchReviewSource`, `ResearchFinding`, `ResearchAssumption`, `ResearchUnknown`, `ResearchReviewAsk`, `ResearchAcceptanceBinding`
  - Helpers: `parseLandingPageUrl`, `researchFindingsAreSourced`, `canAcceptResearchArtifact`, `researchAcceptanceMatches`, `evaluateResearchReviewAnswer` (`grantsSpend` always `false`)
  - Hub builder `buildResearchReviewAskEvent` (not a brain mapper). `mapToolCallToEvent` for `research.accept` / `research.gather` emits a system message instead of an approval card
  - JSON examples under `docs/research/`; JSON Schema bundle definitions regenerated
- Field names match gateway research types at `proba-llm-gateway@86630d02cbbeb6b6459676b547c41064d6df3321`. Context packets are not research. workspaceId/userId are never taken from model or `userSuppliedInput` fields. Research acceptance does not bypass spend policy
- CI runs on every pull request (not only PRs targeting `main`) plus `push` to `cursor/**`; gitleaks MIT CLI job; JSON Schema consumer fixture under `tests/fixtures/web-consumer-schema-contract.json`

## [0.4.0] - 2026-10-28

### Added

- Context bridge contract (additive; v0.3.x events and exports stay valid):
  - Action domain `context.*`: `requested`, `source_fetched`, `cache_hit`, `cache_miss`, `item_dropped`, `gap_detected`, `need_requested`, `need_refused`, `scope_violation`, `built`, `build_failed`, `packet_viewed`, `cache_invalidated` (category `data_access`; `context.scope_violation` is high risk)
  - `brain.context_attached` (category `brain`): packetId, packetHash, stepId, stepType, configVersion in `details`
  - Zod schemas and types: `StepType`, `ContextRequest`, `ContextPacket`, `Section` / `Item` / `Gap` / `Manifest`, typed `ContextNeed` union (`memory_search`, `analytics_compare`, `audit_trace`, `conversation_before` with hard limits), `ActAsAssertionClaims` (EdDSA claim shape; `exp` at most 5 minutes after `iat`), `contextAuditDetailsSchema`, `brainContextAttachedDetailsSchema`
  - Known gap codes in `KNOWN_GAP_CODES`; JSON examples under `docs/context/`; JSON Schema bundle regenerated
  - `data_access.read` preferred list also points at key `context.*` read/build actions

## [0.3.3] - 2026-10-26

### Added

- Optional raw text on an audit event, additive and backwards compatible (events without it stay valid; older consumers that validate with 0.3.2 ignore the field):
  - `AuditEvent.content?: AuditContent` with `kind` (open snake_case string; recommended `user_message`, `brain_reply`, `brain_clarification`, `explanation`, `prompt` in `AUDIT_CONTENT_KINDS`), `text` (at most `AUDIT_CONTENT_MAX_CHARS` = 16384 UTF-16 code units), `truncated`, `originalLength` (consistent with `text` and `truncated`) and `redactions` (how many secrets were masked)
  - `StoredAuditEvent.contentDigest?`: SHA-256 hex of `canonicalizeAuditContent(content)`, set by the consumer so the chain can cover the text without holding it
  - `auditContentSchema`, `buildAuditContent` (truncates without splitting a surrogate pair), `canonicalizeAuditContent`, `AUDIT_CONTENT_KIND_PATTERN`; JSON Schema bundle regenerated (`content`, `contentDigest`)
  - Rules in the README: producers mask secrets before setting `content`; `details` still never carries text

## [0.3.2] - 2026-10-26

### Added

- Read-side actions for the audit trail and the metrics (additive; no category, schema or JSON Schema change; all category `data_access`, risk `low`): `audit.searched`, `audit.trace_viewed`, `audit.event_viewed`, `audit.integrity_checked`, `analytics.queried`, `analytics.compared`
  - New domains `audit` and `analytics` in `AUDIT_ACTIONS`, described in `AUDIT_ACTION_INFO`; README catalog and generic-to-specific mapping updated
  - Memory needed nothing new: reads are `memory.retrieved` (already specific)

### Changed

- `data_access.read` (still generic and still valid) now also lists the new actions among its `preferred` replacements

## [0.3.1] - 2026-10-25

### Added

- `campaign.*` action domain (additive; no category, schema or JSON Schema change): `campaign.created`, `campaign.launched`, `campaign.paused`, `campaign.resumed`, `campaign.stopped`, `campaign.budget_changed`, `campaign.synced`, `campaign.sync_failed`, `campaign.metrics_attributed`
  - Lifecycle actions map to category `command` (`campaign.launched` is high risk, pause/resume/stop medium), `campaign.budget_changed` to `policy` (high risk), the sync and attribution actions to `metrics`
  - Listed in `AUDIT_ACTIONS.campaign` and described in `AUDIT_ACTION_INFO`; README catalog updated

## [0.3.0] - 2026-10-25

### Added

- Complete audit action catalog, additive and backwards compatible (every action published in 0.2.0 is still listed and valid; the `AuditEvent` schema, its action regex and the JSON Schema bundle are unchanged):
  - New domains and actions: `thread.*` (`created`, `message_received`, `access_denied`), `goal.*` (`created`, `updated`, `status_changed`, `clarification_answered`, `budget_proposed`, `budget_approved`, `budget_declined`), `budget.*` (`evaluated`, `limit_reached`), `control.*` (`paused`, `resumed`, `emergency_stopped`, `killed`), `stream.*` (`connected`, `disconnected`)
  - New actions in existing domains: `brain.reply_generated`, `brain.explanation_generated`, `brain.clarification_requested`, `tool.proposed`, `tool.executed`, `auth.session_expired`, `data_access.delete`, `memory.ingested`, `memory.promoted`, `memory.consolidated`, `memory.decayed`, `memory.retrieved`, `metrics.ingested`, `metrics.restated`, `metrics.rollup_run`, `system.job_failed`
  - `AUDIT_ACTION_INFO`: recommended `category`, default `riskLevel`, `status` (`specific` / `generic` / `alias`), `preferred` replacements and a description per action
  - `isKnownAuditAction` and `getAuditActionInfo` helpers; `AuditActionName`, `AuditActionDomain`, `AuditActionInfo` and `AuditActionStatus` types
  - README: catalog table and a generic-to-specific mapping

### Changed

- `AUDIT_ACTIONS` is grouped by domain instead of by category. The 11 category names are still keys with all their old entries, so `AUDIT_ACTIONS[category]` keeps working; new keys (`thread`, `goal`, `budget`, `control`, `stream`) are domains whose actions map to an existing category (see `AUDIT_ACTION_INFO`). Code that assumes the keys of `AUDIT_ACTIONS` are exactly the categories (for example `keyof typeof AUDIT_ACTIONS` used as a category type) must switch to `AuditCategory`
- Generic actions stay valid but are documented as such, with preferred replacements: `data_access.read` / `data_access.write`, `policy.evaluated`, `policy.denied`, `config.changed`, `tool.called`, `memory.read` / `memory.write`. Aliases: `brain.clarify_requested`, `tool.completed`, `metrics.observation_stored`
- `AuditCategory` is intentionally unchanged: new domains reuse the existing categories, because stores index on the category enum

### Fixed

- `package.json` version (the `v0.2.0` tag still said 0.1.2, and `package-lock.json` said 0.1.0) is now 0.3.0

## [0.2.0] - 2026-10-25

This section was `[Unreleased]` when `v0.2.0` was tagged.

### Added

- `AuditEvent` (version 1) and `StoredAuditEvent` schemas and types for the global audit trail
- `MetricObservation` (version 1) schema and types for normalised ad-platform metrics
- `buildAuditEvent`, `validateAuditEvent`, `validateStoredAuditEvent`, `isAuditEvent`, `validateMetricObservation` and `isMetricObservation` helpers
- `canonicalizeAuditEvent` (stable key order) for consumers that hash audit events
- `AUDIT_ACTIONS` recommended action names per category
- `@smallseedlabs/proba-protocol/audit` subpath export; everything is also exported from the package root
- `AuditEvent`, `StoredAuditEvent` and `MetricObservation` in the JSON Schema bundle
- Optional `MetricObservation.timezone` (IANA zone name, validated with `Intl.DateTimeFormat`): the ad account's reporting timezone, which defines what a `day` period means
- `spanIdSchema`, `SPAN_ID_PATTERN` and `isValidTimeZone` exports

### Changed (within this unreleased contract)

- `AuditEvent.spanId` and `parentSpanId` are strict OpenTelemetry-style ids: exactly 16 lowercase hex characters, not all zeros. `generateSpanId` never returns all zeros
- Documented: `traceId` stays a UUID (remove the dashes for the 32-hex OpenTelemetry trace id); `campaignId` is a free string; `revision` starts at 0; timestamps are UTC ISO 8601 with trailing `Z`; suggested default `workspaceId` is `seedbed`

## [0.1.2] - 2024-10-19

### Fixed

- Add `prepare` script to build dist/ automatically on git URL installs
- Fixes TypeScript type resolution when installing via `github:smallseedlabs/proba-protocol#v0.1.2`

## [0.1.1] - 2024-10-19

### Changed

- License changed from MIT to Apache License 2.0
- Publish workflow now supports both tag push and manual release workflows

## [0.1.0] - 2024-10-19

### Added

- Initial release of proba-protocol
- TypeScript type definitions for all protocol entities
- Zod schemas with runtime validation for commands and events
- JSON Schema export for non-TypeScript clients
- Command builders with automatic idempotency key generation
- Event builders for server-side event creation
- Brain output to protocol event mapping functions
- Type guard utilities for runtime type checking
- Server-driven UI component specifications (17 component types)
- Transport contract documentation (REST POST, SSE, polling fallback)
- Command types: send_message, answer_ask, create_goal, approve_plan, control, explain, mark_read
- Event types: message, ask, ask_resolved, status, alert, goal_updated, ack, error
- Comprehensive test suite with >80% coverage
- Happy-path conversation example with 10-step flow
- Complete documentation with sequence diagrams
- GitHub Actions CI for lint, typecheck, test, and build
- Conventional Commits standard
- MIT License

[0.1.0]: https://github.com/smallseedlabs/proba-protocol/releases/tag/v0.1.0
