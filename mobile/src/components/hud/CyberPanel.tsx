/**
 * HoneyShield X — CyberPanel Component
 * Angular HUD panel with subtle neon edges and restrained transparency.
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, spacing } from '../../theme';

interface CyberPanelProps {
  children: React.ReactNode;
  style?: ViewStyle;
  glowColor?: 'cyan' | 'blue' | 'purple' | 'critical' | 'none';
  variant?: 'surface' | 'elevated' | 'glass';
}

export const CyberPanel: React.FC<CyberPanelProps> = ({
  children,
  style,
  glowColor = 'none',
  variant = 'surface',
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
        return colors.critical;
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

