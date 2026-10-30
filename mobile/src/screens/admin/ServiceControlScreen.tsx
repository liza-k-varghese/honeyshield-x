/**
 * HoneyShield X — Supervised Host Service Control Screen
 * Strictly allowlisted RPC service management.
 * Enforces Zero Arbitrary Shell Execution & Governor Level-3 verification.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  Server,
  RotateCw,
  Power,
  ShieldCheck,
  Cpu,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react-native';
import { colors, typography, spacing } from '../../theme';
import { HeaderBar } from '../../components/hud/HeaderBar';
import { CyberPanel } from '../../components/hud/CyberPanel';
import { CyberButton } from '../../components/common/CyberButton';
import { GovernorModal } from '../../components/modals/GovernorModal';
import { servicesApi } from '../../api/services.api';
import { useGovernor } from '../../hooks/useGovernor';
import { ManagedServiceInfo, ManagedServiceName } from '../../types';

interface ServiceControlScreenProps {
  navigation: any;
}

export const ServiceControlScreen: React.FC<ServiceControlScreenProps> = ({ navigation }) => {
  const [services, setServices] = useState<ManagedServiceInfo[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [governorModalVisible, setGovernorModalVisible] = useState(false);
  const [selectedService, setSelectedService] = useState<ManagedServiceInfo | null>(null);

  const { executeContainment, isExecuting } = useGovernor();

  const fetchServices = async () => {
    try {
      const data = await servicesApi.getServicesStatus();
      setServices(data);
    } catch {
      // Handled
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchServices();
  };

  const promptRestart = (service: ManagedServiceInfo) => {
    setSelectedService(service);
    setGovernorModalVisible(true);
  };

  const handleConfirmRestart = async (justification: string) => {
    if (!selectedService) return;

    try {
      const result = await servicesApi.controlService({
        service: selectedService.name,
        action: 'restart',
        justification,
      });

      setGovernorModalVisible(false);
      Alert.alert(
        'SERVICE ACTION DISPATCHED',
        result.message || `Service '${selectedService.display_name}' restart command successfully executed.`
      );
      fetchServices();
    } catch (err: any) {
      Alert.alert('Action Failed', err?.message || 'Failed to dispatch service control.');
    }
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <View style={styles.container}>
      <HeaderBar title="SERVICE CONTROL" subtitle="CONTROLLED SUPERVISOR RPC" />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.cyan} />}
      >
        {/* Zero Shell Security Policy Banner */}
        <CyberPanel glowColor="blue" style={styles.policyCard}>
          <View style={styles.policyHeader}>
            <ShieldCheck color={colors.optimal} size={18} />
            <Text style={styles.policyTitle}>SUPERVISED RPC DAEMON ACTIVE</Text>
          </View>
          <Text style={styles.policyDesc}>
            Host service management operates exclusively through allowlisted RPC dispatches.
            Arbitrary shell execution is completely prohibited to ensure platform defense integrity.
          </Text>
        </CyberPanel>

        {/* Managed Services List */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>MANAGED PLATFORM DAEMONS</Text>
        </View>

        {services.map((svc) => (
          <CyberPanel key={svc.name} style={styles.svcCard}>
            <View style={styles.svcTopRow}>
              <View style={styles.svcNameRow}>
                <Server color={colors.cyan} size={18} />
                <View>
                  <Text style={styles.svcDisplayName}>{svc.display_name}</Text>
                  <Text style={styles.svcIdentifier}>SERVICE: {svc.name}</Text>
                </View>
              </View>

              <View
                style={[
                  styles.statusTag,
                  {
                    backgroundColor:
                      svc.status === 'running'
                        ? 'rgba(16, 185, 129, 0.15)'
                        : 'rgba(239, 68, 68, 0.15)',
                    borderColor: svc.status === 'running' ? colors.optimal : colors.critical,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusTagText,
                    { color: svc.status === 'running' ? colors.optimal : colors.critical },
                  ]}
                >
                  {svc.status.toUpperCase()}
                </Text>
              </View>
            </View>

            {/* Metrics */}
            <View style={styles.metricsRow}>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>UPTIME</Text>
                <Text style={styles.metricValue}>{formatUptime(svc.uptime_seconds)}</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>RESIDENT MEMORY</Text>
                <Text style={styles.metricValue}>{svc.memory_mb} MB</Text>
              </View>
              {svc.port && (
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>BIND PORT</Text>
                  <Text style={[styles.metricValue, { color: colors.cyan }]}>:{svc.port}</Text>
                </View>
              )}
            </View>

            {/* Controlled Action */}
            <CyberButton
              title={`RESTART ${svc.name.toUpperCase()}`}
              variant="outline"
              onPress={() => promptRestart(svc)}
              icon={<RotateCw color={colors.textSecondary} size={14} />}
              style={styles.restartBtn}
            />
          </CyberPanel>
        ))}
      </ScrollView>

      {/* Governor Confirmation Step-up Modal */}
      {selectedService && (
        <GovernorModal
          visible={governorModalVisible}
          action={`RESTART ${selectedService.name.toUpperCase()}`}
          target={selectedService.display_name}
          riskLevel={3}
          onConfirm={handleConfirmRestart}
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
  policyCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  policyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 4,
  },
  policyTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.optimal,
    letterSpacing: 1,
  },
  policyDesc: {
    fontFamily: typography.fontFamilySans,
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  sectionHeader: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.textSecondary,
    letterSpacing: 1.1,
  },
  svcCard: {
    marginVertical: 4,
    padding: spacing.md,
  },
  svcTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  svcNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  svcDisplayName: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  svcIdentifier: {
    fontFamily: typography.fontFamily,
    fontSize: 10,
    color: colors.textMuted,
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
  },
  statusTagText: {
    fontFamily: typography.fontFamily,
    fontSize: 9,
    fontWeight: typography.weights.bold,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 9,
    color: colors.textMuted,
    marginBottom: 2,
  },
  metricValue: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  restartBtn: {
    minHeight: 40,
    paddingVertical: 4,
  },
});

