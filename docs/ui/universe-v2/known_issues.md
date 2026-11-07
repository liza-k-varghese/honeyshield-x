# HoneyShield X — Known Issues & Operational Considerations

## 1. Discovered Observations & Status

1. **Large JS Chunk Size (> 500 kB):**
   - *Observation:* Vite warns that `dist/assets/index-CjlGNp1B.js` is 934 kB (213 kB gzipped).
   - *Analysis:* Driven by consolidated bundling of Lucide React icons, TanStack React Query, and complete SOC sub-views (Threat Hunting, Deception Grid, Replay Studio).
   - *Recommendation for future milestone:* Configure `build.rollupOptions.output.manualChunks` or dynamic `import()` code-splitting on secondary views.

2. **Backend datetime.utcnow() deprecation:**
   - *Observation:* Python 3.13 deprecation warnings emitted in SQLAlchemy model schemas for `datetime.datetime.utcnow()`.
   - *Analysis:* Does not impact runtime functionality; scheduled for clean migration to `datetime.datetime.now(datetime.UTC)`.

3. **Sensor Port Binding in Isolated Sandbox:**
   - *Observation:* Honeypot port binding tests require root / elevated capabilities when binding ports below 1024 on standard Linux hosts.
   - *Mitigation:* HoneyShield X uses unprivileged honeypot listener ports (e.g. Cowrie on port 2222, Dionaea HTTP on port 8080) in user-space testing.

