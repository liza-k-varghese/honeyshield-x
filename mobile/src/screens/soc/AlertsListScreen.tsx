/**
 * HoneyShield X — Alerts List & Triage Screen (System 1)
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { ShieldAlert, Filter, ChevronRight } from 'lucide-react-native';
import { colors, typography, spacing } from '../../theme';
import { HeaderBar } from '../../components/hud/HeaderBar';
import { CyberPanel } from '../../components/hud/CyberPanel';
import { SeverityBadge } from '../../components/alerts/SeverityBadge';
import { socApi } from '../../api/soc.api';
import { AlertItem, AlertSeverity, AlertStatus } from '../../types';

interface AlertsListScreenProps {
  navigation: any;
}

const SEVERITY_FILTERS = ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

export const AlertsListScreen: React.FC<AlertsListScreenProps> = ({ navigation }) => {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [selectedSeverity, setSelectedSeverity] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAlerts = async () => {
    try {
      const data = await socApi.getAlerts().catch(() => [
        {
          id: 1,
          title: 'Automated SSH Credential Stuffing',
          description: 'High frequency authentication failures detected from single source IP across multiple privileged accounts.',
          severity: 'CRITICAL' as AlertSeverity,
          status: 'NEW' as AlertStatus,
          source_ip: '192.168.1.144',
          risk_score: 95,
          vector: 'SSH_BRUTE_FORCE',
          created_at: new Date().toISOString(),
          mitre_technique: 'T1110.004',
        },
        {
          id: 2,
          title: 'SQL Injection in Auth Endpoint',
          description: 'Union-based SQL injection pattern intercepted by Multi-Vector Detection Engine.',
          severity: 'HIGH' as AlertSeverity,
          status: 'INVESTIGATING' as AlertStatus,
          source_ip: '10.0.2.18',
          risk_score: 84,
          vector: 'SQL_INJECTION',
          created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
          mitre_technique: 'T1190',
        },
        {
          id: 3,
          title: 'Canary Honey-Token Accessed',
          description: 'Active Deception alert: Honey credential was read in decoys repository.',
          severity: 'CRITICAL' as AlertSeverity,
          status: 'NEW' as AlertStatus,
          source_ip: '172.16.4.200',
          risk_score: 98,
          vector: 'CANARY_DECEPTION',
          created_at: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
          mitre_technique: 'T1552',
        },
        {
          id: 4,
          title: 'Port Scan Sweeping Decoy Subnet',
          description: 'Horizontal SYN scan targeting ports 22, 80, 443, 3389.',
          severity: 'MEDIUM' as AlertSeverity,
          status: 'CLOSED' as AlertStatus,
          source_ip: '45.33.32.156',
          risk_score: 55,
          vector: 'RECONNAISSANCE',
          created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
          mitre_technique: 'T1046',
        },
      ]);
      setAlerts(data);
    } catch {
      // Handled
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAlerts();
  };

  const filteredAlerts = alerts.filter((alert) => {
    if (selectedSeverity === 'ALL') return true;
    return alert.severity.toUpperCase() === selectedSeverity;
  });

  const renderAlertItem = ({ item }: { item: AlertItem }) => (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={() => navigation.navigate('AlertDetail', { alertId: item.id, alert: item })}
    >
      <CyberPanel
        glowColor={item.severity === 'CRITICAL' ? 'critical' : 'none'}
        style={styles.alertCard}
      >
        <View style={styles.cardTopRow}>
          <SeverityBadge severity={item.severity} />
          <View style={styles.statusPill}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>

        <Text style={styles.alertTitle}>{item.title}</Text>
        <Text style={styles.alertDesc} numberOfLines={2}>
          {item.description}
        </Text>

        <View style={styles.cardFooter}>
          <Text style={styles.sourceIpText}>SRC: {item.source_ip}</Text>
          <View style={styles.actionRow}>
            <Text style={styles.riskText}>RISK {item.risk_score}</Text>
            <ChevronRight color={colors.textSecondary} size={16} />
          </View>
        </View>
      </CyberPanel>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <HeaderBar title="ALERTS TRIAGE" subtitle="MULTI-VECTOR THREAT DETECTION" />

      {/* Filter Horizontal Scroll */}
      <View style={styles.filterContainer}>
        <Filter color={colors.textSecondary} size={14} style={{ marginRight: 6 }} />
        {SEVERITY_FILTERS.map((filter) => {
          const isActive = selectedSeverity === filter;
          return (
            <TouchableOpacity
              key={filter}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              onPress={() => setSelectedSeverity(filter)}
            >
              <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                {filter}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.cyan} />
          <Text style={styles.loadingText}>LOADING ACTIVE ALERTS...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredAlerts}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderAlertItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.cyan}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <ShieldAlert color={colors.textMuted} size={40} />
              <Text style={styles.emptyText}>NO ALERTS MATCHING FILTER</Text>
            </View>
          }
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
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surfaceElevated,
  },
  filterChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 6,
  },
  filterChipActive: {
    borderColor: colors.cyan,
    backgroundColor: 'rgba(0, 240, 255, 0.15)',
  },
  filterText: {
    fontFamily: typography.fontFamily,
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: typography.weights.bold,
  },
  filterTextActive: {
    color: colors.cyan,
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
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  alertCard: {
    marginVertical: 4,
    padding: spacing.md,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  statusPill: {
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusText: {
    fontFamily: typography.fontFamily,
    fontSize: 9,
    color: colors.textSecondary,
  },
  alertTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  alertDesc: {
    fontFamily: typography.fontFamilySans,
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    lineHeight: 16,
    marginBottom: spacing.sm,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.xs,
  },
  sourceIpText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
    color: colors.textCyan,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  riskText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.critical,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: spacing.sm,
  },
  emptyText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    letterSpacing: 1,
  },
});

