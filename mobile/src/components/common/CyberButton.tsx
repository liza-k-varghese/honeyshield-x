/**
 * HoneyShield X — CyberButton Component
 * High-tactility touch button with cyber glow and accessible minimum target sizing.
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { colors, typography, spacing } from '../../theme';

interface CyberButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const CyberButton: React.FC<CyberButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  icon,
  style,
  textStyle,
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'secondary':
        return {
          bg: colors.surfaceElevated,
          border: colors.blue,
          text: colors.blue,
        };
      case 'danger':
        return {
          bg: 'rgba(239, 68, 68, 0.2)',
          border: colors.critical,
          text: colors.critical,
        };
      case 'outline':
        return {
          bg: 'transparent',
          border: colors.border,
          text: colors.textSecondary,
        };
      default: // primary
        return {
          bg: 'rgba(0, 240, 255, 0.15)',
          border: colors.cyan,
          text: colors.cyan,
        };
    }
  };

  const scheme = getVariantStyles();

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: scheme.bg,
          borderColor: scheme.border,
        },
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.75}
    >
      {loading ? (
        <ActivityIndicator color={scheme.text} size="small" />
      ) : (
        <>
          {icon}
          <Text style={[styles.text, { color: scheme.text }, textStyle]}>
            {title.toUpperCase()}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    minHeight: spacing.minTouchTarget,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    letterSpacing: 1.2,
  },
});

