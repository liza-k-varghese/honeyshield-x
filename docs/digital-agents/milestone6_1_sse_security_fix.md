# HoneyShield X — Digital Agent Universe
## Milestone 6.1: Secure SSE Fallback Implementation & Bearer-in-URL Remediation

**Document Version:** 1.0.0  
**Date:** 2026-11-05  
**Platform Release Candidate:** `v1.0.0-rc5`  
**Security Target:** Elimination of Bearer Tokens in URL Query Strings & Implementation of Authenticated Fetch Web Streams  

---

## 1. Problem Statement & Threat Model

The W3C `EventSource` standard in web browsers does not provide an interface for custom HTTP request headers (such as `Authorization: Bearer <token>`). In Milestone 6, an interim solution allowed passing session tokens via `GET /api/v1/events/stream?token=<bearer_token>`.

### Threat Vector:
1. **Access Log Exposure:** Reverse proxies (Nginx, Envoy, Cloudflare), load balancers, and container ingress controllers log complete request URIs by default. An operator token in query parameters is logged in plaintext on disk and sent to centralized log aggregators (ELK, Splunk, Datadog).
2. **Referer Leakage:** If external links or browser exceptions occur, the query string may be forwarded in the `Referer` header to external services.
3. **Browser History & Shoulder Surfing:** Query parameters persist in developer tools and browser cache histories.

---

## 2. Technical Remediation Design

```
+===================================================================================================+
| SSE AUTHENTICATION ARCHITECTURE COMPARISON                                                        |
+=======================================+===================================+=======================+
| Dimension                             | Insecure Baseline (Pre-Fix)       | Hardened Architecture |
+=======================================+===================================+=======================+
| Client API                            | Browser `EventSource`             | Fetch API + Web Streams|
| Credential Location                   | URL Query String (`?token=...`)   | HTTP `Authorization`  |
| Request URI                           | `/events/stream?token=eyJ...`     | `/events/stream`      |
| Reverse Proxy Log Exposure            | High (Plaintext token logged)     | Zero exposure         |
| Chunk-Split Handling                  | Automated by browser C++          | Custom Stream Parser  |
| Multibyte UTF-8 Decoding              | Browser default                   | TextDecoder (stream)  |
| Reconnection Strategy                 | Unauthenticated browser retry     | Exponential Backoff   |
| Cancellation & Teardown               | `EventSource.close()`             | `AbortController`     |
+=======================================+===================================+=======================+
```

---

## 3. Code Implementation Details

### 3.1 Backend: Removal of Query-Token Acceptance
In `backend/app/routers/events.py`, the `resolve_sse_operator` dependency was refactored to eliminate the `token: str | None = Query(default=None)` parameter:

```python
def resolve_sse_operator(
    request: Request,
    authorization: str | None = Header(default=None, alias="Authorization"),
    ticket: str | None = Query(default=None),
) -> Operator:
    """Resolve operator for SSE stream securely from Authorization header or single-use ticket.

    SECURITY HARDENING (Milestone 6.1):
    Ordinary bearer tokens MUST NOT be passed via URL query parameters.
    Only Authorization: Bearer <token> headers or short-lived single-use tickets are accepted.
    """
    if authorization:
        parts = authorization.split()
        if len(parts) == 2 and parts[0].lower() == "bearer":
            tok = parts[1].strip()
            session_data = default_session_store.get_session(tok)
            if session_data:
                if session_data.operator_id == "emergency_breakglass":
                    return Operator(
                        username="emergency_breakglass",
                        role="security_administrator",
                        email="breakglass@honeyshield.local",
                        password_hash="",
                        is_active=True,
                    )
                op = default_operator_registry.get_operator(session_data.operator_id)
                if op and op.is_active:
                    return op

    if ticket:
        op = default_ticket_service.consume_ticket(ticket)
        if op and op.is_active:
            return op

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Missing or invalid authentication for SSE stream. Authorization header or single-use ticket required.",
        headers={"WWW-Authenticate": "Bearer"},
    )
```

### 3.2 Frontend: Authenticated Fetch Web Streams Client
In `frontend/src/digital-agents/engine/RealtimeAgentWebSocketClient.ts`, `fallbackToSSE()` now utilizes `window.fetch()` with an `AbortController` and `ReadableStreamDefaultReader`:

```typescript
private async fallbackToSSE(): Promise<void> {
  if (this.sseAbortController) {
    try { this.sseAbortController.abort(); } catch {}
    this.sseAbortController = null;
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

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done || abortController.signal.aborted) break;

      buffer += decoder.decode(value, { stream: true });

      let boundaryIndex: number;
      while ((boundaryIndex = buffer.search(/\r?\n\r?\n/)) !== -1) {
        const rawMessage = buffer.slice(0, boundaryIndex);
        const delimiterMatch = buffer.match(/\r?\n\r?\n/);
        const delimiterLen = delimiterMatch ? delimiterMatch[0].length : 2;
        buffer = buffer.slice(boundaryIndex + delimiterLen);

        this.processRawSSEMessage(rawMessage);
      }
    }
  } catch (err: any) {
    if (abortController.signal.aborted || this.isExplicitlyClosed) return;
    this.setState('disconnected');
    this.scheduleReconnect();
  }
}
```

---

## 4. Verification Evidence

- Backend test `test_01_sse_ordinary_bearer_token_in_query_param_rejected` in `test_milestone6_1_stream_security.py` confirms that sending bearer tokens in query parameters returns `HTTP 401 Unauthorized`.
- Frontend test `CRITICAL: SSE fallback NEVER includes bearer tokens in URL query parameters` in `milestone6_1_secure_streaming.test.tsx` confirms URL strictly matches `/api/v1/events/stream` and headers contain `Authorization: Bearer ...`.

