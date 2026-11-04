/**
 * React Hook for Real-Time SOC Stream Subscription & Connection State.
 */

import { useEffect, useState } from 'react';
import { realtimeService } from '../services/realtime.service';
import { RealtimeConnectionState, SecurityEventEnvelope } from '../types';

export function useRealtimeEvents(onEvent?: (event: SecurityEventEnvelope) => void) {
  const [connectionState, setConnectionState] = useState<RealtimeConnectionState>(
    realtimeService.getState()
  );
  const [lastEvent, setLastEvent] = useState<SecurityEventEnvelope | null>(null);

  useEffect(() => {
    const unsubState = realtimeService.onStateChange((newState) => {
      setConnectionState(newState);
    });

    const unsubEvent = realtimeService.subscribe((envelope) => {
      setLastEvent(envelope);
      if (onEvent) {
        onEvent(envelope);
      }
    });

    return () => {
      unsubState();
      unsubEvent();
    };
  }, [onEvent]);

  return {
    connectionState,
    lastEvent,
    lastCursor: realtimeService.getLastCursor(),
    connect: () => realtimeService.connect(),
    disconnect: () => realtimeService.disconnect(),
  };
}

