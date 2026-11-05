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

export type RealtimeEventListener = (event: any, isHistorical?: boolean) => void;
export type RealtimeStateListener = (state: RealtimeStreamConnectionState) => void;

export class RealtimeAgentWebSocketClient {
  private ws: WebSocket | null = null;
  private sse: EventSource | null = null;
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
   * Helper to resolve the active operator bearer token across HoneyShield X storage keys.
   */
  private getAuthToken(): string {
    if (typeof window === 'undefined') return '';
    try {
      return (
        sessionStorage.getItem('hsx_auth_token') ||
        sessionStorage.getItem('hsx_token') ||
        localStorage.getItem('hsx_auth_token') ||
        localStorage.getItem('hsx_token') ||
        localStorage.getItem('token') ||
        ''
      );
    } catch {
      return '';
    }
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

      ws.onclose = () => {
        this.stopHeartbeat();
        this.ws = null;
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
   */
  private fallbackToSSE(): void {
    if (this.sse) {
      this.sse.close();
      this.sse = null;
    }

    if (typeof window === 'undefined' || typeof EventSource === 'undefined') {
      this.scheduleReconnect();
      return;
    }

    try {
      const token = this.getAuthToken();
      const sseUrl = token
        ? `${this.apiBaseUrl}/api/v1/events/stream?token=${encodeURIComponent(token)}`
        : `${this.apiBaseUrl}/api/v1/events/stream`;
      const sse = new EventSource(sseUrl);
      this.sse = sse;

      sse.onopen = () => {
        this.setState('connected');
        this.reconnectAttempt = 0;
      };

      sse.onerror = () => {
        this.sse?.close();
        this.sse = null;
        this.scheduleReconnect();
      };

      sse.onmessage = (e) => {
        try {
          const raw = JSON.parse(e.data);
          this.handleIncomingRawEvent(raw, false);
        } catch {
          // Ignore parse errors on raw heartbeat
        }
      };
    } catch {
      this.scheduleReconnect();
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

