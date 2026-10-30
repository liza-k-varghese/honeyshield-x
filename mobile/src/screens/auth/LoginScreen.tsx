/**
 * HoneyShield X — Mobile Operator Login Screen
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Shield, Lock, User, Server, Fingerprint, AlertTriangle } from 'lucide-react-native';
import { colors, typography, spacing } from '../../theme';
import { CyberPanel } from '../../components/hud/CyberPanel';
import { CyberButton } from '../../components/common/CyberButton';
import { authApi } from '../../api/auth.api';
import { useAuthStore } from '../../store/authStore';
import { useBiometrics } from '../../hooks/useBiometrics';

interface LoginScreenProps {
  navigation: any;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const [username, setUsername] = useState('admin_chief');
  const [password, setPassword] = useState('AdminPass123!');
  const [loading, setLoading] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  const { setAuth, apiBaseUrl, setApiBaseUrl } = useAuthStore();
  const [customUrl, setCustomUrl] = useState(apiBaseUrl);
  const { isSupported, isEnrolled, authenticateBiometric } = useBiometrics();

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Validation Error', 'Please enter operator username and password.');
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.login(username.trim(), password);
      await setAuth(response.access_token, response.operator);
    } catch (err: any) {
      const message =
        err?.response?.data?.detail ||
        err?.message ||
        'Authentication failed. Check backend connectivity or credentials.';
      Alert.alert('Authentication Failed', message);
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    const success = await authenticateBiometric('Biometric unlock for HoneyShield X SOC');
    if (success) {
      // Authenticate with default chief administrator profile for demonstration
      handleQuickSelect('admin_chief', 'AdminPass123!');
    }
  };

  const handleQuickSelect = (user: string, pass: string) => {
    setUsername(user);
    setPassword(pass);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Brand Header */}
        <View style={styles.brandHeader}>
          <Shield color={colors.cyan} size={48} strokeWidth={2} />
          <Text style={styles.brandTitle}>HONEYSHIELD X</Text>
          <Text style={styles.brandSubtitle}>DEFENSIVE AI COMMAND CLIENT</Text>
        </View>

        {/* Login Panel */}
        <CyberPanel glowColor="cyan" style={styles.loginCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>OPERATOR AUTHENTICATION</Text>
            <View style={styles.securityPill}>
              <Text style={styles.securityText}>AES-256 PBKDF2</Text>
            </View>
          </View>

          {/* Username Input */}
          <Text style={styles.inputLabel}>OPERATOR ID / USERNAME</Text>
          <View style={styles.inputRow}>
            <User color={colors.textSecondary} size={18} />
            <TextInput
              style={styles.textInput}
              value={username}
              onChangeText={setUsername}
              placeholder="operator_id"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Password Input */}
          <Text style={styles.inputLabel}>AUTHENTICATION KEY / PASSWORD</Text>
          <View style={styles.inputRow}>
            <Lock color={colors.textSecondary} size={18} />
            <TextInput
              style={styles.textInput}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••••••"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
            />
          </View>

          {/* Login Button */}
          <CyberButton
            title="AUTHENTICATE SESSION"
            onPress={handleLogin}
            loading={loading}
            style={styles.loginButton}
          />

          {/* Biometric Unlock Option */}
          {isSupported && isEnrolled && (
            <CyberButton
              title="BIOMETRIC QUICK UNLOCK"
              variant="secondary"
              onPress={handleBiometricLogin}
              icon={<Fingerprint color={colors.blue} size={18} />}
              style={styles.bioButton}
            />
          )}

          {/* Quick Persona Selector */}
          <View style={styles.presetsContainer}>
            <Text style={styles.presetsLabel}>QUICK DEMO PERSONAS:</Text>
            <View style={styles.presetButtonsRow}>
              <TouchableOpacity
                style={styles.presetChip}
                onPress={() => handleQuickSelect('admin_chief', 'AdminPass123!')}
              >
                <Text style={styles.presetChipText}>SEC ADMIN</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.presetChip}
                onPress={() => handleQuickSelect('responder_alex', 'ResponderPass123!')}
              >
                <Text style={styles.presetChipText}>RESPONDER</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.presetChip}
                onPress={() => handleQuickSelect('analyst_sarah', 'AnalystPass123!')}
              >
                <Text style={styles.presetChipText}>ANALYST</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.presetChip}
                onPress={() => handleQuickSelect('viewer_dan', 'ViewerPass123!')}
              >
                <Text style={styles.presetChipText}>VIEWER</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Backend Gateway Config Toggle */}
          <TouchableOpacity
            style={styles.configToggle}
            onPress={() => setShowConfig(!showConfig)}
          >
            <Server color={colors.textMuted} size={14} />
            <Text style={styles.configToggleText}>
              {showConfig ? 'HIDE GATEWAY CONFIG' : 'CONFIGURE BACKEND GATEWAY'}
            </Text>
          </TouchableOpacity>

          {showConfig && (
            <View style={styles.configSection}>
              <Text style={styles.inputLabel}>BACKEND API BASE URL</Text>
              <TextInput
                style={styles.configInput}
                value={customUrl}
                onChangeText={setCustomUrl}
                placeholder="http://10.0.2.2:8000/api/v1"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
              />
              <CyberButton
                title="SAVE GATEWAY URL"
                variant="outline"
                onPress={() => {
                  setApiBaseUrl(customUrl);
                  Alert.alert('Configuration Saved', `Gateway endpoint updated to: ${customUrl}`);
                }}
                style={{ marginTop: spacing.xs }}
              />
            </View>
          )}
        </CyberPanel>

        {/* Emergency Break-Glass Link */}
        <TouchableOpacity
          style={styles.breakGlassRow}
          onPress={() => navigation.navigate('BreakGlass')}
        >
          <AlertTriangle color={colors.critical} size={16} />
          <Text style={styles.breakGlassText}>EMERGENCY BREAK-GLASS ELEVATION</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.md,
    justifyContent: 'center',
    minHeight: '100%',
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    marginTop: spacing.xl,
  },
  brandTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.hudTitle,
    fontWeight: typography.weights.bold,
    color: colors.cyan,
    letterSpacing: 2,
    marginTop: spacing.sm,
  },
  brandSubtitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    letterSpacing: 1.2,
    marginTop: 4,
  },
  loginCard: {
    padding: spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    letterSpacing: 1.1,
  },
  securityPill: {
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
    borderColor: 'rgba(0, 240, 255, 0.3)',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  securityText: {
    fontFamily: typography.fontFamily,
    fontSize: 9,
    color: colors.cyan,
  },
  inputLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginBottom: 4,
    marginTop: spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingHorizontal: spacing.sm,
    gap: spacing.sm,
  },
  textInput: {
    flex: 1,
    minHeight: 46,
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.base,
  },
  loginButton: {
    marginTop: spacing.lg,
  },
  bioButton: {
    marginTop: spacing.sm,
  },
  presetsContainer: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  presetsLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 10,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  presetButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  presetChip: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 4,
  },
  presetChipText: {
    fontFamily: typography.fontFamily,
    fontSize: 10,
    color: colors.cyan,
    fontWeight: typography.weights.semibold,
  },
  configToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.lg,
    paddingVertical: 6,
  },
  configToggleText: {
    fontFamily: typography.fontFamily,
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 0.8,
  },
  configSection: {
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
  },
  configInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingHorizontal: spacing.sm,
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
    minHeight: 40,
    marginBottom: spacing.xs,
  },
  breakGlassRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  breakGlassText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
    color: colors.critical,
    letterSpacing: 1,
    fontWeight: typography.weights.bold,
  },
});

