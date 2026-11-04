/**
 * HoneyShield X — Secure QR Device Pairing Screen (Phase 4).
 *
 * Implements single-use, 180s expiring QR device association:
 * - Scans or inputs challenge tokens (`honeyshield://pairing?challenge=...`)
 * - Submits device fingerprint & metadata claim
 * - Monitors admin approval status
 * - Provides step-up authorization for SOC administrators
 */

import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArrowLeft,
  CheckCircle,
  Copy,
  KeyRound,
  QrCode,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  XCircle,
} from 'lucide-react-native';
import { colors, spacing, typography } from '../../theme';
import { HeaderBar } from '../../components/hud/HeaderBar';
import { CyberPanel } from '../../components/hud/CyberPanel';
import { CyberButton } from '../../components/common/CyberButton';
import { pairingApi } from '../../api/pairing.api';
import { PairingStatusResponse } from '../../types';

interface QrPairingScreenProps {
  navigation: any;
  route?: any;
}

export const QrPairingScreen: React.FC<QrPairingScreenProps> = ({ navigation, route }) => {
  const [challengeId, setChallengeId] = useState<string>('');
  const [deviceFingerprint, setDeviceFingerprint] = useState<string>(
    `hsx_fp_${Platform.OS}_${Math.random().toString(36).substring(2, 10)}`
  );
  const [passphrase, setPassphrase] = useState<string>('');
  const [statusResponse, setStatusResponse] = useState<PairingStatusResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [lastMessage, setLastMessage] = useState<string>('Ready to scan or generate challenge.');
  const [pairingUri, setPairingUri] = useState<string>('');

  // Handle deep-link parameters if navigated with initial challenge
  useEffect(() => {
    if (route?.params?.challenge) {
      setChallengeId(route.params.challenge);
      handleCheckStatus(route.params.challenge);
    }
  }, [route?.params]);

  const extractChallenge = (rawInput: string): string => {
    const trimmed = rawInput.trim();
    if (trimmed.startsWith('honeyshield://pairing')) {
      const match = trimmed.match(/[?&]challenge=([^&]+)/);
      if (match && match[1]) {
        return match[1];
      }
    }
    return trimmed;
  };

  const handleGenerateChallenge = async () => {
    try {
      setActionLoading(true);
      const res = await pairingApi.createChallenge();
      setChallengeId(res.challenge_id);
      setPairingUri(res.pairing_uri);
      setLastMessage(`Challenge generated: expires in ${res.expires_in_seconds}s.`);
      await handleCheckStatus(res.challenge_id);
    } catch (e: any) {
      const msg = e?.response?.data?.detail || e.message || 'Failed to generate challenge';
      setLastMessage(`Error: ${msg}`);
      Alert.alert('Challenge Generation Failed', msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleClaimChallenge = async () => {
    const cleanId = extractChallenge(challengeId);
    if (!cleanId) {
      Alert.alert('Input Error', 'Please enter or scan a valid pairing challenge ID.');
      return;
    }

    try {
      setActionLoading(true);
      const res = await pairingApi.claimChallenge({
        challenge_id: cleanId,
        device_fingerprint: deviceFingerprint,
        platform: Platform.OS,
        metadata: {
          app_version: '1.0.0',
          model: Platform.OS === 'android' ? 'Pixel / AVD' : 'iOS Device',
          screen_density: 2.0,
        },
      });
      setLastMessage(res.message);
      await handleCheckStatus(cleanId);
      Alert.alert('Claim Submitted', res.message);
    } catch (e: any) {
      const msg = e?.response?.data?.detail || e.message || 'Claim failed';
      setLastMessage(`Error: ${msg}`);
      Alert.alert('Claim Error', msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprovePairing = async () => {
    const cleanId = extractChallenge(challengeId);
    if (!cleanId) {
      Alert.alert('Input Error', 'No active challenge ID provided.');
      return;
    }
    if (!passphrase || passphrase.length < 8) {
      Alert.alert('Validation Error', 'Admin step-up passphrase must be at least 8 characters.');
      return;
    }

    try {
      setActionLoading(true);
      const res = await pairingApi.approvePairing(cleanId, passphrase);
      setLastMessage(`Device pairing approved by ${res.approved_by}!`);
      await handleCheckStatus(cleanId);
      Alert.alert('Pairing Approved', `Device successfully authorized by ${res.approved_by}.`);
    } catch (e: any) {
      const msg = e?.response?.data?.detail || e.message || 'Approval failed';
      setLastMessage(`Error: ${msg}`);
      Alert.alert('Approval Error', msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevokePairing = async () => {
    const cleanId = extractChallenge(challengeId);
    if (!cleanId) return;

    try {
      setActionLoading(true);
      await pairingApi.revokePairing(cleanId);
      setLastMessage('Device pairing authorization revoked.');
      await handleCheckStatus(cleanId);
      Alert.alert('Revocation Complete', 'Device pairing challenge has been marked REVOKED.');
    } catch (e: any) {
      const msg = e?.response?.data?.detail || e.message || 'Revocation failed';
      setLastMessage(`Error: ${msg}`);
      Alert.alert('Revocation Error', msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckStatus = async (idToQuery?: string) => {
    const cleanId = extractChallenge(idToQuery || challengeId);
    if (!cleanId) return;

    try {
      setLoading(true);
      const res = await pairingApi.getStatus(cleanId);
      setStatusResponse(res);
      setLastMessage(`Status: ${res.status.toUpperCase()} (Expires: ${new Date(res.expires_at).toLocaleTimeString()})`);
    } catch (e: any) {
      const msg = e?.response?.data?.detail || e.message || 'Status check failed';
      setLastMessage(`Status query error: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (st?: string) => {
    switch (st) {
      case 'approved':
        return colors.optimal;
      case 'claimed':
        return colors.cyan;
      case 'pending':
        return colors.medium;
      case 'revoked':
      case 'expired':
        return colors.critical;
      default:
        return colors.textMuted;
    }
  };

  return (
    <View style={styles.container}>
      <HeaderBar
        title="SECURE QR PAIRING"
        subtitle="HARDWARE-BOUND DEVICE ENROLLMENT"
        showBack
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Visual Scanner HUD Frame */}
        <CyberPanel
          title="QR CODE SCANNER HUD"
          badge="EXP: 180s"
          badgeColor="cyan"
          style={styles.hudPanel}
        >
          <View style={styles.viewfinderContainer}>
            <View style={styles.viewfinderBox}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
              <QrCode color={colors.cyan} size={54} strokeWidth={1.5} />
              <Text style={styles.viewfinderText}>ALIGN QR PATTERN WITHIN FRAME</Text>
              <View style={styles.laserLine} />
            </View>
          </View>

          {/* Status Badge */}
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>CHALLENGE STATUS:</Text>
            <View
              style={[
                styles.statusBadge,
                { borderColor: getStatusColor(statusResponse?.status) },
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeText,
                  { color: getStatusColor(statusResponse?.status) },
                ]}
              >
                {statusResponse?.status ? statusResponse.status.toUpperCase() : 'NO CHALLENGE'}
              </Text>
            </View>
          </View>
        </CyberPanel>

        {/* Challenge Input & Claim Section */}
        <CyberPanel
          title="PAIRING CHALLENGE DETAILS"
          badge="ECDSA / TLS"
          badgeColor="blue"
          style={styles.panel}
        >
          <Text style={styles.inputLabel}>CHALLENGE TOKEN OR PAIRING URI</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.textInput}
              value={challengeId}
              onChangeText={(text) => {
                setChallengeId(text);
                const extracted = extractChallenge(text);
                if (extracted.startsWith('hsx_pair_')) {
                  handleCheckStatus(extracted);
                }
              }}
              placeholder="honeyshield://pairing?challenge=hsx_pair_... or token"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {challengeId ? (
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => setChallengeId('')}
              >
                <XCircle color={colors.textMuted} size={18} />
              </TouchableOpacity>
            ) : null}
          </View>

          <Text style={styles.inputLabel}>DEVICE HARDWARE FINGERPRINT</Text>
          <View style={styles.inputRow}>
            <Smartphone color={colors.textSecondary} size={18} />
            <TextInput
              style={[styles.textInput, { color: colors.textCyan }]}
              value={deviceFingerprint}
              onChangeText={setDeviceFingerprint}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Quick Action Buttons */}
          <View style={styles.buttonStack}>
            <CyberButton
              title="CLAIM PAIRING CHALLENGE"
              onPress={handleClaimChallenge}
              loading={actionLoading}
              icon={<ShieldCheck color={colors.cyan} size={16} />}
              style={styles.actionBtn}
            />
            <CyberButton
              title="CHECK STATUS"
              variant="outline"
              onPress={() => handleCheckStatus()}
              loading={loading}
              icon={<RefreshCw color={colors.textSecondary} size={14} />}
              style={styles.actionBtn}
            />
          </View>
        </CyberPanel>

        {/* Admin Step-Up Approval Section */}
        <CyberPanel
          title="ADMIN STEP-UP AUTHORIZATION"
          badge="TIER-3 RBAC"
          badgeColor="purple"
          style={styles.panel}
        >
          <Text style={styles.helperText}>
            For SOC Administrators verifying or approving local device associations:
          </Text>

          <Text style={styles.inputLabel}>STEP-UP VERIFICATION PASSPHRASE</Text>
          <View style={styles.inputRow}>
            <KeyRound color={colors.textSecondary} size={18} />
            <TextInput
              style={styles.textInput}
              value={passphrase}
              onChangeText={setPassphrase}
              placeholder="Admin passphrase (min 8 chars)"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
            />
          </View>

          <View style={styles.adminButtonsRow}>
            <CyberButton
              title="APPROVE PAIRING"
              variant="secondary"
              onPress={handleApprovePairing}
              loading={actionLoading}
              icon={<CheckCircle color={colors.optimal} size={16} />}
              style={{ flex: 1 }}
            />
            <CyberButton
              title="REVOKE"
              variant="danger"
              onPress={handleRevokePairing}
              loading={actionLoading}
              icon={<ShieldAlert color={colors.critical} size={16} />}
              style={{ flex: 0.8 }}
            />
          </View>

          <View style={{ marginTop: spacing.sm }}>
            <CyberButton
              title="REQUEST NEW QR CHALLENGE"
              variant="outline"
              onPress={handleGenerateChallenge}
              loading={actionLoading}
              icon={<QrCode color={colors.textSecondary} size={16} />}
            />
          </View>
        </CyberPanel>

        {/* Terminal Status Output */}
        <CyberPanel
          title="PAIRING AUDIT & TELEMETRY"
          badge="IMMUTABLE"
          badgeColor="cyan"
          style={styles.panel}
        >
          <View style={styles.terminalBox}>
            <Text style={styles.terminalPrompt}>&gt; SYSTEM_LOG:</Text>
            <Text style={styles.terminalOutput}>{lastMessage}</Text>
            {statusResponse && (
              <View style={styles.metaBox}>
                <Text style={styles.metaText}>Operator: {statusResponse.operator_username}</Text>
                <Text style={styles.metaText}>Challenge: {statusResponse.challenge_id.substring(0, 20)}...</Text>
                <Text style={styles.metaText}>Status: {statusResponse.status.toUpperCase()}</Text>
                {statusResponse.approved_by && (
                  <Text style={styles.metaText}>Approved By: {statusResponse.approved_by}</Text>
                )}
                <Text style={styles.metaText}>Expires At: {statusResponse.expires_at}</Text>
              </View>
            )}
          </View>
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
  scrollContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  hudPanel: {
    marginBottom: spacing.xs,
  },
  panel: {
    marginBottom: spacing.xs,
  },
  viewfinderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  viewfinderBox: {
    width: 220,
    height: 160,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
    borderRadius: 8,
    backgroundColor: 'rgba(10, 17, 36, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderColor: colors.cyan,
  },
  cornerTL: { top: -1, left: -1, borderTopWidth: 2, borderLeftWidth: 2 },
  cornerTR: { top: -1, right: -1, borderTopWidth: 2, borderRightWidth: 2 },
  cornerBL: { bottom: -1, left: -1, borderBottomWidth: 2, borderLeftWidth: 2 },
  cornerBR: { bottom: -1, right: -1, borderBottomWidth: 2, borderRightWidth: 2 },
  viewfinderText: {
    fontFamily: typography.fontFamily,
    fontSize: 9,
    color: colors.textCyan,
    marginTop: 8,
    letterSpacing: 0.5,
  },
  laserLine: {
    width: '90%',
    height: 1,
    backgroundColor: colors.cyan,
    position: 'absolute',
    top: '50%',
    shadowColor: colors.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statusLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontFamily: typography.fontFamily,
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
  inputLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 10,
    color: colors.textSecondary,
    marginBottom: 4,
    marginTop: spacing.xs,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    paddingHorizontal: spacing.sm,
    height: 44,
    gap: spacing.sm,
  },
  textInput: {
    flex: 1,
    fontFamily: typography.fontFamilySans,
    fontSize: typography.sizes.sm,
    color: colors.textPrimary,
  },
  iconButton: {
    padding: 4,
  },
  buttonStack: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  actionBtn: {
    width: '100%',
  },
  helperText: {
    fontFamily: typography.fontFamilySans,
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  adminButtonsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  terminalBox: {
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    padding: spacing.sm,
  },
  terminalPrompt: {
    fontFamily: typography.fontFamily,
    fontSize: 10,
    color: colors.cyan,
    marginBottom: 4,
  },
  terminalOutput: {
    fontFamily: typography.fontFamily,
    fontSize: 11,
    color: colors.textPrimary,
  },
  metaBox: {
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  metaText: {
    fontFamily: typography.fontFamily,
    fontSize: 9,
    color: colors.textMuted,
    lineHeight: 14,
  },
});
