# HoneyShield X — Digital Agent Universe
## Milestone 3 NEXUS Contextual Assistant Grounding & Security

### 1. Architectural Mission
The NEXUS Contextual Assistant is a deterministic, backend-grounded operator copilot for the HoneyShield X platform. It eliminates hallucinated operational status by deriving all answers directly from authorized PostgreSQL event outbox records, active in-flight transfer queues, and live agent runtime statuses.

---

### 2. Supported Canonical Operator Queries

| Query Pattern | Grounded Source | Response Behavior |
| :--- | :--- | :--- |
| **"What are you currently processing?"** | `activePackets` queue | Returns count and specific breakdown of in-flight event IDs, source $\to$ destination nodes, and completion percentages. If queue is empty, reports quiescent state honestly. |
| **"Where is this event going?"** | `activePackets[0]` | Details current journey: carrier agent, source node, destination node, and progress percentage. |
| **"Why is this transfer waiting?"** | `activePackets.filter(status === 'waiting')` | Explains whether transfers are awaiting PostgreSQL outbox commit or downstream worker acknowledgment. |
| **"Which transfers have failed?"** | `failedPackets` ledger | Lists failed event IDs with exact recorded `failure_reason` strings and confirms preservation in dead-letter storage. |
| **"Show the latest completed transfer."** | `completedPackets[-1]` | Reports latest committed event ID, timestamp, carrier agent, and source IP address. |
| **"What happened to attack #X?"** | `activePackets` / `completedPackets` / Outbox | Summarizes attack progression from honeypot capture through IOC enrichment to alert dispatch. |
| **"Which agent processed this event?"** | `runtimeAgentStates` | Outlines the 4-agent division of responsibility and current operational state of each avatar. |
| **"Has the alert been delivered?"** | Push dispatcher & completed alert records | Confirms alert dispatch status and mobile carrier delivery within 180s pairing window. |
| **"What is the current queue depth?"** | Real-time queue metrics | Reports in-flight transfers, Redis stream depth, and average processing latency (<15ms). |

---

### 3. Record Linking & Deep Dive
When query answers reference specific attacker IP addresses or attack events, NEXUS provides one-click deep-dive action buttons (e.g. `Investigate 203.0.113.195`), seamlessly transitioning the operator to the full SOC investigation view without losing operational context.

---

### 4. Containment Execution Safety Guardrail
Under HoneyShield X safety protocols, automated containment actions (such as IP blocking, process termination, network isolation, or emergency kill switches) are **strictly forbidden** from conversational execution.

If an operator requests containment through the assistant:
> **SECURITY NOTICE:** Automated containment execution is prohibited through this conversational interface. Under HoneyShield X safety protocol, Level-3 emergency containment requires authenticated step-up approval in the Governor Emergency Console.

