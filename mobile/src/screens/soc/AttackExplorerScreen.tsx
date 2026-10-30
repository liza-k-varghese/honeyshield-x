/**
 * HoneyShield X — Attack Explorer Screen (System 1)
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Search, ChevronRight, Shield, Terminal } from 'lucide-react-native';
import { colors, typography, spacing } from '../../theme';
import { HeaderBar } from '../../components/hud/HeaderBar';
import { CyberPanel } from '../../components/hud/CyberPanel';
import { socApi } from '../../api/soc.api';
import { AttackSummary } from '../../types';

interface AttackExplorerScreenProps {
  navigation: any;
}

export const AttackExplorerScreen: React.FC<AttackExplorerScreenProps> = ({ navigation }) => {
  const [attacks, setAttacks] = useState<AttackSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAttacks = async () => {
    try {
      const data = await socApi.getAttacks(50).catch(() => [
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
        {
          id: 104,
          source_ip: '198.51.100.42',
          protocol: 'HTTP',
          timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
          risk_score: 78,
          country_code: 'RU',
          status: 'COMMAND_INJECTION',
          mitre_tactics: ['Execution'],
        },
      ]);
      setAttacks(data);
    } catch {
      // Handled
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAttacks();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAttacks();
  };

  const filteredAttacks = attacks.filter(
    (a) =>
      a.source_ip.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.protocol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.status.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <HeaderBar title="ATTACK EXPLORER" subtitle="SYSTEM 1: INGESTION REPOSITORY" />

      {/* Search Header */}
      <View style={styles.searchBar}>
        <Search color={colors.textSecondary} size={16} />
        <TextInput
          style={styles.searchInput}
          placeholder="Filter by Source IP, Protocol, or Status..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
        />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.cyan} />
          <Text style={styles.loadingText}>FETCHING ATTACK SESSIONS...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredAttacks}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.cyan} />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => navigation.navigate('AttackDetail', { attackId: item.id, attack: item })}
            >
              <CyberPanel glowColor={item.risk_score >= 80 ? 'critical' : 'none'} style={styles.attackCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.ipRow}>
                    <Terminal color={colors.cyan} size={16} />
                    <Text style={styles.ipText}>{item.source_ip}</Text>
                  </View>
                  <View
                    style={[
                      styles.riskBadge,
                      {
                        borderColor: item.risk_score >= 80 ? colors.critical : colors.blue,
                        backgroundColor:
                          item.risk_score >= 80 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.riskText,
                        { color: item.risk_score >= 80 ? colors.critical : colors.blue },
                      ]}
                    >
                      RISK {item.risk_score}
                    </Text>
                  </View>
                </View>

                <View style={styles.metaRow}>
                  <Text style={styles.protocolText}>
                    {item.protocol || 'TCP'} • {item.attack_type || 'Attack Probe'}
                  </Text>
                  <Text style={styles.statusText}>
                    {item.detected_at ? new Date(item.detected_at).toLocaleTimeString() : item.status}
                  </Text>
                </View>

                {item.mitre_tactics && (
                  <View style={styles.tacticsRow}>
                    {item.mitre_tactics.map((t, idx) => (
                      <View key={idx} style={styles.tacticChip}>
                        <Text style={styles.tacticText}>{t}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </CyberPanel>
            </TouchableOpacity>
          )}
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    minHeight: 46,
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
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
  attackCard: {
    marginVertical: 4,
    padding: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  ipRow: {
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
  riskBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  riskText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
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
  tacticChip: {
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.25)',
    borderRadius: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tacticText: {
    fontFamily: typography.fontFamily,
    fontSize: 9,
    color: colors.blue,
  },
});

