/**
 * HoneyShield X — Digital Agent Universe
 * RealtimeAgentWebSocketClient (Milestone 2)
 *
 * Implements:
 * - Single-use ticket authenticated WebSocket connection.
 * - Automatic SSE fallback if WebSockets are unavailable.
 * - State machine: 'connected' | 'connecting' | 'reconnecting' | 'disconnected'.
 * - Durable cursor replay on reconnection (/api/v1/events/replay?since_cursor=N).
 * - Duplicate event suppression using bounded ring-buffer Set.
 * - Bidirectional heartbeat ping/pong keepalive.
 * - Exponential backoff with random jitter.
 * - Complete teardown and resource reclamation on unmount.
 */

import { RealtimeStreamConnectionState, RealtimeStreamMetrics } from '../types';
import { getActiveSessionToken } from '../../api/client';

export type RealtimeEventListener = (event: any, isHistorical?: boolean) => void;
export type RealtimeStateListener = (state: RealtimeStreamConnectionState) => void;

export class RealtimeAgentWebSocketClient {
  private ws: WebSocket | null = null;
  private sse: EventSource | null = null;
  private sseAbortController: AbortController | null = null;
  private state: RealtimeStreamConnectionState = 'disconnected';
  private lastCursor: number = 0;
  private seenEventIds: Set<string> = new Set();
  private maxSeenIds: number = 500;
  private reconnectAttempt: number = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private isExplicitlyClosed: boolean = false;
  private eventListeners: Set<RealtimeEventListener> = new Set();
  private stateListeners: Set<RealtimeStateListener> = new Set();

  private metrics: RealtimeStreamMetrics = {
    totalReceived: 0,
    totalDeduplicated: 0,
    totalReplayed: 0,
    activeTransfers: 0,
    queuedTransfers: 0,
    batchedCount: 0,
    lastCursor: 0,
  };

  constructor(private apiBaseUrl: string = '') {}

  public getState(): RealtimeStreamConnectionState {
    return this.state;
  }

  public getMetrics(): RealtimeStreamMetrics {
    return { ...this.metrics, lastCursor: this.lastCursor };
  }

  public subscribe(listener: RealtimeEventListener): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  public onStateChange(listener: RealtimeStateListener): () => void {
    this.stateListeners.add(listener);
    listener(this.state);
    return () => this.stateListeners.delete(listener);
  }

  private setState(newState: RealtimeStreamConnectionState): void {
    if (this.state !== newState) {
      this.state = newState;
      this.stateListeners.forEach((fn) => {
        try {
          fn(newState);
        } catch (err) {
          console.warn('[RealtimeWS] State listener error:', err);
        }
      });
    }
  }

  private emitEvent(event: any, isHistorical: boolean = false): void {
    this.eventListeners.forEach((fn) => {
      try {
        fn(event, isHistorical);
      } catch (err) {
        console.warn('[RealtimeWS] Event listener error:', err);
      }
    });
  }

  /**
   * Helper to resolve the active operator bearer token from the authoritative session storage.
   */
  private getAuthToken(): string {
    return getActiveSessionToken() || '';
  }

