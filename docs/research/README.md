# Research review schemas (protocol 0.5.0)

Additive contract for operator-entered landing URLs, versioned sourced research, and an explicit research-review ask. Compatible with gateway `docs/RESEARCH_REVIEW_CONTRACT.md` and types at `smallseedlabs/proba-llm-gateway@86630d02cbbeb6b6459676b547c41064d6df3321` (gateway PR4; not merged at time of writing).

This package is I/O-free. It does not gather pages, persist artifacts, call Ads, or approve spend.

**Context packets are not research.** `ContextRequest` / `ContextPacket` remain existing-data retrieval. They are not citations and must not be copied into `sources` or `findings`.

**There is no default landing URL** (including no `smallseedlabs.com` and no auto-prefill).

## Package version consumers need

| Consumer | Package | Why |
| --- | --- | --- |
| **proba-web** (operator UI, not portal) | `@smallseedlabs/proba-protocol@0.6.0` (research fields since 0.5.0) | Validate `create_goal.userSuppliedInput` and render `askType: "research_review"`. 0.4.0 `askPayloadSchema` rejects the new `askType`. A 0.4.0 Hub on Zod 3 **strips** unknown keys and would drop `userSuppliedInput` silently. |
| **proba-hub** | `@smallseedlabs/proba-protocol@0.6.0` | Parse/validate the command and ask; copy `userSuppliedInput` onto `POST /v1/runs`; map gateway `research.accept` needs to `buildResearchReviewAskEvent`; send `resume` with the same `askId` / choice. |
| **proba-llm-gateway** | unchanged for this PR | Already has `HubRunRequest.userSuppliedInput` and artifact types at the SHA above. Do not duplicate that HTTP schema here. |
| **ad-domain** | unchanged | Still takes `args.landingPageUrl` as a request argument. Ads security stays a separate repo. |
| JSON Schema clients | regenerate from `schemas/index.json` **0.5.0** | New definitions: `UserSuppliedInput`, `ResearchArtifact`, `ResearchReviewAsk`, `ResearchAcceptanceBinding`, `LandingPageUrl`. Envelope `payload` stays `unknown`; payload validators are separate. |

Install (after this version is published by maintainers — this PR does not publish or tag):

```json
{
  "dependencies": {
    "@smallseedlabs/proba-protocol": "github:smallseedlabs/proba-protocol#v0.6.0"
  }
}
```

Until a `v0.6.0` tag exists, pin the merge commit SHA of the Zod 4 security PR (after 0.5.0 research schemas). Do not publish/tag from the agent PR. Ads must bump protocol and `zod@^4.6.6` together; npm `overrides` onto an old protocol tag is rejected.

Existing `create_goal` / `answer_ask` / `clarify` / `plan_approval` / `action_approval` payloads remain valid. Clients that only handle those three ask types must ignore `research_review` via event `fallbackText` and must not treat it as a budget card.

## 1. Web (operator UI, not portal) → Hub

Landing URL field on **goal / campaign entry** in proba-web. Portal stays Insights admin and is out of this contract.

`POST /v1/commands` `create_goal` (optional field; omit = current clients still validate):

```json
{
  "kind": "command",
  "type": "create_goal",
  "payload": {
    "title": "…",
    "userSuppliedInput": {
      "landingPageUrl": "https://operator-entered.example/path"
    }
  }
}
```

Rules:

- `userSuppliedInput` is **strict**: only `landingPageUrl` (http/https, no credentials, max 2048, no surrounding whitespace). **No** `workspaceId`, `userId`, `goalId`, or `threadId` — those come from Hub auth, never from the command or the model.
- Do not default, hardcode, or auto-prefill the field. Empty/omitted is valid on the command; Hub/gateway then **fail closed** for `research.gather` and `ads.create_campaign`.
- There is no protocol `create_campaign` command. The campaign-goal command is `create_goal`.

See `create-goal-with-landing.example.json`.

## 2. Hub → gateway (existing HTTP field names)

`HubRunRequest` (gateway, not this package):

```json
{
  "workspaceId": "<from auth>",
  "userId": "<from auth>",
  "goalId": "<uuid>",
  "threadId": "<uuid>",
  "command": { "kind": "command", "type": "create_goal", "payload": { "…": "protocol envelope" } },
  "userSuppliedInput": { "landingPageUrl": "https://operator-entered.example/path" }
}
```

Hub copies `command.payload.userSuppliedInput` onto the run request. It must not take a URL from `command.payload` text, brain output, or tool arguments. `resume.values` still cannot replace the bound user URL (gateway rule).

