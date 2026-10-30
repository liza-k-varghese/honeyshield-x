/**
 * HoneyShield X — BreakGlassScreen Component
 * Controlled emergency privilege elevation protocol.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { AlertTriangle, ShieldOff, KeyRound } from 'lucide-react-native';
import { colors, typography, spacing } from '../../theme';
import { CyberPanel } from '../../components/hud/CyberPanel';
import { CyberButton } from '../../components/common/CyberButton';
import { authApi } from '../../api/auth.api';
import { useAuthStore } from '../../store/authStore';

interface BreakGlassScreenProps {
  navigation: any;
}

export const BreakGlassScreen: React.FC<BreakGlassScreenProps> = ({ navigation }) => {
  const [username, setUsername] = useState('admin_chief');
  const [password, setPassword] = useState('');
  const [justification, setJustification] = useState('');
  const [loading, setLoading] = useState(false);

  const { setAuth } = useAuthStore();

  const handleExecuteBreakGlass = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Validation Error', 'Operator credentials are required.');
      return;
    }

    if (!justification.trim() || justification.trim().length < 15) {
      Alert.alert(
        'Audit Mandate Violation',
        'Break-glass protocol requires a thorough justification of at least 15 characters.'
      );
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.breakGlass({
        username: username.trim(),
        password,
        justification: justification.trim(),
      });

      if (response.success) {
        Alert.alert(
          'EMERGENCY PRIVILEGE ELEVATED',
          `Break-glass protocol activated. Maximum duration: ${Math.round(
            response.session_expires_in / 60
          )} minutes. All actions are logged to the tamper-evident audit ledger.`,
          [
            {
              text: 'PROCEED TO SOC',
              onPress: async () => {
                // Fetch me profile or set admin
                const me = await authApi.getMe();
                await setAuth('break_glass_session', me);
              },
            },
          ]
        );
      }
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Break-glass elevation rejected.';
      Alert.alert('Elevation Denied', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.warningBanner}>
        <AlertTriangle color={colors.critical} size={32} />
        <Text style={styles.warningTitle}>CRITICAL EMERGENCY ACCESS</Text>
        <Text style={styles.warningSub}>
          PROTOCOL AUTHORIZATION REQUIRES IMMUTABLE AUDIT JUSTIFICATION
        </Text>
      </View>

      <CyberPanel glowColor="critical" style={styles.panel}>
        <View style={styles.sectionRow}>
          <ShieldOff color={colors.critical} size={20} />
          <Text style={styles.panelTitle}>BREAK-GLASS DECLARATION</Text>
        </View>

        <Text style={styles.infoText}>
          Break-glass grants temporary unconditional administrative override for 30 minutes.
          This event triggers immediate alerts across all configured webhooks and generates
          an uneditable audit checkpoint.
        </Text>

        <Text style={styles.inputLabel}>AUTHORIZED OPERATOR USERNAME</Text>
        <TextInput
          style={styles.textInput}
          value={username}
          onChangeText={setUsername}
          placeholder="admin_chief"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
        />

        <Text style={styles.inputLabel}>OPERATOR PASSWORD / MASTER KEY</Text>
        <TextInput
          style={styles.textInput}
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••••••"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
        />

        <Text style={styles.inputLabel}>MANDATORY INCIDENT JUSTIFICATION</Text>
        <TextInput
          style={[styles.textInput, styles.textArea]}
          value={justification}
          onChangeText={setJustification}
          placeholder="Detailed operational justification (e.g., Active ransomware incident P1 requiring immediate host containment)..."
          placeholderTextColor={colors.textMuted}
          multiline
          numberOfLines={4}
        />

        <CyberButton
          title="INVOKE BREAK-GLASS"
          variant="danger"
          onPress={handleExecuteBreakGlass}
          loading={loading}
          icon={<KeyRound color={colors.critical} size={18} />}
          style={{ marginTop: spacing.lg }}
        />

        <CyberButton
          title="ABORT & RETURN TO LOGIN"
          variant="outline"
          onPress={() => navigation.goBack()}
          disabled={loading}
          style={{ marginTop: spacing.sm }}
        />
      </CyberPanel>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingTop: spacing.xxl,
  },
  warningBanner: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    padding: spacing.md,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.critical,
  },
  warningTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.critical,
    letterSpacing: 1.5,
    marginTop: spacing.sm,
  },
  warningSub: {
    fontFamily: typography.fontFamily,
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  panel: {
    padding: spacing.lg,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  panelTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.critical,
    letterSpacing: 1.1,
  },
  infoText: {
    fontFamily: typography.fontFamilySans,
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginBottom: 4,
    marginTop: spacing.sm,
  },
  textInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.base,
    padding: spacing.sm,
    minHeight: 46,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
});

