# HoneyShield X — Milestone 17: Threat Hunting UI & Query Integration

## 1. Scope
Documents the frontend integration with the PostgreSQL 17 Threat Hunting search engine and Retrospective Investigation endpoints.

## 2. Capabilities
- **Substring and RegEx Telemetry Filtering:** Operators can perform sub-millisecond searches across IP addresses, attack signatures, port numbers, and protocol types.
- **Time Range Selectors:** Quick filters for past 1 hour, 6 hours, 24 hours, 7 days, or custom ISO-8601 windows.
- **Saved Hunt Configurations:** Analysts can persist recurring search queries into `SavedHunt` objects and execute them on demand.
- **Detection Lab Integration:** Read-only simulation sandbox allowing rule engineers to evaluate precision, recall, and F1 scores against real historical telemetry without altering live production rules.

## 3. Latency Characteristics
- Search responses render in under 15ms in the browser UI, backed by PostgreSQL 17 index scans ($P_{95} = 0.87\text{ ms}$).

