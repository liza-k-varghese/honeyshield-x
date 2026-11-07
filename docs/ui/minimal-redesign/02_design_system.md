# HONEYSHIELD X — MILESTONE 20
## 02: MINIMAL PREMIUM DESIGN SYSTEM SPECIFICATION

**Document:** `docs/ui/minimal-redesign/02_design_system.md`  
**Classification:** Visual Design System & Frontend Tokens  
**Author:** Principal Spatial UI Designer & Frontend Performance Architect  
**Status:** Approved & Enforced  

---

### 1. Design Philosophy

The HoneyShield X Minimal Design System is anchored upon three fundamental tenets:
1. **Clarity Over Complexity:** Eliminate decorative visual noise (excessive neon glows, competing border gradients, and redundant badges) in favor of high-contrast, purposeful data display.
2. **Functionality Over Decoration:** Every visual element must convey authentic operational status or provide an immediate operator action.
3. **Calm Over Visual Noise:** Use a deep, neutral dark palette that reduces eye strain during 12-hour SOC shifts, reserving vibrant accent hues strictly for critical severity and live telemetry.

---

### 2. Color Palette & Semantics

#### 2.1 Backgrounds & Surfaces
- **Canvas Root:** `#060913` (Ultra-deep slate black; neutral baseline)
- **Primary Surface / Cards:** `rgba(15, 23, 42, 0.70)` (`slate-900/70`) with subtle backdrop blur
- **Secondary Surface / Header:** `#0B1020` (`slate-900/95`) with `border-slate-800/80`
- **Elevated Modals / Drawers:** `#0B1020` with `border-slate-800` and high-elevation shadow

#### 2.2 Functional & Status Colors
| Role | Tailwind Token | Hex / Fallback | Semantic Application |
| :--- | :--- | :--- | :--- |
| **Critical Severity** | `text-red-400`, `bg-red-500/20`, `border-red-500/40` | `#F87171` | Uncontained intrusions, brute force, critical alerts |
| **High Severity** | `text-amber-400`, `bg-amber-500/20`, `border-amber-500/40` | `#FBBF24` | Exploits, suspicious scans, degraded service health |
| **Operational / Safe** | `text-emerald-400`, `bg-emerald-500/20`, `border-emerald-500/40`| `#34D399` | 3/3 systems online, active sensors, zero critical alerts |
| **Primary Telemetry** | `text-cyan-400`, `bg-cyan-500/20`, `border-cyan-500/40` | `#22D3EE` | WebSocket streaming, quick search, brand highlights |
| **Deep Investigation** | `text-purple-400`, `bg-purple-500/20`, `border-purple-500/40` | `#C084FC` | Threat intelligence, STIX campaigns, admin permissions |
| **Neutral Muted** | `text-slate-400`, `text-slate-500`, `border-slate-800` | `#94A3B8` | Metadata, timestamps, table column headers, borders |

---

### 3. Typography Scale

The interface employs a dual-typeface typographic system:
- **Primary Sans-Serif (`font-sans`):** Clean, geometric sans-serif for executive headings, titles, and body prose.
- **Telemetry Monospace (`font-mono`):** High-legibility monospaced typeface for IP addresses, IOC hashes, event IDs, status pills, and numeric telemetry counters.

| Level | Size / Leading | Weight | Font Family | Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Display Title (H1)** | `24px` (`text-2xl`, leading `32px`) | Bold (700) | Sans | Security Overview page title |
| **Section Header (H2)** | `14px` (`text-sm`, uppercase, tracking-wider) | Semibold (600) | Mono | "PRIORITY ALERTS", "LIVE ACTIVITY", "SYSTEMS OVERVIEW" |
| **Card Header (H3)** | `16px` (`text-base`) | Semibold (600) | Sans | System title ("Security Operations", "Deception & Honeypots") |
| **Metric Large Counter**| `30px` (`text-3xl`) | Bold (700) | Sans | 4 Essential metric card numbers |
| **Table & Body Text** | `12px` (`text-xs`, leading `16px`) | Regular / Medium (400/500) | Sans | Alert messages, descriptions, helper text |
| **Metadata & Badges** | `10px` - `11px` (`text-[10px]`, `text-[11px]`) | Medium / Bold | Mono | Timestamps, severity pills, port numbers, status pills |

---

### 4. Elevation, Spacing & Container Layout

- **Base Spacing Grid:** 4px baseline (`p-1`, `p-2`, `p-3`, `p-4`, `p-6`).
- **Standard Card Radius:** `rounded-xl` (12px) for cards, `rounded-lg` (8px) for buttons and inputs.
- **Borders:** Thin, crisp 1px borders (`border border-slate-800/80`) preventing visual clutter while maintaining spatial separation.
- **Maximum Content Width:** `max-w-7xl` (1280px), centered with `mx-auto` and generous horizontal padding (`px-3 sm:px-6`).

---

### 5. Interactive States & Micro-interactions

- **Button Hover:** Smooth background tint transitions (`transition-colors duration-150`), elevating subtle borders on hover without layout reflows.
- **Table Row Hover:** Row highlighting (`hover:bg-slate-800/40`) with single-click investigation activation.
- **Loading Indicators:** Gentle opacity pulsing (`animate-pulse`) instead of jarring placeholder texts, preserving visual layout stability while data hydrates.
- **Motion Reduction:** Fully integrated with `usePrefersReducedMotion` in `CyberMotion.tsx` to automatically disable transitions for sensitive operators.

