/**
 * HoneyShield X — Incident Cases & Playbook Tasks Screen
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  Briefcase,
  CheckSquare,
  Square,
  ShieldAlert,
  UserX,
  Radio,
  FileText,
  AlertCircle,
  RefreshCw,
} from 'lucide-react-native';
import { colors, typography, spacing } from '../../theme';
import { HeaderBar } from '../../components/hud/HeaderBar';
import { CyberPanel } from '../../components/hud/CyberPanel';
import { SeverityBadge } from '../../components/alerts/SeverityBadge';
import { CyberButton } from '../../components/common/CyberButton';
import { GovernorModal } from '../../components/modals/GovernorModal';
import { casesApi } from '../../api/cases.api';
import { useGovernor } from '../../hooks/useGovernor';
import { IncidentCase } from '../../types';

interface CasesListScreenProps {
  navigation: any;
}

export const CasesListScreen: React.FC<CasesListScreenProps> = ({ navigation }) => {
  const [cases, setCases] = useState<IncidentCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [governorModalVisible, setGovernorModalVisible] = useState(false);
  const [selectedCase, setSelectedCase] = useState<IncidentCase | null>(null);

  const { executeContainment, isExecuting } = useGovernor();

  const fetchCases = async () => {
    try {
      setErrorMessage(null);
      const data = await casesApi.getCases();
      setCases(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to retrieve active incident cases.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCases();
  };

  const toggleTask = async (caseId: string, taskId: string) => {
    try {
      await casesApi.completePlaybookTask(caseId, taskId);
    } catch {
      // Optimistic fallback for disconnected mode
    }
    setCases((prev) =>
      prev.map((c) => {
        const matchId = c.case_id || c.id;
        if (matchId !== caseId) return c;
        return {
          ...c,
          playbook_tasks: (c.playbook_tasks || []).map((t) => {
            const matchTaskId = t.task_id || t.id;
            return matchTaskId === taskId ? { ...t, completed: !t.completed } : t;
          }),
        };
      })
    );
  };

  const triggerContainment = (c: IncidentCase) => {
    setSelectedCase(c);
    setGovernorModalVisible(true);
  };

  const handleConfirmGovernor = async (justification: string) => {
    if (!selectedCase) return;

    const result = await executeContainment(
      'quarantine_host',
      selectedCase.id,
      justification,
      3
    );

    if (result && result.success) {
      setGovernorModalVisible(false);
      // Mark task complete
      toggleTask(selectedCase.id, 't3');
      Alert.alert(
        'HOST CONTAINMENT EXECUTED',
        `Governor Level-3 quarantine enforced for case ${selectedCase.id}. Audit ID: ${result.audit_id || 'AUD_OK'}`
      );
    } else {
      Alert.alert('Containment Failed', 'Governor authorization could not be completed.');
    }
  };

  return (
    <View style={styles.container}>
      <HeaderBar title="INCIDENT CASES" subtitle="SOAR CASE PLAYBOOK EXECUTION" />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.cyan} />}
      >
        {errorMessage && (
          <CyberPanel glowColor="critical" style={styles.errorPanel}>
            <View style={styles.errorHeader}>
              <AlertCircle color={colors.critical} size={16} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
            <TouchableOpacity style={styles.retryButton} onPress={fetchCases}>
              <RefreshCw color={colors.textCyan} size={14} />
              <Text style={styles.retryButtonText}>RETRY CONNECTIVITY</Text>
            </TouchableOpacity>
          </CyberPanel>
        )}

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="small" color={colors.cyan} />
            <Text style={styles.loadingText}>SYNCING ACTIVE CASES...</Text>
          </View>
        ) : cases.length === 0 ? (
          <CyberPanel glowColor="optimal" style={styles.emptyPanel}>
            <Text style={styles.emptyText}>NO ACTIVE INCIDENT CASES</Text>
            <Text style={styles.emptySubtext}>All detection incidents are remediated or closed.</Text>
          </CyberPanel>
        ) : (
          cases.map((c) => (
            <CyberPanel
              key={c.id}
              glowColor={c.severity === 'CRITICAL' ? 'critical' : 'blue'}
              style={styles.caseCard}
            >
              <View style={styles.caseHeader}>
                <View style={styles.caseIdRow}>
                  <Briefcase color={colors.cyan} size={16} />
                  <Text style={styles.caseIdText}>{c.id}</Text>
                </View>
                <SeverityBadge severity={c.severity} />
              </View>

              <Text style={styles.caseTitle}>{c.title}</Text>
              <Text style={styles.caseAnalyst}>
                LEAD ANALYST: <Text style={{ color: colors.cyan }}>{c.assigned_analyst || 'Unassigned'}</Text>
              </Text>

              {/* Playbook Tasks Checklist */}
              {Array.isArray(c.playbook_tasks) && c.playbook_tasks.length > 0 && (
                <View style={styles.playbookSection}>
                  <Text style={styles.playbookTitle}>INCIDENT RESPONSE PLAYBOOK:</Text>
                  {c.playbook_tasks.map((task) => (
                    <TouchableOpacity
                      key={task.id}
                      style={styles.taskRow}
                      onPress={() => toggleTask(c.id, task.id)}
                      activeOpacity={0.7}
                    >
                      {task.completed ? (
                        <CheckSquare color={colors.optimal} size={16} />
                      ) : (
                        <Square color={colors.textMuted} size={16} />
                      )}
                      <Text
                        style={[
                          styles.taskText,
                          task.completed && styles.taskCompletedText,
                        ]}
                      >
                        {task.description}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Governor SOAR Action Button */}
              <CyberButton
                title="EXECUTE GOVERNOR QUARANTINE"
                variant="danger"
                onPress={() => triggerContainment(c)}
                icon={<ShieldAlert color={colors.critical} size={16} />}
                style={{ marginTop: spacing.md }}
              />
            </CyberPanel>
          ))
        )}
      </ScrollView>

      {/* Governor Confirmation Modal */}
      {selectedCase && (
        <GovernorModal
          visible={governorModalVisible}
          action="quarantine_host"
          target={selectedCase.id}
          riskLevel={3}
          onConfirm={handleConfirmGovernor}
          onCancel={() => setGovernorModalVisible(false)}
          loading={isExecuting}
        />
      )}
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
  caseCard: {
    marginVertical: spacing.sm,
    padding: spacing.md,
  },
  caseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  caseIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  caseIdText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.cyan,
  },
  caseTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  caseAnalyst: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  playbookSection: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  playbookTitle: {
    fontFamily: typography.fontFamily,
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: colors.textMuted,
    letterSpacing: 1,
    marginBottom: 6,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: 5,
  },
  taskText: {
    fontFamily: typography.fontFamilySans,
    fontSize: typography.sizes.xs,
    color: colors.textPrimary,
    flex: 1,
  },
  taskCompletedText: {
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  errorPanel: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  errorText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
    color: colors.critical,
    flex: 1,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
    paddingVertical: 6,
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.cyan,
  },
  retryButtonText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
    color: colors.cyan,
    fontWeight: typography.weights.bold,
  },
  centerContainer: {
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
    color: colors.textCyan,
    marginTop: spacing.xs,
    letterSpacing: 1,
  },
  emptyPanel: {
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  emptyText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    letterSpacing: 1,
  },
  emptySubtext: {
    fontFamily: typography.fontFamilySans,
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
});

