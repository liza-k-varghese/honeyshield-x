import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RealtimeAgentWebSocketClient } from '../digital-agents/engine/RealtimeAgentWebSocketClient';
import { getActiveSessionToken } from '../api/client';

describe('Milestone 6.1 — Secure Streaming & Token Protection Tests', () => {
  let client: RealtimeAgentWebSocketClient;
  const mockToken = 'hsx_auth_test_token_secure_98765';

  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.restoreAllMocks();
    client = new RealtimeAgentWebSocketClient('http://127.0.0.1:8000');
  });

  afterEach(() => {
    client.disconnect();
    sessionStorage.clear();
    localStorage.clear();
  });

  it('retrieves active session token from sessionStorage via getActiveSessionToken', () => {
    sessionStorage.setItem('hsx_auth_token', mockToken);
    expect(getActiveSessionToken()).toBe(mockToken);
  });

  it('does not send requests when unauthenticated (prevents 401 loops)', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    await client.connect();

    expect(client.getState()).toBe('disconnected');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('attaches Authorization header for ticket request using active session token', async () => {
    sessionStorage.setItem('hsx_auth_token', mockToken);

    let capturedUrl = '';
    let capturedHeaders: Record<string, string> = {};

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any, init?: any) => {
      capturedUrl = url.toString();
      capturedHeaders = init?.headers || {};
      return new Response(JSON.stringify({
        ticket: 'hsx_wstk_test_123',
        expires_in: 60,
        ws_endpoint: '/api/v1/events/ws',
      }), { status: 200 });
    });

    // Mock WebSocket to prevent actual network attempt in node test environment
    const originalWebSocket = globalThis.WebSocket;
    (globalThis as any).WebSocket = class MockWebSocket {
      public onopen: any = null;
      public onmessage: any = null;
      public onerror: any = null;
      public onclose: any = null;
      constructor(public url: string) {
        setTimeout(() => {
          if (this.onopen) this.onopen({});
        }, 10);
      }
      close() {}
    };

    try {
      await client.connect();
      expect(capturedUrl).toContain('/api/v1/events/ticket');
      expect(capturedHeaders['Authorization']).toBe(`Bearer ${mockToken}`);
    } finally {
      globalThis.WebSocket = originalWebSocket;
    }
  });

  it('CRITICAL: SSE fallback NEVER includes bearer tokens in URL query parameters', async () => {
    sessionStorage.setItem('hsx_auth_token', mockToken);

    let sseUrlCaptured = '';
    let sseHeadersCaptured: Record<string, string> = {};

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any, init?: any) => {
      const urlStr = url.toString();
      if (urlStr.includes('/api/v1/events/ticket')) {
        // Force fallback to SSE by simulating 503 Service Unavailable
        return new Response('WebSocket Service Unavailable', { status: 503 });
      }
      if (urlStr.includes('/api/v1/events/stream')) {
        sseUrlCaptured = urlStr;
        sseHeadersCaptured = init?.headers || {};
        return new Response(new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(': keepalive\n\n'));
            controller.close();
          }
        }), { status: 200 });
      }
      return new Response('Not Found', { status: 404 });
    });

    await client.connect();

    // Verify URL does not contain token or access_token query param
    expect(sseUrlCaptured).toBe('http://127.0.0.1:8000/api/v1/events/stream');
    expect(sseUrlCaptured).not.toContain('?token=');
    expect(sseUrlCaptured).not.toContain('?access_token=');
    expect(sseUrlCaptured).not.toContain(mockToken);

    // Verify token is passed securely in the HTTP Authorization header
    expect(sseHeadersCaptured['Authorization']).toBe(`Bearer ${mockToken}`);
    expect(sseHeadersCaptured['Accept']).toBe('text/event-stream');
  });

  it('parses chunk-split SSE frames with multibyte UTF-8 characters', async () => {
    sessionStorage.setItem('hsx_auth_token', mockToken);
    const receivedEvents: any[] = [];
    client.subscribe((ev) => receivedEvents.push(ev));

    const testPayload = {
      event_type: 'security.attack.detected',
      cursor: 1045,
      agent: 'SCOUT',
      message: 'Brute-force detected 🛡️',
    };
    const sseChunk1 = 'event: security.attack.detected\ndata: {"event_type":"security.attack.detected","cursor":1045,"agent":"SCOUT","mess';
    const sseChunk2 = 'age":"Brute-force detected 🛡️"}\n\n';

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any) => {
      const urlStr = url.toString();
      if (urlStr.includes('/api/v1/events/ticket')) {
        return new Response('Offline', { status: 503 });
      }
      return new Response(new ReadableStream({
        async start(controller) {
          controller.enqueue(new TextEncoder().encode(sseChunk1));
          // Delay to simulate network packet boundary
          await new Promise((r) => setTimeout(r, 20));
          controller.enqueue(new TextEncoder().encode(sseChunk2));
          controller.close();
        }
      }), { status: 200 });
    });

    await client.connect();
    // Allow stream chunks to process
    await new Promise((r) => setTimeout(r, 60));

    expect(receivedEvents.length).toBe(1);
    expect(receivedEvents[0]).toEqual(testPayload);
  });

  it('filters comment keepalives and system.heartbeat frames cleanly', async () => {
    sessionStorage.setItem('hsx_auth_token', mockToken);
    const receivedEvents: any[] = [];
    client.subscribe((ev) => receivedEvents.push(ev));

    const sseStreamContent = 
      ': comment frame\n\n' +
      'event: heartbeat\ndata: {"event_type":"system.heartbeat","cursor":1040}\n\n' +
      'event: security.attack.detected\ndata: {"event_type":"security.attack.detected","cursor":1041}\n\n';

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any) => {
      const urlStr = url.toString();
      if (urlStr.includes('/api/v1/events/ticket')) {
        return new Response('Fail', { status: 503 });
      }
      return new Response(new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(sseStreamContent));
          controller.close();
        }
      }), { status: 200 });
    });

    await client.connect();
    await new Promise((r) => setTimeout(r, 50));

    expect(receivedEvents.length).toBe(1);
    expect(receivedEvents[0].cursor).toBe(1041);
  });

  it('disconnect() aborts the stream AbortController and resets connection state', async () => {
    sessionStorage.setItem('hsx_auth_token', mockToken);

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any, _init?: any) => {
      const urlStr = url.toString();
      if (urlStr.includes('/api/v1/events/ticket')) {
        return new Response('Fail', { status: 503 });
      }
      return new Response(new ReadableStream({
        start(_controller) {
          // Never closes on its own
        }
      }), { status: 200 });
    });

    await client.connect();
    expect(client.getState()).toBe('connected');

    client.disconnect();
    expect(client.getState()).toBe('disconnected');
  });
});

