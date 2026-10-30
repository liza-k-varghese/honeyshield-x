/**
 * HoneyShield X — Tamper-Evident Operator Audit Trail Screen
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
} from 'react-native';
import { ShieldCheck, User, Calendar, Terminal } from 'lucide-react-native';
import { colors, typography, spacing } from '../../theme';
import { HeaderBar } from '../../components/hud/HeaderBar';
import { CyberPanel } from '../../components/hud/CyberPanel';
import { auditApi } from '../../api/audit.api';
import { AuditLogEntry } from '../../types';

interface AuditLogsScreenProps {
  navigation: any;
}

export const AuditLogsScreen: React.FC<AuditLogsScreenProps> = ({ navigation }) => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLogs = async () => {
    try {
      const data = await auditApi.getAuditLogs();
      setLogs(data);
    } catch {
      // Handled
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLogs();
  };

  return (
    <View style={styles.container}>
      <HeaderBar title="OPERATOR AUDIT" subtitle="TAMPER-EVIDENT ACTION LEDGER" />

      <FlatList
        data={logs}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.cyan} />}
        renderItem={({ item }) => (
          <CyberPanel style={styles.logCard}>
            <View style={styles.logHeader}>
              <View style={styles.operatorRow}>
                <User color={colors.cyan} size={14} />
                <Text style={styles.operatorText}>{item.operator}</Text>
                <View style={styles.roleTag}>
                  <Text style={styles.roleText}>{item.role.toUpperCase()}</Text>
                </View>
              </View>

              <View style={styles.statusPill}>
                <Text style={styles.statusText}>{item.success ? 'SUCCESS' : 'DENIED'}</Text>
              </View>
            </View>

            <View style={styles.actionRow}>
              <Terminal color={colors.purple} size={14} />
              <Text style={styles.actionText}>{item.action.toUpperCase()}</Text>
              {item.target && <Text style={styles.targetText}>→ {item.target}</Text>}
            </View>

            {item.justification && (
              <Text style={styles.justificationText}>
                JUSTIFICATION: "{item.justification}"
              </Text>
            )}

            <View style={styles.logFooter}>
              <Text style={styles.ipText}>CLIENT: {item.ip_address}</Text>
              <Text style={styles.timeText}>
                {new Date(item.timestamp).toLocaleTimeString()}
              </Text>
            </View>
          </CyberPanel>
        )}
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
  logCard: {
    marginVertical: 4,
    padding: spacing.md,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  operatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  operatorText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  roleTag: {
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  roleText: {
    fontFamily: typography.fontFamily,
    fontSize: 8,
    color: colors.cyan,
  },
  statusPill: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  statusText: {
    fontFamily: typography.fontFamily,
    fontSize: 9,
    fontWeight: typography.weights.bold,
    color: colors.optimal,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  actionText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.purple,
  },
  targetText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
    color: colors.textCyan,
  },
  justificationText: {
    fontFamily: typography.fontFamilySans,
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: 6,
  },
  logFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 4,
  },
  ipText: {
    fontFamily: typography.fontFamily,
    fontSize: 9,
    color: colors.textMuted,
  },
  timeText: {
    fontFamily: typography.fontFamily,
    fontSize: 9,
    color: colors.textMuted,
  },
});

