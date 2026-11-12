/**
 * CHRONOS — Design System Tokens & Spatial System 2 Integration
 * System 1 Complete Development (Phases 2 + 3 + 4)
 */

export * from '../three/system2/System2Contract';

export const CHRONOS_TOKENS = {
  colors: {
    // Primary Triad (Mandated Palette)
    obsidian: '#0D1117',      // Primary Void Background & Deep Contrast
    antiqueGold: '#C8AA73',   // Primary Metallic Accent & Golden Ratio Trims
    warmIvory: '#F0E9DD',     // Primary High-Contrast Typography & Lume Inserts

    // Supporting Structural Tones
    surface: '#1C2730',       // Structural Mainplate, Cards, Secondary Panels
    surfaceDark: '#080B0F',   // Sub-chassis, Caseback Interior, Colophon
    surfaceElevated: '#24323D',// Active States, Hover Panels, Elevated Cards
    mutedSlate: '#AEB8BC',    // Technical Labels, Pinions, Secondary Body

    // Accent Highlights (Disciplined, Non-Excessive)
    goldHighlight: '#E6D2B0', // Specular Points
    goldShadow: '#8C6F34',    // Metallic Depth & Bevel Shadows
    rubyJewel: '#9B111E',     // Synthetic Corundum Friction-Reduction Bearings
    bluedSteel: '#1B3F7A',    // Heat-Tempered Steel Screws & Hands

    // Hairline Borders & Translucency
    borderSubtle: 'rgba(200, 170, 115, 0.15)',
    borderMedium: 'rgba(200, 170, 115, 0.32)',
    borderActive: 'rgba(200, 170, 115, 0.65)',
    borderSlate: 'rgba(174, 184, 188, 0.18)',
    glassBackground: 'rgba(28, 39, 48, 0.85)',
  },

  typography: {
    fontFamilies: {
      serif: '"Cinzel", "Times New Roman", serif',
      sans: '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      mono: '"JetBrains Mono", "Courier New", monospace',
    },
    letterSpacing: {
      tight: '-0.02em',
      normal: '0em',
      wide: '0.08em',
      wider: '0.15em',
      widest: '0.25em',
    },
  },

  spacing: {
    containerMaxWidth: '1280px',
    headerHeight: '80px',
    sceneHeightDesktop: '740px',
    sceneHeightTablet: '640px',
    sceneHeightMobile: '560px',
  },

  horologyStandards: {
    calibre: 'Calibre CH-01 Flying Tourbillon',
    frequency: '4.0 Hz (28,800 vph)',
    harmonicEquation: 'θ(t) = A · sin(ωt)',
    powerReserve: '72 Hours (Twin Barrels)',
    jewels: 34,
    balanceType: 'Free-Sprung Variable Inertia with Gold Regulating Screws',
    balanceSpring: 'Breguet Overcoil with Phillips Terminal Curve',
    escapement: 'One-Minute Flying Tourbillon Carriage',
    accuracyCertification: 'ISO 3159 Chronometer Certified (-1/+2 sec/day)',
    bipmStandard: 'Coordinated Universal Time (UTC) Atomic Optical Resonance',
    atelierLocation: 'Geneva, Switzerland (46.2044° N, 6.1432° E)',
  },
} as const;

export type ChronosColors = typeof CHRONOS_TOKENS.colors;
