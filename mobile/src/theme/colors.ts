/**
 * HoneyShield X — NEXUS Visual Design Color Tokens
 */

export const colors = {
  // Base Canvas & Panels
  background: '#030712',       // Pure dark cyber canvas
  backgroundSecondary: '#080d1a', // Deeper contrast layer
  surface: '#0b1329',          // Panel surface
  surfaceElevated: '#111c38',  // Elevated HUD card
  surfaceGlass: 'rgba(11, 19, 41, 0.75)',

  // Borders & Dividers
  border: '#172554',           // Subtle cyber navy border
  borderBright: '#1e3a8a',     // Active border
  borderGlowCyan: '#00f0ff',   // Illuminated cyan neon edge
  borderGlowBlue: '#3b82f6',   // Illuminated blue edge
  borderGlowPurple: '#8b5cf6', // Threat Intel purple edge

  // NEXUS Neon Accents
  cyan: '#00f0ff',             // Primary cyber accent
  cyanGlow: 'rgba(0, 240, 255, 0.25)',
  blue: '#3b82f6',             // Secondary telemetry blue
  blueGlow: 'rgba(59, 130, 246, 0.25)',
  purple: '#8b5cf6',           // Threat Intel purple
  purpleGlow: 'rgba(139, 92, 246, 0.25)',

  // Cyber Alert & Status Tiers
  critical: '#ef4444',         // CRITICAL / Danger
  criticalGlow: 'rgba(239, 68, 68, 0.3)',
  high: '#f97316',             // HIGH / Warning orange
  medium: '#eab308',           // MEDIUM / Caution amber
  low: '#06b6d4',              // LOW / Informational cyan
  optimal: '#10b981',          // Secure / Healthy green
  optimalGlow: 'rgba(16, 185, 129, 0.25)',

  // Text Hierarchy
  textPrimary: '#f8fafc',      // Bright HUD white
  textSecondary: '#94a3b8',    // Muted technical grey
  textMuted: '#64748b',        // Darker slate
  textCyan: '#00f0ff',         // Highlighted metric value
  textDanger: '#f87171',

  // Interactive Controls
  interactive: '#1d4ed8',
  interactiveHover: '#2563eb',
  interactiveDisabled: '#1e293b',
};

export type ThemeColors = typeof colors;

