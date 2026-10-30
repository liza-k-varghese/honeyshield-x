/**
 * HoneyShield X — Typography & HUD Styling Tokens
 */

import { Platform } from 'react-native';

export const typography = {
  fontFamily: Platform.select({
    android: 'monospace',
    ios: 'Courier',
    default: 'monospace',
  }),
  fontFamilySans: Platform.select({
    android: 'sans-serif-medium',
    ios: 'System',
    default: 'sans-serif',
  }),
  sizes: {
    xs: 10,
    sm: 12,
    base: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    hudTitle: 28,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    heavy: '800' as const,
  },
};

