/**
 * Real-Time SOC Operations Client for HoneyShield X Android Application (Phase 3).
 *
 * Implements:
 * - Single-use ticket authenticated WebSocket connection.
 * - Connection lifecycle state machine (connected, connecting, reconnecting, disconnected, offline).
 * - Automatic event deduplication via bounded event ID ring buffer.
 * - Bidirectional heartbeat keepalive & ping/pong monitoring.
 * - Exponential backoff with jitter on network interruption.
 * - Cursor-based missed-event recovery (replay) upon reconnection.
 * - TanStack Query cache invalidation & reactive UI synchronization.
 */

import { QueryClient } from '@tanstack/react-query';
import { eventsApi } from '../api/events.api';
import { RealtimeConnectionState, SecurityEventEnvelope } from '../types';

type EventListener = (event: SecurityEventEnvelope) => void;
type StateListener = (state: RealtimeConnectionState) => void;

class RealtimeSocService {
  private ws: WebSocket | null = null;
  private state: RealtimeConnectionState = 'disconnected';
  private lastCursor: number = 0;
  private seenEventIds: Set<string> = new Set();
  private maxSeenIds: number = 500;
  private reconnectAttempt: number = 0;
  private reconnectTimer: any = null;
  private pingTimer: any = null;
  private queryClient: QueryClient | null = null;
  private eventListeners: Set<EventListener> = new Set();
  private stateListeners: Set<StateListener> = new Set();
  private isExplicitlyClosed: boolean = false;
  private baseUrl: string = 'http://10.0.2.2:8000';

  /**
   * Initialize service with TanStack query client for cache synchronization.
   */
  public init(queryClient: QueryClient, apiBaseUrl?: string): void {
    this.queryClient = queryClient;
    if (apiBaseUrl) {
      this.baseUrl = apiBaseUrl;
    }
  }

  public getState(): RealtimeConnectionState {
    return this.state;
  }

  public getLastCursor(): number {
    return this.lastCursor;
  }

  private setState(newState: RealtimeConnectionState): void {
    if (this.state !== newState) {
      this.state = newState;
      this.notifyStateListeners(newState);
    }
  }

