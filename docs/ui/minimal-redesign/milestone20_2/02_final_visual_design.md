# HONEYSHIELD X — MILESTONE 20.2 DESIGN REPORT
## 02: FINAL VISUAL DESIGN & PREMIUM PALETTE SPECIFICATION

**Document Version:** 1.0.0-rc5  
**Audit Date:** 2026-11-07  
**Module:** HoneyShield X Design System 2.0  
**Design Standard:** Minimalist Dark SOC Console, Zero Decorative Noise  

---

### 1. Unified Color Palette Specification

Milestone 20.2 standardizes the entire dark-mode interface on an authoritative hex palette:

| Token Name | Hex Code | Tailwind Equivalent | Purpose & Usage |
|---|---|---|---|
| **Main Background** | `#0B1020` | `bg-[#0B1020]` | Root viewport background, canvas backdrop, modal overlay bases. |
| **Main Surface** | `#111827` | `bg-[#111827]` | Primary card surfaces, metric containers, table containers. |
| **Elevated Surface** | `#172033` | `bg-[#172033]` | Hover states, elevated modal bodies, FTUX guidance cards. |
| **Primary Text** | `#F8FAFC` | `text-slate-100` / `text-white` | Page titles, primary numbers, alert headlines, modal headers. |
| **Secondary Text** | `#94A3B8` | `text-slate-400` | Subtitles, helper text, table column headers, timestamps. |
| **Primary Accent** | `#22D3EE` | `text-cyan-400` / `border-cyan-500` | Interactive focus rings, primary action buttons, active navigation. |
| **Success Accent** | `#10B981` | `text-emerald-400` / `bg-emerald-500` | Operational status indicators, resolved states, healthy telemetry. |
| **Warning Accent** | `#F59E0B` | `text-amber-400` / `bg-amber-500` | High severity alerts, degraded sensor warnings, unconfigured daemons. |
| **Critical Accent** | `#EF4444` | `text-rose-400` / `bg-rose-500` | Critical severity incidents, failed telemetry, emergency break-glass. |
| **Subtle Border** | `#263449` | `border-[#263449]` | Structural grid dividers, card outlines, table row dividers. |

---

### 2. Component Micro-Design Standards

1. **Buttons & Controls:**
   - Primary: `bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold px-4 py-2 rounded-lg font-mono text-xs`.
   - Secondary: `bg-[#111827] hover:bg-[#172033] text-slate-300 hover:text-white border border-[#263449] rounded-lg px-3 py-1.5 text-xs font-mono`.
   - Deep-Link Action: `bg-slate-800 hover:bg-cyan-600 text-cyan-300 hover:text-white border border-slate-700 hover:border-cyan-500 px-2.5 py-1 rounded text-[11px] font-mono`.

2. **Cards & Containers:**
   - Background `#111827`, border `#263449`, border radius `rounded-xl` (12px), smooth transition `transition-colors duration-200`.

3. **Status Indicators:**
   - Status dots are strictly 8px (`w-2 h-2 rounded-full`), animated with `animate-pulse` only for real-time live telemetry feeds.

