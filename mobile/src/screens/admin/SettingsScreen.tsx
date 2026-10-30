/**
 * HoneyShield X — Settings & Operator Configuration Screen
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Switch,
  Alert,
} from 'react-native';
import {
  Settings,
  Shield,
  Server,
  Fingerprint,
  LogOut,
  Info,
} from 'lucide-react-native';
import { colors, typography, spacing } from '../../theme';
import { HeaderBar } from '../../components/hud/HeaderBar';
import { CyberPanel } from '../../components/hud/CyberPanel';
import { CyberButton } from '../../components/common/CyberButton';
import { useAuthStore } from '../../store/authStore';
import { useBiometrics } from '../../hooks/useBiometrics';

interface SettingsScreenProps {
  navigation: any;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const {
    operator,
    logout,
    apiBaseUrl,
    setApiBaseUrl,
    isBiometricsEnabled,
    setBiometricsEnabled,
  } = useAuthStore();
  const [gatewayInput, setGatewayInput] = useState(apiBaseUrl);
  const { isSupported, isEnrolled, authenticateBiometric } = useBiometrics();

  const handleSaveGateway = () => {
    if (!gatewayInput.trim()) return;
    setApiBaseUrl(gatewayInput.trim());
    Alert.alert('Configuration Saved', `Gateway base URL updated to: ${gatewayInput.trim()}`);
  };

  const handleToggleBiometrics = async (value: boolean) => {
    if (value) {
      const verified = await authenticateBiometric('Enable Biometric Authentication for HoneyShield X');
      if (verified) {
        setBiometricsEnabled(true);
        Alert.alert('Biometrics Enabled', 'Hardware-backed biometric prompt enabled for app unlock.');
      }
    } else {
      setBiometricsEnabled(false);
    }
  };

  return (
    <View style={styles.container}>
      <HeaderBar title="SYSTEM SETTINGS" subtitle="OPERATOR CONFIGURATION" />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Operator Profile Panel */}
        <CyberPanel glowColor="cyan" style={styles.panel}>
          <View style={styles.panelHeader}>
            <Shield color={colors.cyan} size={18} />
            <Text style={styles.panelTitle}>AUTHENTICATED OPERATOR</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>OPERATOR USERNAME:</Text>
            <Text style={styles.value}>{operator?.username || 'admin_chief'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>ASSIGNED ROLE:</Text>
            <Text style={[styles.value, { color: colors.cyan }]}>
              {operator?.role.toUpperCase() || 'SECURITY_ADMINISTRATOR'}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>OPERATOR EMAIL:</Text>
            <Text style={styles.value}>{operator?.email || 'admin.chief@honeyshield.local'}</Text>
          </View>

          {/* Permissions summary */}
          <View style={styles.permSection}>
            <Text style={styles.permTitle}>AUTHORIZED PERMISSIONS ({operator?.permissions?.length || 24}):</Text>
            <View style={styles.chipsRow}>
              {(operator?.permissions || [
                'telemetry:view',
                'command:stage_containment',
                'governor:lockout',
                'deception:admin',
                'threat_intel:admin',
              ])
                .slice(0, 8)
                .map((perm, idx) => (
                  <View key={idx} style={styles.permChip}>
                    <Text style={styles.permChipText}>{perm}</Text>
                  </View>
                ))}
            </View>
          </View>
        </CyberPanel>

        {/* Security & Biometrics */}
        <CyberPanel style={styles.panel}>
          <View style={styles.panelHeader}>
            <Fingerprint color={colors.purple} size={18} />
            <Text style={[styles.panelTitle, { color: colors.purple }]}>
              BIOMETRIC SECURITY
            </Text>
          </View>

          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleLabel}>BIOMETRIC PROMPT UNLOCK</Text>
              <Text style={styles.toggleDesc}>
                Require fingerprint or face recognition for app access and Governor actions.
              </Text>
            </View>
            <Switch
              value={isBiometricsEnabled}
              onValueChange={handleToggleBiometrics}
              trackColor={{ false: colors.border, true: colors.cyan }}
              thumbColor={isBiometricsEnabled ? colors.cyan : colors.textMuted}
              disabled={!isSupported}
            />
          </View>
        </CyberPanel>

        {/* Backend Gateway Connection */}
        <CyberPanel style={styles.panel}>
          <View style={styles.panelHeader}>
            <Server color={colors.blue} size={18} />
            <Text style={[styles.panelTitle, { color: colors.blue }]}>BACKEND GATEWAY</Text>
          </View>

          <Text style={styles.inputLabel}>FASTAPI API BASE URL</Text>
          <TextInput
            style={styles.textInput}
            value={gatewayInput}
            onChangeText={setGatewayInput}
            placeholder="http://10.0.2.2:8000/api/v1"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
          />

          <CyberButton
            title="SAVE GATEWAY ENDPOINT"
            variant="outline"
            onPress={handleSaveGateway}
            style={{ marginTop: spacing.sm }}
          />
        </CyberPanel>

        {/* App Info & Sign Out */}
        <CyberPanel style={styles.panel}>
          <View style={styles.panelHeader}>
            <Info color={colors.textSecondary} size={18} />
            <Text style={styles.panelTitle}>BUILD INFORMATION</Text>
          </View>
          <Text style={styles.infoText}>Version: 1.0.0 (Release Build 2026-10)</Text>
          <Text style={styles.infoText}>Platform: Android Native (React Native 0.76 / Expo SDK 52)</Text>
          <Text style={styles.infoText}>Target: HoneyShield X Unified Architecture</Text>

          <CyberButton
            title="TERMINATE SESSION (SIGN OUT)"
            variant="danger"
            onPress={logout}
            icon={<LogOut color={colors.critical} size={16} />}
            style={{ marginTop: spacing.md }}
          />
        </CyberPanel>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  panel: {
    marginVertical: spacing.xs,
    padding: spacing.md,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  panelTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.cyan,
    letterSpacing: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  label: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
  },
  value: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  permSection: {
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.xs,
  },
  permTitle: {
    fontFamily: typography.fontFamily,
    fontSize: 9,
    color: colors.textMuted,
    marginBottom: 4,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  permChip: {
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  permChipText: {
    fontFamily: typography.fontFamily,
    fontSize: 8,
    color: colors.textCyan,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  toggleDesc: {
    fontFamily: typography.fontFamilySans,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  inputLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 10,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingHorizontal: spacing.sm,
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
    minHeight: 42,
  },
  infoText: {
    fontFamily: typography.fontFamily,
    fontSize: 10,
    color: colors.textSecondary,
    marginVertical: 2,
  },
});

