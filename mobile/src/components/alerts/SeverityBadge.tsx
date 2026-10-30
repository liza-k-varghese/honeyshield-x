/**
 * HoneyShield X — SeverityBadge Component
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AlertSeverity } from '../../types';
import { colors, typography, spacing } from '../../theme';

interface SeverityBadgeProps {
  severity: AlertSeverity | string;
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity }) => {
  const normalized = (severity || 'LOW').toUpperCase();

  const getColors = () => {
    switch (normalized) {
      case 'CRITICAL':
        return { bg: 'rgba(239, 68, 68, 0.18)', border: colors.critical, text: colors.critical };
      case 'HIGH':
        return { bg: 'rgba(249, 115, 22, 0.18)', border: colors.high, text: colors.high };
      case 'MEDIUM':
        return { bg: 'rgba(234, 179, 8, 0.18)', border: colors.medium, text: colors.medium };
      default:
        return { bg: 'rgba(6, 182, 212, 0.18)', border: colors.low, text: colors.low };
    }
  };

  const scheme = getColors();

  return (
    <View style={[styles.badge, { backgroundColor: scheme.bg, borderColor: scheme.border }]}>
      <Text style={[styles.text, { color: scheme.text }]}>{normalized}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    letterSpacing: 0.5,
  },
});

