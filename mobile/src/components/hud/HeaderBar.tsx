/**
 * HoneyShield X — HeaderBar Component
 * Command centre top navigation with cyber branding and operator status.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Shield, Radio, LogOut } from 'lucide-react-native';
import { colors, typography, spacing } from '../../theme';
import { useAuthStore } from '../../store/authStore';

interface HeaderBarProps {
  title?: string;
  subtitle?: string;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  title = 'HONEYSHIELD X',
  subtitle = 'CYBER COMMAND CENTRE',
}) => {
  const { operator, logout } = useAuthStore();

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'security_administrator':
        return 'SEC ADMIN';
      case 'incident_responder':
        return 'RESPONDER';
      case 'analyst':
        return 'ANALYST';
      default:
        return 'VIEWER';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.brandRow}>
        <View style={styles.brandGroup}>
          <Shield color={colors.cyan} size={22} strokeWidth={2.2} />
          <View style={styles.titleColumn}>
            <Text style={styles.titleText}>{title}</Text>
            <View style={styles.subtitleRow}>
              <View style={styles.activeDot} />
              <Text style={styles.subtitleText}>{subtitle}</Text>
            </View>
          </View>
        </View>

        <View style={styles.operatorGroup}>
          {operator && (
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{getRoleBadge(operator.role)}</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={logout}
            activeOpacity={0.7}
            accessibilityLabel="Sign Out"
          >
            <LogOut color={colors.textSecondary} size={18} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  brandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  titleColumn: {
    flexDirection: 'column',
  },
  titleText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.cyan,
    letterSpacing: 1.5,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.optimal,
  },
  subtitleText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    letterSpacing: 0.8,
  },
  operatorGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  roleBadge: {
    backgroundColor: 'rgba(0, 240, 255, 0.12)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.3)',
  },
  roleText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.cyan,
  },
  logoutButton: {
    padding: spacing.xs,
    borderRadius: 4,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
});

