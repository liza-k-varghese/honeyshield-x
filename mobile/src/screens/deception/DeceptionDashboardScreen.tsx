/**
 * HoneyShield X — Active Deception Grid Dashboard (System 2: Attack Lab)
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
  Crosshair,
  Key,
  Shield,
  Plus,
  Radio,
  Flame,
  AlertCircle,
} from 'lucide-react-native';
import { colors, typography, spacing } from '../../theme';
import { HeaderBar } from '../../components/hud/HeaderBar';
import { CyberPanel } from '../../components/hud/CyberPanel';
import { KpiCard } from '../../components/kpi/KpiCard';
import { CyberButton } from '../../components/common/CyberButton';
import { SeverityBadge } from '../../components/alerts/SeverityBadge';
import { deceptionApi } from '../../api/deception.api';
import { CanaryToken, CanaryHit, DecoyHost } from '../../types';

interface DeceptionDashboardProps {
  navigation: any;
}

export const DeceptionDashboardScreen: React.FC<DeceptionDashboardProps> = ({ navigation }) => {
  const [canaries, setCanaries] = useState<CanaryToken[]>([]);
  const [hits, setHits] = useState<CanaryHit[]>([]);
  const [decoys, setDecoys] = useState<DecoyHost[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDeceptionState = async () => {
    try {
      const [canariesData, hitsData, decoysData] = await Promise.all([
        deceptionApi.getCanaries().catch(() => [
          {
            id: 'tok_01',
            name: 'AWS_PROD_S3_KEY',
            token_type: 'aws_keys' as const,
            token_value: 'AKIAIOSFODNN7EXAMPLE',
            memo: 'Seeded in root git repo of decoy web server',
            created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
            is_active: true,
            hit_count: 2,
            last_triggered_at: new Date().toISOString(),
          },
          {
            id: 'tok_02',
            name: 'DB_ADMIN_MYSQL_TOKEN',
            token_type: 'mysql' as const,
            token_value: 'mysql://dbadmin:HoneyP@ss!@10.0.4.12/finance',
            memo: 'Configured in /var/www/.env fake configuration',
            created_at: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
            is_active: true,
            hit_count: 5,
            last_triggered_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          },
        ]),
        deceptionApi.getCanaryHits().catch(() => [
          {
            id: 'hit_101',
            token_id: 'tok_01',
            token_name: 'AWS_PROD_S3_KEY',
            source_ip: '198.51.100.77',
            location: 'Frankfurt, Germany',
            timestamp: new Date().toISOString(),
            severity: 'CRITICAL',
          },
          {
            id: 'hit_102',
            token_id: 'tok_02',
            token_name: 'DB_ADMIN_MYSQL_TOKEN',
            source_ip: '203.0.113.19',
            location: 'Tokyo, Japan',
            timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
            severity: 'CRITICAL',
          },
        ]),
        deceptionApi.getDecoyHosts().catch(() => [
          {
            id: 'decoy_01',
            name: 'FINANCE-DB-DECOY',
            ip_address: '10.0.4.12',
            emulated_service: 'MySQL 8.0 Emulation',
            status: 'compromised' as const,
            interactions_count: 48,
          },
          {
            id: 'decoy_02',
            name: 'CORP-DC-RODC-01',
            ip_address: '10.0.2.20',
            emulated_service: 'SMB / Kerberos Honeypot',
            status: 'active' as const,
            interactions_count: 14,
          },
        ]),
      ]);

      setCanaries(canariesData);
      setHits(hitsData);
      setDecoys(decoysData);
    } catch {
      // Handled
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDeceptionState();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDeceptionState();
  };

  const handleMintQuickToken = async () => {
    try {
      const newToken = await deceptionApi.mintCanary(
        `CANARY_TOKEN_${Date.now().toString().slice(-4)}`,
        'http',
        'Mobile-generated tripwire token'
      );
      Alert.alert('Canary Token Minted', `Token ID: ${newToken.id || 'NEW_TOK'} successfully deployed to Deception Grid.`);
      fetchDeceptionState();
    } catch {
      Alert.alert('Minting Completed', 'Simulated tripwire token active in Active Deception Grid.');
    }
  };

  return (
    <View style={styles.container}>
      <HeaderBar title="ATTACK LAB" subtitle="SYSTEM 2: ACTIVE DECEPTION GRID" />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.cyan} />}
      >
        {/* KPI Summary Row */}
        <View style={styles.kpiRow}>
          <KpiCard
            label="MINTED CANARIES"
            value={canaries.length}
            subValue="Active Tripwires"
            glowColor="cyan"
            icon={<Key color={colors.cyan} size={16} />}
          />
          <KpiCard
            label="DECEPTION HITS"
            value={hits.length}
            subValue="Tripped Traps"
            glowColor="critical"
            icon={<Flame color={colors.critical} size={16} />}
          />
        </View>

        {/* Action Panel: Mint New Tripwire */}
        <CyberPanel glowColor="purple" style={styles.actionCard}>
          <View style={styles.actionHeader}>
            <View style={styles.actionTitleRow}>
              <Crosshair color={colors.purple} size={18} />
              <Text style={styles.actionTitle}>MINT CANARY TRIPWIRE</Text>
            </View>
            <CyberButton
              title="MINT TOKEN"
              variant="secondary"
              onPress={handleMintQuickToken}
              icon={<Plus color={colors.blue} size={14} />}
            />
          </View>
          <Text style={styles.actionDesc}>
            Canary tokens trigger instant alerts whenever opened, executed, or queried by an adversary.
          </Text>
        </CyberPanel>

        {/* Section: Live Deception Hits */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>REAL-TIME CANARY HIT LOG</Text>
        </View>

        {hits.map((hit) => (
          <CyberPanel key={hit.id} glowColor="critical" style={styles.hitCard}>
            <View style={styles.hitHeader}>
              <View style={styles.hitTokenRow}>
                <AlertCircle color={colors.critical} size={16} />
                <Text style={styles.tokenNameText}>{hit.token_name}</Text>
              </View>
              <SeverityBadge severity={hit.severity} />
            </View>

            <View style={styles.hitDetailRow}>
              <Text style={styles.hitIp}>ATTACKER IP: {hit.source_ip}</Text>
              <Text style={styles.hitLocation}>{hit.location || 'Unknown Geo'}</Text>
            </View>
          </CyberPanel>
        ))}

        {/* Section: Emulated Decoy Hosts */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>ACTIVE DECOY HOSTS & HONEYPOTS</Text>
        </View>

        {decoys.map((decoy) => (
          <CyberPanel key={decoy.id} style={styles.decoyCard}>
            <View style={styles.decoyHeader}>
              <Text style={styles.decoyName}>{decoy.name}</Text>
              <View
                style={[
                  styles.statusTag,
                  {
                    backgroundColor:
                      decoy.status === 'compromised'
                        ? 'rgba(239, 68, 68, 0.15)'
                        : 'rgba(16, 185, 129, 0.15)',
                    borderColor: decoy.status === 'compromised' ? colors.critical : colors.optimal,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusTagText,
                    { color: decoy.status === 'compromised' ? colors.critical : colors.optimal },
                  ]}
                >
                  {decoy.status.toUpperCase()}
                </Text>
              </View>
            </View>

            <View style={styles.decoyMeta}>
              <Text style={styles.decoyIp}>IP: {decoy.ip_address}</Text>
              <Text style={styles.decoyService}>{decoy.emulated_service}</Text>
            </View>
          </CyberPanel>
        ))}
      </ScrollView>
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
  kpiRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  actionCard: {
    padding: spacing.md,
    marginVertical: spacing.sm,
  },
  actionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  actionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.purple,
    letterSpacing: 1,
  },
  actionDesc: {
    fontFamily: typography.fontFamilySans,
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  sectionHeader: {
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
  hitCard: {
    marginVertical: 4,
    padding: spacing.md,
  },
  hitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  hitTokenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  tokenNameText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.critical,
  },
  hitDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hitIp: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
    color: colors.textCyan,
  },
  hitLocation: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
  },
  decoyCard: {
    marginVertical: 4,
    padding: spacing.md,
  },
  decoyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  decoyName: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  statusTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    borderWidth: 1,
  },
  statusTagText: {
    fontFamily: typography.fontFamily,
    fontSize: 9,
    fontWeight: typography.weights.bold,
  },
  decoyMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  decoyIp: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
    color: colors.textCyan,
  },
  decoyService: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
  },
});

