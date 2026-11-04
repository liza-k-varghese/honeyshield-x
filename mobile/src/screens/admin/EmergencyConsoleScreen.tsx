/**
 * HoneyShield X — Governor Level-3 Emergency Operations Console (Phase 4).
 *
 * Dedicated Android HUD for high-stakes defensive containment:
 * - CONTAIN_HOST: Dry-run network isolation
 * - RELEASE_CONTAINMENT: Restore normal networking
 * - BLOCK_IP: Boundary firewall drop
 * - RESTART_CRITICAL_SERVICE: Supervised RPC restart
 *
 * Safety Constraints:
 * - Mandatory operational justification (min 15 chars)
 * - Step-up passphrase validation
 * - Dry-run safety adapters
 * - Idempotency key tracking
 * - Real-time audit recording
 */

import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  AlertOctagon,
  AlertTriangle,
  Ban,
  CheckCircle,
  Clock,
  KeyRound,
  Lock,
  Radio,
  RefreshCw,
  Server,
  Shield,
  ShieldAlert,
  Terminal,
  Unlock,
  Zap,
} from 'lucide-react-native';
import { colors, spacing, typography } from '../../theme';
import { HeaderBar } from '../../components/hud/HeaderBar';
import { CyberPanel } from '../../components/hud/CyberPanel';
import { CyberButton } from '../../components/common/CyberButton';
import { emergencyApi } from '../../api/emergency.api';
import {
  EmergencyActionType,
  EmergencyExecuteResponse,
  EmergencyStatusResponse,
} from '../../types';

interface EmergencyConsoleScreenProps {
  navigation: any;
}

