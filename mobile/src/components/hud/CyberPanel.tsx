/**
 * HoneyShield X — CyberPanel Component
 * Angular HUD panel with subtle neon edges and restrained transparency.
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, spacing, typography } from '../../theme';

export interface CyberPanelProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  glowColor?: 'cyan' | 'blue' | 'purple' | 'critical' | 'optimal' | 'red' | 'none';
  variant?: 'surface' | 'elevated' | 'glass';
  title?: string;
  badge?: string;
  badgeColor?: string;
}

export const CyberPanel: React.FC<CyberPanelProps> = ({
  children,
  style,
  glowColor = 'none',
  variant = 'surface',
  title,
  badge,
  badgeColor = 'cyan',
}) => {
  const getBorderColor = () => {
    switch (glowColor) {
      case 'cyan':
        return colors.borderGlowCyan;
      case 'blue':
        return colors.borderGlowBlue;
      case 'purple':
        return colors.borderGlowPurple;
      case 'critical':
      case 'red':
        return colors.critical;
      case 'optimal':
        return colors.optimal;
      default:
        return colors.border;
    }
  };

  const getBackgroundColor = () => {
    switch (variant) {
      case 'elevated':
        return colors.surfaceElevated;
      case 'glass':
        return colors.surfaceGlass;
      default:
        return colors.surface;
    }
  };

  return (
    <View
      style={[
        styles.panel,
        {
          borderColor: getBorderColor(),
          backgroundColor: getBackgroundColor(),
        },
        glowColor !== 'none' && styles.glow,
        style,
      ]}
    >
      {/* Visual cyber corner bracket highlight */}
      <View style={[styles.cornerBracket, { borderColor: getBorderColor() }]} />

      {(title || badge) && (
        <View style={styles.headerRow}>
          {title ? <Text style={styles.headerTitle}>{title}</Text> : <View />}
          {badge ? (
            <View
              style={[
                styles.badge,
                badgeColor === 'red' || badgeColor === 'critical'
                  ? styles.badgeDanger
                  : styles.badgeCyan,
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  badgeColor === 'red' || badgeColor === 'critical'
                    ? { color: colors.critical }
                    : { color: colors.cyan },
                ]}
              >
                {badge}
              </Text>
            </View>
          ) : null}
        </View>
      )}

      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  panel: {
    borderRadius: 8,
    borderWidth: 1,
    padding: spacing.md,
    marginVertical: spacing.xs,
    position: 'relative',
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    letterSpacing: 1.2,
  },
  badge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  badgeCyan: {
    borderColor: colors.cyan,
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
  },
  badgeDanger: {
    borderColor: colors.critical,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  badgeText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    letterSpacing: 0.8,
  },
  glow: {
    shadowColor: colors.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  cornerBracket: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderTopWidth: 2,
    borderRightWidth: 2,
  },
});