  public onStateChange(listener: StateListener): () => void {
    this.stateListeners.add(listener);
    listener(this.state);
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  private notifyStateListeners(state: RealtimeConnectionState): void {
    this.stateListeners.forEach((fn) => {
      try {
        fn(state);
      } catch (err) {
        console.warn('Realtime state listener error:', err);
      }
    });
  }

  public subscribe(listener: EventListener): () => void {
    this.eventListeners.add(listener);
    return () => {
      this.eventListeners.delete(listener);
    };
  }

  private notifyEventListeners(envelope: SecurityEventEnvelope): void {
    this.eventListeners.forEach((fn) => {
      try {
        fn(envelope);
      } catch (err) {
        console.warn('Realtime event listener error:', err);
      }
    });
  }

  /**
   * Connect to real-time event gateway using single-use connection ticket.
   */
  public async connect(): Promise<void> {
    if (this.state === 'connected' || this.state === 'connecting') {
      return;
    }

    this.isExplicitlyClosed = false;
    this.setState(this.reconnectAttempt > 0 ? 'reconnecting' : 'connecting');

    try {
      // 1. Acquire single-use ticket
      const ticketRes = await eventsApi.getWsTicket();
      const ticket = ticketRes.ticket;

      // 2. Build WebSocket URL
      const wsProto = this.baseUrl.startsWith('https') ? 'wss' : 'ws';
      const cleanHost = this.baseUrl.replace(/^https?:\/\//, '').replace(/\/api\/v1\/?$/, '');
      const wsUrl = `${wsProto}://${cleanHost}/api/v1/events/ws?ticket=${ticket}`;

      // 3. Open WebSocket
      const ws = new WebSocket(wsUrl);
      this.ws = ws;

      ws.onopen = () => {
        if (this.ws !== ws) return;
        this.setState('connected');
        this.reconnectAttempt = 0;
        this.startPingLoop();

        // If reconnecting with previous cursor, catch up missed events
        if (this.lastCursor > 0) {
          this.catchUpMissedEvents();
        }
      };

      ws.onmessage = (event) => {
        if (this.ws !== ws) return;
        try {
          const raw = JSON.parse(event.data);
          this.handleIncomingFrame(raw);
        } catch (e) {
          console.warn('Failed to parse realtime frame:', e);
        }
      };

      ws.onerror = (err) => {
        console.warn('WebSocket error:', err);
      };

      ws.onclose = () => {
        if (this.ws !== ws) return;
        this.cleanupSocket();
        if (!this.isExplicitlyClosed) {
          this.scheduleReconnect();
        } else {
          this.setState('disconnected');
        }
      };
    } catch (error) {
      console.warn('Failed to establish realtime connection:', error);
      this.cleanupSocket();
      if (!this.isExplicitlyClosed) {
        this.scheduleReconnect();
      } else {
        this.setState('disconnected');
      }
    }
  }

  /**
   * Process incoming frame, enforce deduplication, update cursor, and trigger cache invalidation.
   */
  private handleIncomingFrame(raw: any): void {
    if (!raw || !raw.event_type) return;

    // Handle system keepalives
    if (raw.event_type === 'system.heartbeat' || raw.event_type === 'system.pong') {
      if (raw.cursor && raw.cursor > this.lastCursor) {
        this.lastCursor = raw.cursor;
      }
      return;
    }

    if (raw.event_type === 'system.connected') {
      if (raw.current_cursor && this.lastCursor === 0) {
        this.lastCursor = raw.current_cursor;
      }
      return;
    }

    const envelope: SecurityEventEnvelope = {
      event_id: raw.event_id || `evt_${Date.now()}`,
      event_type: raw.event_type,
      timestamp: raw.timestamp || new Date().toISOString(),
      schema_version: raw.schema_version || '1.0',
      resource_id: String(raw.resource_id || ''),
      severity: raw.severity || 'info',
      payload: raw.payload || {},
      correlation_id: raw.correlation_id,
      cursor: raw.cursor,
    };

    // Deduplicate
    if (this.seenEventIds.has(envelope.event_id)) {
      return;
    }
    this.trackSeenId(envelope.event_id);

    // Update cursor
    if (envelope.cursor && envelope.cursor > this.lastCursor) {
      this.lastCursor = envelope.cursor;
    }

    // Dispatch to registered UI listeners
    this.notifyEventListeners(envelope);

    // Reactive cache updates
    this.invalidateAffectedQueries(envelope);
  }

  private trackSeenId(id: string): void {
    this.seenEventIds.add(id);
    if (this.seenEventIds.size > this.maxSeenIds) {
      // Evict oldest elements
      const it = this.seenEventIds.values();
      for (let i = 0; i < 50; i++) {
        const next = it.next();
        if (next.done) break;
        this.seenEventIds.delete(next.value);
      }
    }
  }

  /**
   * Invalidate or update TanStack query cache according to event domain.
   */
  private invalidateAffectedQueries(envelope: SecurityEventEnvelope): void {
    if (!this.queryClient) return;

    const evType = envelope.event_type;

    if (evType.startsWith('attack.')) {
      this.queryClient.invalidateQueries({ queryKey: ['attacks'] });
      this.queryClient.invalidateQueries({ queryKey: ['soc', 'dashboard'] });
    } else if (evType.startsWith('alert.')) {
      this.queryClient.invalidateQueries({ queryKey: ['alerts'] });
      this.queryClient.invalidateQueries({ queryKey: ['soc', 'dashboard'] });
    } else if (evType.startsWith('deception.')) {
      this.queryClient.invalidateQueries({ queryKey: ['deception', 'hits'] });
      this.queryClient.invalidateQueries({ queryKey: ['deception', 'canaries'] });
    } else if (evType.startsWith('incident.') || evType.startsWith('case.')) {
      this.queryClient.invalidateQueries({ queryKey: ['cases'] });
    } else if (evType.startsWith('threat_intel.') || evType.startsWith('hunt.')) {
      this.queryClient.invalidateQueries({ queryKey: ['threat-intel'] });
      this.queryClient.invalidateQueries({ queryKey: ['hunts'] });
    } else if (evType.startsWith('system.service')) {
      this.queryClient.invalidateQueries({ queryKey: ['system', 'services'] });
      this.queryClient.invalidateQueries({ queryKey: ['soc', 'dashboard'] });
    }
  }

  /**
   * Recover missed events from replay endpoint after network re-establishment.
   */
  private async catchUpMissedEvents(): Promise<void> {
    try {
      const replay = await eventsApi.replayEvents(this.lastCursor, 100);
      if (replay.events && replay.events.length > 0) {
        for (const ev of replay.events) {
          this.handleIncomingFrame(ev);
        }
      }
    } catch (e) {
      console.warn('Replay catch-up failed:', e);
    }
  }

  private startPingLoop(): void {
    this.stopPingLoop();
    this.pingTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(JSON.stringify({ type: 'ping' }));
        } catch (e) {
          console.warn('Failed to send heartbeat ping:', e);
        }
      }
    }, 20000);
  }

  private stopPingLoop(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private scheduleReconnect(): void {
    this.stopReconnectTimer();
    this.setState('reconnecting');

    // Exponential backoff with jitter: min(30s, 1s * 2^attempt + jitter)
    this.reconnectAttempt++;
    const backoffBase = Math.min(30000, 1000 * Math.pow(1.5, this.reconnectAttempt));
    const jitter = Math.random() * 1000;
    const delay = Math.round(backoffBase + jitter);

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private stopReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private cleanupSocket(): void {
    this.stopPingLoop();
    if (this.ws) {
      try {
        this.ws.close();
      } catch (e) {}
      this.ws = null;
    }
  }

  /**
   * Disconnect cleanly on user sign-out.
   */
  public disconnect(): void {
    this.isExplicitlyClosed = true;
    this.stopReconnectTimer();
    this.cleanupSocket();
    this.reconnectAttempt = 0;
    this.seenEventIds.clear();
    this.setState('disconnected');
  }
}

export const realtimeService = new RealtimeSocService();

