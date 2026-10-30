/**
 * HoneyShield X — Governor Confirmation Step-Up Modal
 * Mandates justification logging and biometric verification for Level-3 actions.
 */

import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { ShieldAlert, Fingerprint, X } from 'lucide-react-native';
import { colors, typography, spacing } from '../../theme';
import { CyberButton } from '../common/CyberButton';
import { CyberPanel } from '../hud/CyberPanel';

interface GovernorModalProps {
  visible: boolean;
  action: string;
  target: string;
  riskLevel: 1 | 2 | 3;
  onConfirm: (justification: string) => void;
  onCancel: () => void;
  loading?: boolean;
}

export const GovernorModal: React.FC<GovernorModalProps> = ({
  visible,
  action,
  target,
  riskLevel = 3,
  onConfirm,
  onCancel,
  loading = false,
}) => {
  const [justification, setJustification] = useState('');

  const handleExecute = () => {
    if (!justification.trim() || justification.trim().length < 10) {
      Alert.alert(
        'Audit Mandate Violation',
        'Governor Level-3 containment requires an operational justification of at least 10 characters.'
      );
      return;
    }
    onConfirm(justification.trim());
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <CyberPanel glowColor="critical" style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <ShieldAlert color={colors.critical} size={22} />
              <Text style={styles.title}>GOVERNOR AUTHORIZATION</Text>
            </View>
            <TouchableOpacity onPress={onCancel} disabled={loading}>
              <X color={colors.textSecondary} size={20} />
            </TouchableOpacity>
          </View>

          {/* Risk Level Banner */}
          <View style={styles.riskBanner}>
            <Text style={styles.riskBannerText}>
              LEVEL {riskLevel} HIGH-RISK CONTAINMENT PROTOCOL
            </Text>
          </View>

          {/* Target & Action Details */}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>ACTION:</Text>
            <Text style={styles.detailValue}>{action.toUpperCase()}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>TARGET ENTITY:</Text>
            <Text style={[styles.detailValue, { color: colors.critical }]}>{target}</Text>
          </View>

          {/* Justification Input */}
          <Text style={styles.inputLabel}>OPERATIONAL JUSTIFICATION (MANDATORY AUDIT):</Text>
          <TextInput
            style={styles.textInput}
            value={justification}
            onChangeText={setJustification}
            placeholder="e.g., Immediate host containment due to lateral movement detection..."
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={3}
            editable={!loading}
          />

          {/* Actions */}
          <View style={styles.actionsRow}>
            <CyberButton
              title="CANCEL"
              variant="outline"
              onPress={onCancel}
              disabled={loading}
              style={{ flex: 1 }}
            />
            <CyberButton
              title="CONFIRM & EXECUTE"
              variant="danger"
              onPress={handleExecute}
              loading={loading}
              icon={<Fingerprint color={colors.critical} size={18} />}
              style={{ flex: 1.5 }}
            />
          </View>
        </CyberPanel>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(3, 7, 18, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modalContent: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1.5,
    borderColor: colors.critical,
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.critical,
    letterSpacing: 1.2,
  },
  riskBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderLeftWidth: 3,
    borderLeftColor: colors.critical,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    marginBottom: spacing.md,
  },
  riskBannerText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.critical,
    letterSpacing: 0.8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  detailLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
  },
  detailValue: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  inputLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  textInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    padding: spacing.sm,
    minHeight: 70,
    textAlignVertical: 'top',
    marginBottom: spacing.lg,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});

