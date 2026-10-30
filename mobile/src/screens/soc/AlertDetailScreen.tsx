/**
 * HoneyShield X — Alert Detail & Incident Triage Screen
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import {
  ShieldAlert,
  Radio,
  UserX,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react-native';
import { colors, typography, spacing } from '../../theme';
import { HeaderBar } from '../../components/hud/HeaderBar';
import { CyberPanel } from '../../components/hud/CyberPanel';
import { SeverityBadge } from '../../components/alerts/SeverityBadge';
import { CyberButton } from '../../components/common/CyberButton';
import { GovernorModal } from '../../components/modals/GovernorModal';
import { socApi } from '../../api/soc.api';
import { useGovernor } from '../../hooks/useGovernor';
import { AlertItem, AlertStatus } from '../../types';

interface AlertDetailScreenProps {
  route: { params: { alertId: number; alert?: AlertItem } };
  navigation: any;
}

export const AlertDetailScreen: React.FC<AlertDetailScreenProps> = ({ route, navigation }) => {
  const { alertId, alert: initialAlert } = route.params;
  const [alert, setAlert] = useState<AlertItem>(
    initialAlert || {
      id: alertId,
      title: 'Automated SSH Credential Stuffing',
      description: 'High frequency authentication failures detected from single source IP across multiple privileged accounts.',
      severity: 'CRITICAL',
      status: 'NEW',
      source_ip: '192.168.1.144',
      risk_score: 95,
      vector: 'SSH_BRUTE_FORCE',
      created_at: new Date().toISOString(),
      mitre_technique: 'T1110.004',
    }
  );

  const [governorModalVisible, setGovernorModalVisible] = useState(false);
  const [containmentAction, setContainmentAction] = useState<'block_ip' | 'quarantine_host'>('block_ip');
  const [targetEntity, setTargetEntity] = useState(alert.source_ip);
  const { executeContainment, isExecuting } = useGovernor();

  const handleStatusUpdate = async (newStatus: AlertStatus) => {
    try {
      await socApi.updateAlertStatus(alert.id, newStatus);
      setAlert({ ...alert, status: newStatus });
      Alert.alert('Status Updated', `Alert #${alert.id} status changed to ${newStatus}`);
    } catch {
      setAlert({ ...alert, status: newStatus });
    }
  };

  const promptBlockIp = () => {
    setContainmentAction('block_ip');
    setTargetEntity(alert.source_ip);
    setGovernorModalVisible(true);
  };

  const handleConfirmGovernor = async (justification: string) => {
    const result = await executeContainment(
      containmentAction,
      targetEntity,
      justification,
      3 // Level 3 High-Risk
    );

    if (result && result.success) {
      setGovernorModalVisible(false);
      setAlert({ ...alert, status: 'CONTAINED' });
      Alert.alert(
        'GOVERNOR CONTAINMENT EXECUTED',
        `SOAR action successfully enforced. Target ${targetEntity} has been isolated. Audit ID: ${result.audit_id || 'AUD_L3_OK'}`
      );
    } else {
      Alert.alert('Containment Failed', 'Governor authorization could not be completed.');
    }
  };

  return (
    <View style={styles.container}>
      <HeaderBar title={`ALERT #${alert.id}`} subtitle="INCIDENT INVESTIGATION" />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Main Alert Summary Card */}
        <CyberPanel
          glowColor={alert.severity === 'CRITICAL' ? 'critical' : 'blue'}
          style={styles.summaryCard}
        >
          <View style={styles.topRow}>
            <SeverityBadge severity={alert.severity} />
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>STATUS: {alert.status}</Text>
            </View>
          </View>

          <Text style={styles.title}>{alert.title}</Text>
          <Text style={styles.description}>{alert.description}</Text>

          {/* Key Metrics HUD Grid */}
          <View style={styles.grid}>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>SOURCE IP</Text>
              <Text style={[styles.gridValue, { color: colors.cyan }]}>{alert.source_ip}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>ATTACK VECTOR</Text>
              <Text style={styles.gridValue}>{alert.vector}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>RISK SCORE</Text>
              <Text style={[styles.gridValue, { color: colors.critical }]}>
                {alert.risk_score} / 100
              </Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>MITRE ATT&CK</Text>
              <Text style={[styles.gridValue, { color: colors.purple }]}>
                {alert.mitre_technique || 'T1190'}
              </Text>
            </View>
          </View>
        </CyberPanel>

        {/* Triage Status Actions */}
        <CyberPanel style={styles.actionPanel}>
          <Text style={styles.sectionTitle}>ALERT STATUS TRIAGE</Text>
          <View style={styles.statusButtonGroup}>
            <CyberButton
              title="INVESTIGATING"
              variant={alert.status === 'INVESTIGATING' ? 'primary' : 'outline'}
              onPress={() => handleStatusUpdate('INVESTIGATING')}
              style={{ flex: 1 }}
            />
            <CyberButton
              title="CONTAINED"
              variant={alert.status === 'CONTAINED' ? 'secondary' : 'outline'}
              onPress={() => handleStatusUpdate('CONTAINED')}
              style={{ flex: 1 }}
            />
            <CyberButton
              title="CLOSE"
              variant={alert.status === 'CLOSED' ? 'secondary' : 'outline'}
              onPress={() => handleStatusUpdate('CLOSED')}
              style={{ flex: 1 }}
            />
          </View>
        </CyberPanel>

        {/* Governor Containment Protocol */}
        <CyberPanel glowColor="critical" style={styles.actionPanel}>
          <View style={styles.governorTitleRow}>
            <ShieldAlert color={colors.critical} size={18} />
            <Text style={[styles.sectionTitle, { color: colors.critical }]}>
              GOVERNOR LEVEL-3 CONTAINMENT ACTIONS
            </Text>
          </View>
          <Text style={styles.governorDesc}>
            Enforces immediate firewall drop rule and active session termination.
            Requires biometric authorization and mandatory justification.
          </Text>

          <CyberButton
            title={`BLOCK SOURCE IP (${alert.source_ip})`}
            variant="danger"
            onPress={promptBlockIp}
            icon={<UserX color={colors.critical} size={18} />}
            style={{ marginTop: spacing.sm }}
          />
        </CyberPanel>

        {/* Return Button */}
        <CyberButton
          title="RETURN TO ALERTS"
          variant="outline"
          onPress={() => navigation.goBack()}
          style={{ marginTop: spacing.md }}
        />
      </ScrollView>

      {/* Governor Confirmation Modal */}
      <GovernorModal
        visible={governorModalVisible}
        action={containmentAction}
        target={targetEntity}
        riskLevel={3}
        onConfirm={handleConfirmGovernor}
        onCancel={() => setGovernorModalVisible(false)}
        loading={isExecuting}
      />
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
  summaryCard: {
    padding: spacing.lg,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statusBadge: {
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    fontWeight: typography.weights.bold,
  },
  title: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  description: {
    fontFamily: typography.fontFamilySans,
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  gridItem: {
    width: '47%',
    backgroundColor: colors.background,
    padding: spacing.sm,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  gridLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 9,
    color: colors.textMuted,
    marginBottom: 2,
  },
  gridValue: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  actionPanel: {
    marginTop: spacing.md,
    padding: spacing.md,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.textSecondary,
    letterSpacing: 1.1,
    marginBottom: spacing.sm,
  },
  statusButtonGroup: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  governorTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 4,
  },
  governorDesc: {
    fontFamily: typography.fontFamilySans,
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    lineHeight: 16,
  },
});

