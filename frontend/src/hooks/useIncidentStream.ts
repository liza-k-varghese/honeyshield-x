import { useEffect, useState, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export type StreamConnectionStatus = 'connected' | 'connecting' | 'disconnected';

export interface StreamEvent {
  id: string;
  type: string;
  timestamp: string;
  payload: any;
}

export function useIncidentStream() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<StreamConnectionStatus>('disconnected');
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [lastEvent, setLastEvent] = useState<StreamEvent | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    if (typeof window === 'undefined' || typeof EventSource === 'undefined') {
      setStatus('disconnected');
      return;
    }

    setStatus('connecting');
    const es = new EventSource('/api/v1/incident-command/stream');
    eventSourceRef.current = es;

    es.onopen = () => {
      setStatus('connected');
    };

    es.onerror = () => {
      setStatus('disconnected');
      // Native EventSource auto-reconnects, but state updates here reflect disconnection
    };

    const handleEvent = (type: string, e: MessageEvent) => {
      try {
        const parsed = JSON.parse(e.data);
        const item: StreamEvent = {
          id: parsed.event_id || crypto.randomUUID(),
          type: type || parsed.event_type || 'message',
          timestamp: parsed.timestamp || new Date().toISOString(),
          payload: parsed.payload || parsed,
        };

        setLastEvent(item);
        setEvents((prev) => [item, ...prev.slice(0, 49)]); // Keep last 50 events

        // Invalidate queries so UI reflects streaming updates
        if (type === 'alert.created' || type === 'alert.updated' || type === 'command.completed') {
          queryClient.invalidateQueries({ queryKey: ['alerts'] });
          queryClient.invalidateQueries({ queryKey: ['virtual-incidents'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
          queryClient.invalidateQueries({ queryKey: ['governor-status'] });
        } else if (type === 'breaker.tripped' || type === 'breaker.recovered' || type === 'governor.lockout') {
          queryClient.invalidateQueries({ queryKey: ['governor-status'] });
        }
      } catch (err) {
        console.error('Error parsing SSE event:', err);
      }
    };

    es.addEventListener('system.connected', (e) => handleEvent('system.connected', e));
    es.addEventListener('alert.created', (e) => handleEvent('alert.created', e));
    es.addEventListener('alert.updated', (e) => handleEvent('alert.updated', e));
    es.addEventListener('command.completed', (e) => handleEvent('command.completed', e));
    es.addEventListener('command.rejected', (e) => handleEvent('command.rejected', e));
    es.addEventListener('breaker.tripped', (e) => handleEvent('breaker.tripped', e));
    es.addEventListener('breaker.recovered', (e) => handleEvent('breaker.recovered', e));
    es.addEventListener('governor.lockout', (e) => handleEvent('governor.lockout', e));
    es.addEventListener('heartbeat', (e) => handleEvent('heartbeat', e));

    es.onmessage = (e) => handleEvent('message', e);
  }, [queryClient]);

  useEffect(() => {
    connect();
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [connect]);

  return {
    status,
    events,
    lastEvent,
    reconnect: connect,
  };
}
