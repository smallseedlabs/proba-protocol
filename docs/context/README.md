# Context bridge schemas (protocol 0.4.0)

JSON examples for the additive context-bridge contract. Validate them with the zod schemas exported from `@smallseedlabs/proba-protocol` (`contextRequestSchema`, `contextPacketSchema`, `actAsAssertionClaimsSchema`, …).

| File | Schema |
|------|--------|
| `context-request.example.json` | `ContextRequest` |
| `context-packet.example.json` | `ContextPacket` |
| `act-as-assertion.example.json` | `ActAsAssertionClaims` |

Audit action names for the bridge live in the catalog as `context.*` and `brain.context_attached`. Recommended `details` shapes are `contextAuditDetailsSchema` and `brainContextAttachedDetailsSchema` (ids and counts only; never item text).
