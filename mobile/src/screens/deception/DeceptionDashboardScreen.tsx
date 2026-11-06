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
  ActivityIndicator,
} from 'react-native';
import {
  Crosshair,
  Key,
  Shield,
  Plus,
  Radio,
  Flame,
  AlertCircle,
  RefreshCw,
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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchDeceptionState = async () => {
    try {
      setErrorMessage(null);
      const [canariesData, hitsData, decoysData] = await Promise.all([
        deceptionApi.getCanaries(),
        deceptionApi.getCanaryHits(),
        deceptionApi.getDecoyHosts(),
      ]);

      setCanaries(Array.isArray(canariesData) ? canariesData : []);
      setHits(Array.isArray(hitsData) ? hitsData : []);
      setDecoys(Array.isArray(decoysData) ? decoysData : []);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to connect to Deception API service.');
    } finally {
      setLoading(false);
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
    } catch (err: any) {
      Alert.alert('Minting Error', err?.message || 'Failed to mint canary token. Please check backend connection.');
    }
  };

  return (
    <View style={styles.container}>
      <HeaderBar title="ATTACK LAB" subtitle="SYSTEM 2: ACTIVE DECEPTION GRID" />

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
            <TouchableOpacity style={styles.retryButton} onPress={fetchDeceptionState}>
              <RefreshCw color={colors.textCyan} size={14} />
              <Text style={styles.retryButtonText}>RETRY CONNECTIVITY</Text>
            </TouchableOpacity>
          </CyberPanel>
        )}

        {/* KPI Summary Row */}
        <View style={styles.kpiRow}>
          <KpiCard
            label="MINTED CANARIES"
            value={loading ? '--' : canaries.length}
            subValue="Active Tripwires"
            glowColor="cyan"
            icon={<Key color={colors.cyan} size={16} />}
          />
          <KpiCard
            label="DECEPTION HITS"
            value={loading ? '--' : hits.length}
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

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="small" color={colors.cyan} />
            <Text style={styles.loadingText}>SYNCING DECEPTION TELEMETRY...</Text>
          </View>
        ) : hits.length === 0 ? (
          <CyberPanel glowColor="optimal" style={styles.emptyPanel}>
            <Text style={styles.emptyText}>NO DECEPTION TRIPS RECORDED</Text>
            <Text style={styles.emptySubtext}>Canary tripwires are primed and monitored.</Text>
          </CyberPanel>
        ) : (
          hits.map((hit) => (
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
          ))
        )}

        {/* Section: Emulated Decoy Hosts */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>ACTIVE DECOY HOSTS & HONEYPOTS</Text>
        </View>

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="small" color={colors.purple} />
            <Text style={styles.loadingText}>PROBING DECOY MESH...</Text>
          </View>
        ) : decoys.length === 0 ? (
          <CyberPanel glowColor="blue" style={styles.emptyPanel}>
            <Text style={styles.emptyText}>NO ACTIVE DECOY HOSTS DEPLOYED</Text>
            <Text style={styles.emptySubtext}>Honeypot nodes report telemetry once provisioned.</Text>
          </CyberPanel>
        ) : (
          decoys.map((decoy) => (
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
          ))
        )}
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