export const EmergencyConsoleScreen: React.FC<EmergencyConsoleScreenProps> = ({ navigation }) => {
  const [selectedAction, setSelectedAction] = useState<EmergencyActionType>('CONTAIN_HOST');
  const [target, setTarget] = useState<string>('srv-dmz-honeypot-01');
  const [justification, setJustification] = useState<string>(
    'Emergency SOC isolation triggered due to active multi-stage honeypot intrusion.'
  );
  const [passphrase, setPassphrase] = useState<string>('');
  const [dryRun, setDryRun] = useState<boolean>(true);

  const [loading, setLoading] = useState<boolean>(false);
  const [executing, setExecuting] = useState<boolean>(false);
  const [statusData, setStatusData] = useState<EmergencyStatusResponse | null>(null);
  const [lastExecution, setLastExecution] = useState<EmergencyExecuteResponse | null>(null);
  const [confirmModalVisible, setConfirmModalVisible] = useState<boolean>(false);

  useEffect(() => {
    loadEmergencyStatus();
  }, []);

  const loadEmergencyStatus = async () => {
    try {
      setLoading(true);
      const res = await emergencyApi.getStatus();
      setStatusData(res);
    } catch (e: any) {
      console.warn('Failed to load emergency status:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleActionSelect = (act: EmergencyActionType) => {
    setSelectedAction(act);
    if (act === 'BLOCK_IP') {
      setTarget('198.51.100.45');
    } else if (act === 'RESTART_CRITICAL_SERVICE') {
      setTarget('fastapi');
    } else {
      setTarget('srv-dmz-honeypot-01');
    }
  };

  const validateAndPromptConfirm = () => {
    if (!target.trim()) {
      Alert.alert('Validation Error', 'Target identifier or IP address is required.');
      return;
    }
    if (justification.trim().length < 15) {
      Alert.alert(
        'Mandatory Justification',
        `Operational justification is too short (${justification.trim().length}/15 chars minimum).`
      );
      return;
    }
    if (passphrase.trim().length < 8) {
      Alert.alert(
        'Step-Up Verification',
        'Operator step-up confirmation passphrase must be at least 8 characters.'
      );
      return;
    }

    setConfirmModalVisible(true);
  };

  const executeActionConfirmed = async () => {
    setConfirmModalVisible(false);
    const idempotencyKey = `idem_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    try {
      setExecuting(true);
      const res = await emergencyApi.execute(
        {
          action: selectedAction,
          target: target.trim(),
          justification: justification.trim(),
          passphrase: passphrase.trim(),
          dry_run: dryRun,
        },
        idempotencyKey
      );

      setLastExecution(res);
      Alert.alert(
        'Emergency Action Completed',
        `Action: ${res.action}\nStatus: ${res.status}\nSafety Mode: ${res.safety_mode}\nRef ID: ${res.execution_id}`
      );
      await loadEmergencyStatus();
    } catch (e: any) {
      const msg = e?.response?.data?.detail || e.message || 'Countermeasure execution rejected';
      Alert.alert('Governor Rejection', msg);
    } finally {
      setExecuting(false);
    }
  };

  return (
    <View style={styles.container}>
      <HeaderBar
        title="GOVERNOR EMERGENCY CONSOLE"
        subtitle="LEVEL-3 COUNTERMEASURE CONTROLLER"
        showBack
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Arming Status Card */}
        <CyberPanel
          title="GOVERNOR OPERATIONAL POSTURE"
          badge={statusData?.status || 'ARMED_LEVEL_3'}
          badgeColor="critical"
          style={styles.panel}
        >
          <View style={styles.postureRow}>
            <View style={styles.postureItem}>
              <Text style={styles.postureLabel}>CONTAINED HOSTS</Text>
              <Text style={styles.postureValCyan}>
                {statusData?.contained_hosts?.length ?? 0}
              </Text>
            </View>
            <View style={styles.postureItem}>
              <Text style={styles.postureLabel}>BLOCKED IPS</Text>
              <Text style={styles.postureValRed}>
                {statusData?.blocked_ips?.length ?? 0}
              </Text>
            </View>
            <View style={styles.postureItem}>
              <Text style={styles.postureLabel}>SAFETY ADAPTER</Text>
              <Text style={styles.postureValGreen}>
                {dryRun ? 'DRY-RUN' : 'LIVE'}
              </Text>
            </View>
          </View>
        </CyberPanel>

        {/* Countermeasure Action Selector */}
        <CyberPanel
          title="SELECT COUNTERMEASURE"
          badge="ALLOWLISTED"
          badgeColor="cyan"
          style={styles.panel}
        >
          <View style={styles.actionGrid}>
            <TouchableOpacity
              style={[
                styles.actionCard,
                selectedAction === 'CONTAIN_HOST' && styles.actionCardActive,
              ]}
              onPress={() => handleActionSelect('CONTAIN_HOST')}
            >
              <Lock color={selectedAction === 'CONTAIN_HOST' ? colors.cyan : colors.textMuted} size={20} />
              <Text style={styles.actionCardTitle}>CONTAIN HOST</Text>
              <Text style={styles.actionCardDesc}>Dry-run network quarantine</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionCard,
                selectedAction === 'RELEASE_CONTAINMENT' && styles.actionCardActive,
              ]}
              onPress={() => handleActionSelect('RELEASE_CONTAINMENT')}
            >
              <Unlock color={selectedAction === 'RELEASE_CONTAINMENT' ? colors.cyan : colors.textMuted} size={20} />
              <Text style={styles.actionCardTitle}>RELEASE HOST</Text>
              <Text style={styles.actionCardDesc}>Restore normal networking</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionCard,
                selectedAction === 'BLOCK_IP' && styles.actionCardActive,
              ]}
              onPress={() => handleActionSelect('BLOCK_IP')}
            >
              <Ban color={selectedAction === 'BLOCK_IP' ? colors.critical : colors.textMuted} size={20} />
              <Text style={styles.actionCardTitle}>BLOCK IP</Text>
              <Text style={styles.actionCardDesc}>Drop rule at border</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionCard,
                selectedAction === 'RESTART_CRITICAL_SERVICE' && styles.actionCardActive,
              ]}
              onPress={() => handleActionSelect('RESTART_CRITICAL_SERVICE')}
            >
              <Server color={selectedAction === 'RESTART_CRITICAL_SERVICE' ? colors.cyan : colors.textMuted} size={20} />
              <Text style={styles.actionCardTitle}>RESTART RPC</Text>
              <Text style={styles.actionCardDesc}>Supervised restart</Text>
            </TouchableOpacity>
          </View>
        </CyberPanel>

        {/* Target & Justification Parameters */}
        <CyberPanel
          title="EXECUTION PARAMETERS"
          badge="STEP-UP REQUIRED"
          badgeColor="purple"
          style={styles.panel}
        >
          <Text style={styles.inputLabel}>TARGET IDENTIFIER / IP / SERVICE</Text>
          <View style={styles.inputRow}>
            <Terminal color={colors.textSecondary} size={16} />
            <TextInput
              style={styles.textInput}
              value={target}
              onChangeText={setTarget}
              placeholder="e.g. 198.51.100.45 or srv-dmz-01"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <Text style={styles.inputLabel}>
            OPERATIONAL JUSTIFICATION (MIN 15 CHARACTERS)
          </Text>
          <View style={[styles.inputRow, { height: 72, alignItems: 'flex-start' }]}>
            <TextInput
              style={[styles.textInput, { height: 60, textAlignVertical: 'top' }]}
              value={justification}
              onChangeText={setJustification}
              placeholder="Detailed reason for invoking Governor Level-3 countermeasure..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
            />
          </View>
          <Text
            style={[
              styles.charCounter,
              { color: justification.length >= 15 ? colors.optimal : colors.critical },
            ]}
          >
            {justification.length} / 15 chars minimum
          </Text>

          <Text style={styles.inputLabel}>OPERATOR STEP-UP CONFIRMATION PASSPHRASE</Text>
          <View style={styles.inputRow}>
            <KeyRound color={colors.textSecondary} size={16} />
            <TextInput
              style={styles.textInput}
              value={passphrase}
              onChangeText={setPassphrase}
              placeholder="Admin passphrase (min 8 characters)"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
            />
          </View>

          {/* Dry Run Toggle */}
          <View style={styles.dryRunRow}>
            <View>
              <Text style={styles.dryRunTitle}>DRY-RUN SAFETY ADAPTER</Text>
              <Text style={styles.dryRunDesc}>
                Simulates execution without altering host network stack
              </Text>
            </View>
            <Switch
              value={dryRun}
              onValueChange={setDryRun}
              trackColor={{ false: colors.critical, true: colors.optimal }}
              thumbColor={colors.textPrimary}
            />
          </View>

          {/* Trigger Button */}
          <CyberButton
            title="INVOKE LEVEL-3 COUNTERMEASURE"
            variant="danger"
            onPress={validateAndPromptConfirm}
            loading={executing}
            icon={<AlertOctagon color={colors.textPrimary} size={18} />}
            style={{ marginTop: spacing.md }}
          />
        </CyberPanel>

        {/* Live Execution Ledger */}
        <CyberPanel
          title="RECENT EMERGENCY OPERATIONS LEDGER"
          badge={`${statusData?.total_actions ?? 0} LOGGED`}
          badgeColor="cyan"
          style={styles.panel}
        >
          {statusData?.recent_actions && statusData.recent_actions.length > 0 ? (
            statusData.recent_actions.map((act, idx) => (
              <View key={`${act.execution_id}-${idx}`} style={styles.logItem}>
                <View style={styles.logHeader}>
                  <Text style={styles.logAction}>{act.action}</Text>
                  <Text style={styles.logTime}>
                    {new Date(act.executed_at).toLocaleTimeString()}
                  </Text>
                </View>
                <Text style={styles.logTarget}>Target: {act.target}</Text>
                <Text style={styles.logJust}>Reason: {act.justification}</Text>
                <View style={styles.logFooter}>
                  <Text style={styles.logOp}>Operator: {act.operator}</Text>
                  <Text
                    style={[
                      styles.logStatus,
                      { color: act.status === 'SUCCESS' ? colors.optimal : colors.cyan },
                    ]}
                  >
                    {act.status}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No emergency countermeasures recorded.</Text>
          )}

          <CyberButton
            title="REFRESH POSTURE & AUDIT LOGS"
            variant="outline"
            onPress={loadEmergencyStatus}
            loading={loading}
            icon={<RefreshCw color={colors.textSecondary} size={14} />}
            style={{ marginTop: spacing.sm }}
          />
        </CyberPanel>
      </ScrollView>

      {/* Confirmation Modal Safeguard */}
      <Modal
        visible={confirmModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <AlertTriangle color={colors.critical} size={28} />
              <Text style={styles.modalTitle}>ARMED GOVERNOR ACTION</Text>
            </View>

            <Text style={styles.modalBody}>
              You are about to execute a Level-3 countermeasure:
            </Text>

            <View style={styles.modalSpecs}>
              <Text style={styles.modalSpecLine}>
                <Text style={styles.boldLabel}>ACTION: </Text>
                {selectedAction}
              </Text>
              <Text style={styles.modalSpecLine}>
                <Text style={styles.boldLabel}>TARGET: </Text>
                {target}
              </Text>
              <Text style={styles.modalSpecLine}>
                <Text style={styles.boldLabel}>SAFETY MODE: </Text>
                {dryRun ? 'DRY-RUN (SIMULATED)' : 'LIVE EXECUTION'}
              </Text>
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setConfirmModalVisible(false)}
              >
                <Text style={styles.btnText}>ABORT</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.confirmBtn]}
                onPress={executeActionConfirmed}
              >
                <Text style={[styles.btnText, { color: '#fff', fontWeight: 'bold' }]}>
                  AUTHORIZE & DISPATCH
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  panel: {
    marginBottom: spacing.xs,
  },
  postureRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.xs,
  },
  postureItem: {
    alignItems: 'center',
  },
  postureLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 9,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  postureValCyan: {
    fontFamily: typography.fontFamily,
    fontSize: 18,
    fontWeight: typography.weights.bold,
    color: colors.cyan,
  },
  postureValRed: {
    fontFamily: typography.fontFamily,
    fontSize: 18,
    fontWeight: typography.weights.bold,
    color: colors.critical,
  },
  postureValGreen: {
    fontFamily: typography.fontFamily,
    fontSize: 14,
    fontWeight: typography.weights.bold,
    color: colors.optimal,
    marginTop: 2,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actionCard: {
    width: '48%',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    padding: spacing.sm,
    gap: 4,
  },
  actionCardActive: {
    borderColor: colors.cyan,
    backgroundColor: 'rgba(6, 182, 212, 0.08)',
  },
  actionCardTitle: {
    fontFamily: typography.fontFamily,
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  actionCardDesc: {
    fontFamily: typography.fontFamilySans,
    fontSize: 10,
    color: colors.textMuted,
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
    height: 42,
    gap: spacing.sm,
  },
  textInput: {
    flex: 1,
    fontFamily: typography.fontFamilySans,
    fontSize: typography.sizes.sm,
    color: colors.textPrimary,
  },
  charCounter: {
    fontFamily: typography.fontFamily,
    fontSize: 9,
    alignSelf: 'flex-end',
    marginTop: 2,
    marginBottom: spacing.xs,
  },
  dryRunRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    padding: spacing.sm,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.sm,
  },
  dryRunTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
    color: colors.textPrimary,
    fontWeight: typography.weights.bold,
  },
  dryRunDesc: {
    fontFamily: typography.fontFamilySans,
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  logItem: {
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    padding: spacing.sm,
    marginBottom: spacing.xs,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  logAction: {
    fontFamily: typography.fontFamily,
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: colors.cyan,
  },
  logTime: {
    fontFamily: typography.fontFamily,
    fontSize: 9,
    color: colors.textMuted,
  },
  logTarget: {
    fontFamily: typography.fontFamily,
    fontSize: 10,
    color: colors.textPrimary,
  },
  logJust: {
    fontFamily: typography.fontFamilySans,
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  logFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  logOp: {
    fontFamily: typography.fontFamily,
    fontSize: 9,
    color: colors.textMuted,
  },
  logStatus: {
    fontFamily: typography.fontFamily,
    fontSize: 9,
    fontWeight: typography.weights.bold,
  },
  emptyText: {
    fontFamily: typography.fontFamilySans,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginVertical: spacing.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalBox: {
    width: '100%',
    backgroundColor: '#0a1124',
    borderWidth: 2,
    borderColor: colors.critical,
    borderRadius: 8,
    padding: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  modalTitle: {
    fontFamily: typography.fontFamily,
    fontSize: 14,
    fontWeight: typography.weights.bold,
    color: colors.critical,
  },
  modalBody: {
    fontFamily: typography.fontFamilySans,
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  modalSpecs: {
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    borderRadius: 4,
    marginBottom: spacing.md,
  },
  modalSpecLine: {
    fontFamily: typography.fontFamily,
    fontSize: 11,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  boldLabel: {
    color: colors.cyan,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modalBtn: {
    flex: 1,
    height: 40,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  confirmBtn: {
    backgroundColor: colors.critical,
  },
  btnText: {
    fontFamily: typography.fontFamily,
    fontSize: 11,
    color: colors.textPrimary,
  },
});
