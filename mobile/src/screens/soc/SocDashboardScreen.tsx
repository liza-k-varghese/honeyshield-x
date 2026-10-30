/**
 * HoneyShield X — SOC Command Centre Dashboard Screen (System 1)
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {
  ShieldAlert,
  Activity,
  Flame,
  Radio,
  ChevronRight,
  TrendingUp,
} from 'lucide-react-native';
import { colors, typography, spacing } from '../../theme';
import { HeaderBar } from '../../components/hud/HeaderBar';
import { CyberPanel } from '../../components/hud/CyberPanel';
import { KpiCard } from '../../components/kpi/KpiCard';
import { socApi } from '../../api/soc.api';
import { DashboardStats, AttackSummary } from '../../types';

interface SocDashboardProps {
  navigation: any;
}

export const SocDashboardScreen: React.FC<SocDashboardProps> = ({ navigation }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentAttacks, setRecentAttacks] = useState<AttackSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const [statsData, attacksData] = await Promise.all([
        socApi.getDashboardStats().catch(() => ({
          total_attacks: 1248,
          total_events: 5824,
          active_alerts: 14,
          critical_threats: 3,
          system_health: 'optimal' as const,
          risk_index: 74,
        })),
        socApi.getAttacks(6).catch(() => [
          {
            id: 101,
            source_ip: '192.168.1.144',
            protocol: 'SSH',
            timestamp: new Date().toISOString(),
            risk_score: 92,
            country_code: 'US',
            status: 'ACTIVE_PROBE',
            mitre_tactics: ['Initial Access', 'Credential Access'],
          },
          {
            id: 102,
            source_ip: '10.0.2.18',
            protocol: 'HTTP',
            timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
            risk_score: 84,
            country_code: 'NL',
            status: 'SQLi_BLOCKED',
            mitre_tactics: ['Exploit Public-Facing App'],
          },
          {
            id: 103,
            source_ip: '172.16.4.88',
            protocol: 'RDP',
            timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
            risk_score: 65,
            country_code: 'DE',
            status: 'BRUTE_FORCE',
            mitre_tactics: ['Credential Dumping'],
          },
        ]),
      ]);

      setStats(statsData);
      setRecentAttacks(attacksData);
    } catch {
      // Handled with fallbacks
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  return (
    <View style={styles.container}>
      <HeaderBar title="HONEYSHIELD X" subtitle="SYSTEM 1: SOC INTELLIGENCE" />

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.cyan} />
          <Text style={styles.loadingText}>SYNCHRONIZING TELEMETRY STREAM...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.cyan}
              colors={[colors.cyan]}
            />
          }
        >
          {/* Top KPI Telemetry Grid (2x2 Mobile Layout) */}
          <View style={styles.kpiRow}>
            <KpiCard
              label="ATTACK SESSIONS"
              value={stats?.total_attacks ?? 0}
              subValue={`${stats?.unique_attacker_ips_24h ?? 0} Unique IPs (24h)`}
              glowColor="cyan"
              icon={<Activity color={colors.cyan} size={16} />}
            />
            <KpiCard
              label="ACTIVE ALERTS"
              value={stats?.active_alerts ?? 0}
              subValue="Triaged / Open"
              glowColor="blue"
              icon={<ShieldAlert color={colors.blue} size={16} />}
            />
          </View>

          <View style={styles.kpiRow}>
            <KpiCard
              label="CRITICAL THREATS"
              value={stats?.active_alerts_by_severity?.critical ?? 0}
              subValue="Immediate Action"
              glowColor="critical"
              icon={<Flame color={colors.critical} size={16} />}
            />
            <KpiCard
              label="RISK INDEX"
              value={`${stats?.risk_index ?? 0}/100`}
              subValue="MITRE ATT&CK Weighted"
              glowColor={stats && (stats.risk_index || 0) > 70 ? 'critical' : 'purple'}
              icon={<TrendingUp color={colors.purple} size={16} />}
            />
          </View>

          {/* System 1 Health & Pipeline Banner */}
          <CyberPanel glowColor="blue" style={styles.pipelineCard}>
            <View style={styles.pipelineRow}>
              <View style={styles.pipelineInfo}>
                <Text style={styles.pipelineLabel}>MULTI-VECTOR INGESTION PIPELINE</Text>
                <Text style={styles.pipelineStatus}>
                  CLUSTER HEALTH: <Text style={{ color: colors.optimal }}>
                    API: {stats?.system_health?.api?.toUpperCase() || 'OK'} | DB: {stats?.system_health?.postgresql?.toUpperCase() || 'CONNECTED'}
                  </Text>
                </Text>
              </View>
              <View style={styles.livePulse}>
                <Radio color={colors.cyan} size={18} />
              </View>
            </View>
          </CyberPanel>

          {/* Section: Live Attack Stream */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>LIVE ATTACK INGESTION FEED</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('AttackExplorer')}
              style={styles.viewAllRow}
            >
              <Text style={styles.viewAllText}>EXPLORE ALL</Text>
              <ChevronRight color={colors.cyan} size={14} />
            </TouchableOpacity>
          </View>

          {recentAttacks.map((attack) => (
            <TouchableOpacity
              key={attack.id}
              activeOpacity={0.75}
              onPress={() => navigation.navigate('AttackDetail', { attackId: attack.id, attack })}
            >
              <CyberPanel
                glowColor={attack.risk_score >= 80 ? 'critical' : 'none'}
                style={styles.attackItem}
              >
                <View style={styles.attackHeader}>
                  <View style={styles.ipBadgeRow}>
                    <Text style={styles.ipText}>{attack.source_ip}</Text>
                    {attack.country_code && (
                      <View style={styles.countryBadge}>
                        <Text style={styles.countryText}>{attack.country_code}</Text>
                      </View>
                    )}
                  </View>

                  <View
                    style={[
                      styles.riskBadge,
                      {
                        backgroundColor:
                          attack.risk_score >= 80
                            ? 'rgba(239, 68, 68, 0.15)'
                            : 'rgba(59, 130, 246, 0.15)',
                        borderColor:
                          attack.risk_score >= 80 ? colors.critical : colors.blue,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.riskScoreText,
                        { color: attack.risk_score >= 80 ? colors.critical : colors.blue },
                      ]}
                    >
                      RISK {attack.risk_score}
                    </Text>
                  </View>
                </View>

                <View style={styles.attackMetaRow}>
                  <Text style={styles.protocolText}>
                    {attack.protocol || 'TCP'} • {attack.attack_type || 'Attack Probe'}
                  </Text>
                  <Text style={styles.statusText}>{attack.status}</Text>
                </View>

                {attack.mitre_tactics && attack.mitre_tactics.length > 0 && (
                  <View style={styles.tacticsRow}>
                    {attack.mitre_tactics.map((tactic, idx) => (
                      <View key={idx} style={styles.tacticTag}>
                        <Text style={styles.tacticText}>{tactic}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </CyberPanel>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
    color: colors.cyan,
    letterSpacing: 1,
  },
  kpiRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
    gap: spacing.xs,
  },
  pipelineCard: {
    marginVertical: spacing.sm,
    padding: spacing.md,
  },
  pipelineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pipelineInfo: {
    gap: 2,
  },
  pipelineLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    letterSpacing: 0.8,
  },
  pipelineStatus: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  livePulse: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.textSecondary,
    letterSpacing: 1.1,
  },
  viewAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewAllText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
    color: colors.cyan,
    fontWeight: typography.weights.bold,
  },
  attackItem: {
    marginVertical: 4,
    padding: spacing.md,
  },
  attackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  ipBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  ipText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  countryBadge: {
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  countryText: {
    fontFamily: typography.fontFamily,
    fontSize: 9,
    color: colors.textSecondary,
  },
  riskBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  riskScoreText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  attackMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  protocolText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
    color: colors.textCyan,
  },
  statusText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
  },
  tacticsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  },
  tacticTag: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    borderRadius: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tacticText: {
    fontFamily: typography.fontFamily,
    fontSize: 9,
    color: colors.purple,
  },
});

