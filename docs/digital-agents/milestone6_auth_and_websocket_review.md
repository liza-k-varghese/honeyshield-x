# HoneyShield X — Digital Agent Universe
## Milestone 6: Authentication & WebSocket Connection Deep-Dive

**Document Version:** 1.0.0  
**Date:** 2026-11-05  
**Platform Release:** `v1.0.0-rc5`  
**Investigation Focus:** Stage 6 Root-Cause Analysis of 401 Unauthorized Errors, Token Storage Reconciliation & Permanent Multi-Transport Architecture  

---

## 1. Executive Incident Summary

During operator runtime verification in Firefox, browser console logs revealed intermittent authentication failures during WebSocket and Server-Sent Events handshakes:
1. `POST http://127.0.0.1:8000/api/v1/events/ticket` returned `401 Unauthorized`.
2. Following ticket failure, the client attempted fallback to `GET http://127.0.0.1:8000/api/v1/events/stream`, which also returned `401 Unauthorized`.

This investigation conducted a forensic trace across both backend dependencies and frontend storage abstractions, identified the exact root causes, and implemented a permanent, backwards-compatible architectural resolution.

---

## 2. Root Cause Analysis

### 2.1 Root Cause A: Token Storage Key Mismatch
- **Frontend Authentication Architecture:**
  HoneyShield X authenticates operators via `AuthContext.tsx`. Upon successful login, the session token is written to browser `sessionStorage` under key `'hsx_auth_token'` (and `'hsx_token'`).
  The standard HTTP client `api/client.ts` correctly reads from:
  ```ts
  sessionStorage.getItem('hsx_auth_token') || sessionStorage.getItem('hsx_token')
  ```
- **The Defect in RealtimeAgentWebSocketClient:**
  Prior to this resolution, `RealtimeAgentWebSocketClient.ts` contained a hardcoded lookup:
  ```ts
  const token = localStorage.getItem('token') || '';
  ```
  Because the browser session stores the active bearer token in `sessionStorage` under `'hsx_auth_token'`, `localStorage.getItem('token')` evaluated to `null` or empty string (`""`).
- **Consequence:**
  The WebSocket client issued an unauthenticated `POST /api/v1/events/ticket` without a `Bearer` header. The backend dependency `get_current_operator` correctly failed closed and rejected the request with `401 Unauthorized (Missing Authorization header)`.

### 2.2 Root Cause B: Native Browser EventSource Header Inability
- When the ticket request failed, `RealtimeAgentWebSocketClient` triggered its fallback mechanism:
  ```ts
  new EventSource('/api/v1/events/stream');
  ```
- **The Defect in Backend SSE Endpoint:**
  The W3C `EventSource` standard in browsers does NOT support setting custom HTTP headers (such as `Authorization: Bearer <token>`).
  However, the backend endpoint `GET /api/v1/events/stream` was guarded strictly by:
  ```python
  operator: Operator = Depends(get_current_operator)
  ```
  `get_current_operator` requires an `Authorization` header. Since `EventSource` cannot send custom headers, every SSE connection attempt was immediately rejected with `401 Unauthorized`.

### 2.3 Root Cause C: Endpoint URL Discrepancy
- Some client code and documentation referenced `POST /api/v1/auth/ws-ticket`, while the authoritative implementation resided in `backend/app/routers/events.py` at `POST /api/v1/events/ticket`.
- Although `RealtimeAgentWebSocketClient` queried `/api/v1/events/ticket`, legacy consumers querying `/api/v1/auth/ws-ticket` encountered `404 Not Found` or redirected errors.

---

## 3. Permanent Architectural Resolution

### 3.1 Frontend Token Resolver Implementation
In `frontend/src/digital-agents/engine/RealtimeAgentWebSocketClient.ts`, a comprehensive token resolver was introduced:

```typescript
private getAuthToken(): string {
  if (typeof window === 'undefined') return '';
  return (
    sessionStorage.getItem('hsx_auth_token') ||
    sessionStorage.getItem('hsx_token') ||
    localStorage.getItem('hsx_auth_token') ||
    localStorage.getItem('token') ||
    ''
  );
}
```

1. **Pre-flight Check:** `connect()` verifies `this.getAuthToken()` is non-empty before attempting ticket acquisition. If unauthenticated, it sets status to `'disconnected'` without storming the backend with 401s.
2. **Ticket Request:** Attaches `Authorization: Bearer ${token}` explicitly.
3. **SSE Fallback Query Encoding:** Appends the token as a URL query parameter:
   ```typescript
   const token = this.getAuthToken();
   const sseUrl = token
     ? `${this.apiBaseUrl}/api/v1/events/stream?token=${encodeURIComponent(token)}`
     : `${this.apiBaseUrl}/api/v1/events/stream`;
   const sse = new EventSource(sseUrl);
   ```

### 3.2 Backend Multi-Modal SSE Authentication Guard
In `backend/app/routers/events.py`, the rigid `get_current_operator` dependency on `/stream` was replaced with `resolve_sse_operator`:

```python
def resolve_sse_operator(
    request: Request,
    authorization: str | None = Header(default=None, alias="Authorization"),
    token: str | None = Query(default=None),
    ticket: str | None = Query(default=None),
) -> Operator:
    """Resolve operator for SSE stream from Header, query token, or single-use ticket."""
    # 1. Standard Authorization: Bearer <token> header
    if authorization:
        parts = authorization.split()
        if len(parts) == 2 and parts[0].lower() == "bearer":
            tok = parts[1].strip()
            session_data = default_session_store.get_session(tok)
            if session_data:
                op = default_operator_registry.get_operator(session_data.username)
                if op and op.is_active:
                    return op

    # 2. Short-lived single-use ticket in URL query
    if ticket:
        op = default_ticket_service.consume_ticket(ticket)
        if op and op.is_active:
            return op

    # 3. Session token in URL query (for native browser EventSource)
    if token:
        session_data = default_session_store.get_session(token)
        if session_data:
            op = default_operator_registry.get_operator(session_data.username)
            if op and op.is_active:
                return op

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Missing or invalid authentication for SSE stream",
        headers={"WWW-Authenticate": "Bearer"},
    )
```

### 3.3 Endpoint Aliasing & Compatibility
In `backend/app/routers/auth.py`, a routing alias was registered for `/api/v1/auth/ws-ticket` that delegates directly to `default_ticket_service.issue_ticket()`, guaranteeing 100% interoperability across all client variants.

---

## 4. Verification & Validation Evidence

```
+---------------------------------------------------------------------------------------------------+
| AUTHENTICATION & WEBSOCKET AUDIT RESULTS                                                          |
+---------------------------------------+-----------------------------+-----------------------------+
| Operation / Endpoint                  | Pre-Fix Behavior            | Post-Fix Behavior           |
+---------------------------------------+-----------------------------+-----------------------------+
| Token Retrieval in RealtimeClient     | Read empty localStorage     | Reads valid sessionStorage  |
| POST /api/v1/events/ticket            | HTTP 401 Unauthorized       | HTTP 200 OK (ticket issued) |
| POST /api/v1/auth/ws-ticket (Alias)   | HTTP 404 / Unimplemented    | HTTP 200 OK (ticket issued) |
| WS ws://.../events/ws?ticket=...      | Never reached / Socket drop | WebSocket Connected (101)   |
| SSE GET /api/v1/events/stream?token=..| HTTP 401 Unauthorized       | HTTP 200 text/event-stream  |
| Unauthenticated Access Attempts       | 401 Unauthorized            | 401 Unauthorized (Secure)   |
+---------------------------------------+-----------------------------+-----------------------------+
```
