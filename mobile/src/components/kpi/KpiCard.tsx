/**
 * HoneyShield X — KpiCard Component
 * High-impact cyber HUD telemetry metric card.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CyberPanel } from '../hud/CyberPanel';
import { colors, typography, spacing } from '../../theme';

interface KpiCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  glowColor?: 'cyan' | 'blue' | 'purple' | 'critical' | 'none';
  icon?: React.ReactNode;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  subValue,
  glowColor = 'cyan',
  icon,
}) => {
  const getValueColor = () => {
    switch (glowColor) {
      case 'critical':
        return colors.critical;
      case 'purple':
        return colors.purple;
      case 'blue':
        return colors.blue;
      default:
        return colors.cyan;
    }
  };

  return (
    <CyberPanel glowColor={glowColor} style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>{label.toUpperCase()}</Text>
        {icon && <View style={styles.iconContainer}>{icon}</View>}
      </View>
      <Text style={[styles.value, { color: getValueColor() }]}>{value}</Text>
      {subValue && <Text style={styles.subValue}>{subValue}</Text>}
    </CyberPanel>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 88,
    marginHorizontal: spacing.xs,
    justifyContent: 'space-between',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  label: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    letterSpacing: 0.8,
  },
  iconContainer: {
    opacity: 0.85,
  },
  value: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    letterSpacing: 1.1,
  },
  subValue: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
});