  /**
   * Connect to backend event gateway using single-use connection ticket.
   */
  public async connect(): Promise<void> {
    if (this.state === 'connected' || this.state === 'connecting') {
      return;
    }

    this.isExplicitlyClosed = false;

    // Verify authentication before requesting tickets to prevent 401 unauthenticated storms
    const token = this.getAuthToken();
    if (!token) {
      this.setState('disconnected');
      return;
    }

    this.setState(this.reconnectAttempt > 0 ? 'reconnecting' : 'connecting');

    try {
      // 1. Acquire single-use ticket
      const ticketUrl = `${this.apiBaseUrl}/api/v1/events/ticket`;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      };

      const res = await fetch(ticketUrl, {
        method: 'POST',
        headers,
      });

      if (!res.ok) {
        if (res.status === 401) {
          console.warn('[RealtimeWS] Ticket acquisition returned 401 Unauthorized - invalid or expired operator session');
          this.setState('disconnected');
          return;
        }
        console.warn(`[RealtimeWS] Ticket acquisition failed (${res.status}), attempting SSE fallback`);
        this.fallbackToSSE();
        return;
      }

      const data = await res.json();
      const ticket = data.ticket;

      // 2. Build WebSocket URL
      const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
      const wsProto = isHttps ? 'wss:' : 'ws:';
      const host = typeof window !== 'undefined' ? window.location.host : 'localhost:8000';
      const wsUrl = `${wsProto}//${host}/api/v1/events/ws?ticket=${ticket}`;

      // 3. Instantiate WebSocket
      const ws = new WebSocket(wsUrl);
      this.ws = ws;

      ws.onopen = () => {
        this.reconnectAttempt = 0;
        this.setState('connected');
        this.startHeartbeat();

        // Catch up on any events missed while disconnected
        if (this.lastCursor > 0) {
          this.recoverMissedEvents(this.lastCursor);
        }
      };

      ws.onmessage = (event) => {
        try {
          const raw = JSON.parse(event.data);
          this.handleIncomingRawEvent(raw, false);
        } catch (e) {
          console.warn('[RealtimeWS] Frame parsing error:', e);
        }
      };

      ws.onerror = () => {
        // Handled in onclose
      };

      ws.onclose = (ev?: CloseEvent) => {
        this.stopHeartbeat();
        this.ws = null;
        if (ev && (ev.code === 1008 || ev.code === 4001 || ev.code === 4003)) {
          console.warn('[RealtimeWS] Connection closed by server due to authorization revocation:', ev.code);
          this.isExplicitlyClosed = true;
          this.setState('disconnected');
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('session-expired'));
          }
          return;
        }
        if (!this.isExplicitlyClosed) {
          this.scheduleReconnect();
        } else {
          this.setState('disconnected');
        }
      };
    } catch (err) {
      console.warn('[RealtimeWS] Connection attempt failed, scheduling reconnect:', err);
      this.scheduleReconnect();
    }
  }

  /**
   * Handles incoming raw message from WebSocket or SSE.
   */
  public handleIncomingRawEvent(raw: any, isHistorical: boolean = false): void {
    if (!raw) return;

    // Heartbeat & connection frames
    if (raw.event_type === 'system.pong') {
      if (raw.cursor && typeof raw.cursor === 'number') {
        this.lastCursor = Math.max(this.lastCursor, raw.cursor);
      }
      return;
    }

    if (raw.event_type === 'system.connected') {
      if (raw.current_cursor && typeof raw.current_cursor === 'number') {
        this.lastCursor = Math.max(this.lastCursor, raw.current_cursor);
      }
      return;
    }

    // Normal security/lifecycle event
    const eventId = raw.event_id || raw.id;
    if (eventId) {
      if (this.seenEventIds.has(eventId)) {
        this.metrics.totalDeduplicated += 1;
        return; // Suppress duplicate
      }
      this.seenEventIds.add(eventId);
      if (this.seenEventIds.size > this.maxSeenIds) {
        const it = this.seenEventIds.values();
        this.seenEventIds.delete(it.next().value!);
      }
    }

    this.metrics.totalReceived += 1;
    if (isHistorical) {
      this.metrics.totalReplayed += 1;
    }

    if (raw.cursor && typeof raw.cursor === 'number') {
      this.lastCursor = Math.max(this.lastCursor, raw.cursor);
    }

    this.emitEvent(raw, isHistorical);
  }

  /**
   * Replay historical events that occurred while client was offline or reconnecting.
   */
  public async recoverMissedEvents(sinceCursor: number): Promise<void> {
    try {
      const token = this.getAuthToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(
        `${this.apiBaseUrl}/api/v1/events/replay?since_cursor=${sinceCursor}&limit=100`,
        { headers }
      );

      if (!res.ok) return;

      const data = await res.json();
      const events: any[] = data.events || [];

      for (const ev of events) {
        this.handleIncomingRawEvent(ev, true);
      }
    } catch (err) {
      console.warn('[RealtimeWS] Historical replay recovery failed:', err);
    }
  }

  /**
   * Fallback to Server-Sent Events stream when WebSockets cannot be opened.
   *
   * SECURITY REMEDIATION (Milestone 6.1):
   * Uses an authenticated fetch-based Web Streams client with Authorization: Bearer <token>
   * transmitted strictly in the HTTP request headers. Normal bearer tokens are NEVER placed in URL query parameters.
   */
  private async fallbackToSSE(): Promise<void> {
    if (this.sseAbortController) {
      try {
        this.sseAbortController.abort();
      } catch {}
      this.sseAbortController = null;
    }
    if (this.sse) {
      try {
        this.sse.close();
      } catch {}
      this.sse = null;
    }

    if (this.isExplicitlyClosed) {
      return;
    }

    const token = this.getAuthToken();
    if (!token) {
      this.setState('disconnected');
      return;
    }

    const abortController = new AbortController();
    this.sseAbortController = abortController;
    const sseUrl = `${this.apiBaseUrl}/api/v1/events/stream`;

    try {
      const response = await fetch(sseUrl, {
        method: 'GET',
        headers: {
          Accept: 'text/event-stream',
          'Cache-Control': 'no-cache',
          Authorization: `Bearer ${token}`,
        },
        signal: abortController.signal,
      });

      if (!response.ok) {
        if (response.status === 401 && typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('session-expired'));
        }
        throw new Error(`SSE streaming response failed: ${response.status}`);
      }

      this.setState('connected');
      this.reconnectAttempt = 0;

      // Handle environments without body reader (e.g. basic mock fetch)
      if (!response.body || typeof response.body.getReader !== 'function') {
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done || abortController.signal.aborted) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        // SSE messages delimited by double newline (\r\n\r\n or \n\n)
        let boundaryIndex: number;
        while ((boundaryIndex = buffer.search(/\r?\n\r?\n/)) !== -1) {
          const rawMessage = buffer.slice(0, boundaryIndex);
          const delimiterMatch = buffer.match(/\r?\n\r?\n/);
          const delimiterLen = delimiterMatch ? delimiterMatch[0].length : 2;
          buffer = buffer.slice(boundaryIndex + delimiterLen);

          this.processRawSSEMessage(rawMessage);
        }
      }

      if (!abortController.signal.aborted && !this.isExplicitlyClosed) {
        this.scheduleReconnect();
      }
    } catch (err: any) {
      if (abortController.signal.aborted || this.isExplicitlyClosed) {
        return;
      }
      this.setState('disconnected');
      this.scheduleReconnect();
    } finally {
      if (this.sseAbortController === abortController) {
        this.sseAbortController = null;
      }
    }
  }

  private processRawSSEMessage(raw: string): void {
    if (!raw.trim()) return;

    const lines = raw.split(/\r?\n/);
    let eventType = 'message';
    const dataLines: string[] = [];

    for (const line of lines) {
      if (!line || line.startsWith(':')) {
        // Comment or heartbeat ping
        continue;
      }
      if (line.startsWith('event:')) {
        eventType = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).trimStart());
      }
    }

    if (dataLines.length > 0) {
      const dataStr = dataLines.join('\n');
      try {
        const parsed = JSON.parse(dataStr);
        if (eventType === 'heartbeat' || parsed.event_type === 'system.heartbeat') {
          return;
        }
        this.handleIncomingRawEvent(parsed, false);
      } catch {
        // Ignore unparseable data
      }
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.pingTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(JSON.stringify({ type: 'ping' }));
        } catch {
          // Socket might have closed
        }
      }
    }, 15000);
  }

  private stopHeartbeat(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.isExplicitlyClosed || this.reconnectTimer) return;

    this.reconnectAttempt += 1;
    this.setState('reconnecting');

    // Exponential backoff with jitter: min(1000 * 1.8^attempt + jitter, 15000)
    const baseDelay = Math.min(1000 * Math.pow(1.8, Math.min(this.reconnectAttempt, 6)), 12000);
    const jitter = Math.random() * 800;
    const delay = Math.round(baseDelay + jitter);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  public disconnect(): void {
    this.isExplicitlyClosed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.stopHeartbeat();

    if (this.ws) {
      try {
        this.ws.close(1000, 'Client unmounted');
      } catch {}
      this.ws = null;
    }

    if (this.sseAbortController) {
      try {
        this.sseAbortController.abort();
      } catch {}
      this.sseAbortController = null;
    }

    if (this.sse) {
      try {
        this.sse.close();
      } catch {}
      this.sse = null;
    }

    this.setState('disconnected');
  }
}

export const defaultRealtimeClient = new RealtimeAgentWebSocketClient();