Auth: `workspaceId` / `userId` on the run are the authenticated caller. Artifact `workspaceId` / `userId` / `goalId` / `threadId` are Hub-authored copies of that binding, never model fields.

## 3. Hub → Web: explicit research review ask

After gateway gather, snapshot `status=awaiting_approval` with `needs[0].verb = "research.accept"` and redacted research. **Not an LLM tool.** Hub must **not** call `mapBrainOutputToEvent` / `mapToolCallToEvent` for `research.accept` (those mappers emit a system message, not an approval card). Use `buildResearchReviewAskEvent` with ids copied from the snapshot:

```json
{
  "kind": "event",
  "type": "ask",
  "payload": {
    "askId": "<same uuid Hub will send as resume.askId>",
    "askType": "research_review",
    "blocking": true,
    "risk": "high",
    "onExpire": "deny",
    "questions": [
      {
        "id": "research-accept",
        "type": "confirm",
        "label": "Accept this sourced research for the current operator-entered landing URL?",
        "required": true
      }
    ],
    "research": {
      "verb": "research.accept",
      "artifactId": "<uuid>",
      "version": 1,
      "inputRevision": "<opaque string from gateway artifact; do not re-hash in protocol>",
      "landingPageUrl": "https://operator-entered.example/path",
      "status": "awaiting_acceptance",
      "findings": [{ "id": "f1", "text": "…", "sourceIds": ["page-1"] }],
      "assumptions": [{ "id": "a1", "text": "…", "basis": "user_input" }],
      "unknowns": [{ "id": "u1", "text": "…" }],
      "sources": [{ "sourceId": "page-1", "kind": "http_url", "url": "…", "sha256": "<64 hex>" }]
    }
  },
  "ui": { "component": "confirm", "version": "1.0.0", "props": { "title": "…", "message": "…", "risk": "high" } },
  "fallbackText": "…"
}
```

Web must render `payload.research` findings / assumptions / unknowns / sources — not a generic budget `approval_card` or `plan_card`. `costEffect` is forbidden on this ask type. Questions must not set `default` (never prefill the destination). `fallbackText` is required for clients that do not yet understand `research_review`.

`inputRevision` is opaque (gateway hashes the normalised URL). Hub copies it; protocol does not reimplement the hash.

See `research-review-ask.example.json`. Persistence shape if Hub stores the artifact: `research-artifact.example.json` / `researchArtifactSchema` (includes `fetchedAt` / optional `excerpt`; the ask uses the redacted source row).

## 4. Web → Hub: answer, then Hub → gateway resume

Same `answer_ask` command (existing `choice`: `approve` | `reject` | `edit`). Additive fields:

```json
{
  "kind": "command",
  "type": "answer_ask",
  "payload": {
    "askId": "<ask.askId>",
    "choice": "approve",
    "researchAcceptance": {
      "artifactId": "<ask.research.artifactId>",
      "version": 1,
      "inputRevision": "<ask.research.inputRevision>"
    }
  }
}
```

| `choice` | Protocol meaning | Hub → gateway `resume` | Artifact |
| --- | --- | --- | --- |
| `approve` | Accept **this** `artifactId`+`version`+`inputRevision` only | `{ askId, choice: "approve" }` plus the same `userSuppliedInput` URL | `accepted` |
| `reject` | Leave unaccepted | `{ askId, choice: "reject" }` | stays unaccepted |
| `edit` | **Invalidate** acceptance. Optional `userSuppliedInput` is a **new** URL (new input revision). Create stays blocked until gather+accept of the current revision | `{ askId, choice: "edit" }` | `invalidated` |

Mismatch (wrong askId, missing `researchAcceptance`, stale `version` / `inputRevision`) is **not** acceptance. Use `evaluateResearchReviewAnswer`; `grantsSpend` is always `false`.

**Approval of research does not bypass spend policies.** `ads.create_campaign` still needs its own `action_approval` ask, Hub human approval, and gateway mutate preflight (`research.accepted` + budget caps). `resume.choice=approve` on research is not a spend grant.

`userSuppliedInput` on `answer_ask` is allowed only with `choice=edit`.

See `research-review-answer-approve.example.json` and `research-review-answer-edit.example.json`.

## 5. What this slice does not claim

- Operator UI implementation, Hub persistence beyond the schema, or live provider fetch.
- End-to-end create-campaign on a network.
- Replacing Hub spend approval.
- Ads / gateway / Hub / Web code in this PR.
