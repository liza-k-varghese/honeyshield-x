# HoneyShield X — Milestone 19.4: Cinematic Camera & Keyboard Interactions
## Gate C & D: Spatial Camera Navigation & Input Isolation

**Implementation:** `frontend/src/components/UniverseCommandCenter.tsx`  
**Camera Modes:** Global Observatory, 4 Agent Quadrants, Event Singularity  
**Input Isolation:** Strict exclusion of form controls and text inputs  

---

### 1. Cinematic Camera Preset Mapping

The spatial camera utilizes CSS hardware-accelerated transforms (`translate3d` and `scale3d`) to zoom and focus across the cosmic plane:

| Key | Camera Preset | Target Coordinates & Scale | Operational Purpose |
| :---: | :--- | :--- | :--- |
| **`0`** | Global Overview | `scale: 1.0, translate: (0, 0)` | High-level situational awareness across all 4 territories |
| **`1`** | SCOUT Territory | `scale: 1.45, focus: Top-Left` | Sensor grid ingestion, honeypot collection, rate metrics |
| **`2`** | NEXUS Territory | `scale: 1.45, focus: Top-Right` | Redis queue, PostgreSQL outbox, normalization pipeline |
| **`3`** | ORACLE Territory | `scale: 1.45, focus: Bottom-Left` | Threat intelligence lab, STIX/TAXII indicator matches |
| **`4`** | SENTINEL Territory| `scale: 1.45, focus: Bottom-Right`| SOC containment triage, mobile alert push dispatch |
| **`C` / `5`**| Event Singularity | `scale: 1.6, focus: Center` | Core diagnostics, outbox replay ledger, audit metrics |
| **`G` / `?`**| Showcase Guide | Overlay Modal | Interactive operator tour & shortcut reference |
| **`D`** | Demo Toggle | Global State | Toggles synthetic 4-agent demonstration |
| **`R`** | Replay Trigger | Single Replay Run | Traces recorded historical event through all quadrants |
| **`Space`**| Locomotion Engine | Engine Toggle | Pauses / resumes active courier locomotion |
| **`Escape`**| Modal / Camera Reset | Hierarchical Close | Priority 1: Showcase Guide $\to$ Priority 2: Diagnostics $\to$ Priority 3: Overview (`0`) |

---

### 2. Input Isolation & Safety Guards

To prevent accidental command triggers when typing into search bars, filter inputs, or chat forms:
- An input element filter inspects `e.target`:
  ```ts
  if (
    target && (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable ||
      target.getAttribute('role') === 'textbox' ||
      target.closest('input, textarea, [contenteditable="true"]')
    )
  ) {
    return; // Bypass hotkeys
  }
  ```
- Hotkeys are completely disabled whenever an operator is typing.
- Global shortcuts never intercept text cursor movement or spacebar insertion.

