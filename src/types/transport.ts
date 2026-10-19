/**
 * Transport layer types for Proba protocol.
 * 
 * Transport contract:
 * - REST POST /v1/commands - Submit commands, returns 202 with acceptance status
 * - SSE GET /v1/events - Server-Sent Events stream with Last-Event-ID resume support
 * - Polling fallback: GET /v1/events?after=seq - Poll for events after sequence number
 * - Heartbeats included in SSE stream to maintain connection
 */

export interface CommandResponse {
  status: 'accepted' | 'rejected';
  clientMsgId: string;
  reason?: string;
}

export interface EventStreamMessage {
  id: string;
  event?: string;
  data: string;
  retry?: number;
}

export interface PollingResponse {
  events: unknown[];
  nextSeq: number;
  hasMore: boolean;
}
