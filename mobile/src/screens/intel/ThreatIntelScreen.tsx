/**
 * HoneyShield X — Threat Intelligence & Analysis Screen (System 3)
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  Globe2,
  Search,
  Database,
  Crosshair,
  ExternalLink,
  ChevronRight,
  Shield,
  AlertCircle,
  RefreshCw,
} from 'lucide-react-native';
import { colors, typography, spacing } from '../../theme';
import { HeaderBar } from '../../components/hud/HeaderBar';
import { CyberPanel } from '../../components/hud/CyberPanel';
import { CyberButton } from '../../components/common/CyberButton';
import { SeverityBadge } from '../../components/alerts/SeverityBadge';
import { intelApi } from '../../api/intel.api';
import { ThreatIndicator, Campaign, HuntHypothesis } from '../../types';

interface ThreatIntelScreenProps {
  navigation: any;
}

export const ThreatIntelScreen: React.FC<ThreatIntelScreenProps> = ({ navigation }) => {
  const [indicators, setIndicators] = useState<ThreatIndicator[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [hunts, setHunts] = useState<HuntHypothesis[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchIntelData = async () => {
    try {
      setErrorMessage(null);
      const [indData, campData, huntsData] = await Promise.all([
        intelApi.getIndicators(),
        intelApi.getCampaigns(),
        intelApi.getHuntHypotheses(),
      ]);

      setIndicators(Array.isArray(indData) ? indData : []);
      setCampaigns(Array.isArray(campData) ? campData : []);
      setHunts(Array.isArray(huntsData) ? huntsData : []);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to connect to Threat Intelligence service.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchIntelData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchIntelData();
  };

  const handleLookup = async () => {
    if (!searchQuery.trim()) return;
    try {
      const res = await intelApi.lookupIndicator(searchQuery.trim());
      Alert.alert(
        'IoC Intelligence Result',
        `Value: ${res.value || searchQuery}\nType: ${res.threat_type || 'Malicious Actor'}\nConfidence: ${res.confidence || 90}%`
      );
    } catch (err: any) {
      Alert.alert(
        'IoC Intelligence Lookup Failed',
        err?.message || `No threat intelligence records matched "${searchQuery}".`
      );
    }
  };

  return (
    <View style={styles.container}>
      <HeaderBar title="THREAT INTEL" subtitle="SYSTEM 3: ADVERSARY ANALYSIS" />

      {/* Global IoC Lookup Bar */}
      <View style={styles.searchBar}>
        <Search color={colors.textSecondary} size={16} />
        <TextInput
          style={styles.searchInput}
          placeholder="Lookup IP, Hash, Domain, or CVE..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleLookup}
          autoCapitalize="none"
        />
        <TouchableOpacity style={styles.lookupBtn} onPress={handleLookup}>
          <Text style={styles.lookupBtnText}>QUERY</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.purple} />}
      >
        {errorMessage && (
          <CyberPanel glowColor="critical" style={styles.errorPanel}>
            <View style={styles.errorHeader}>
              <AlertCircle color={colors.critical} size={16} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
            <TouchableOpacity style={styles.retryButton} onPress={fetchIntelData}>
              <RefreshCw color={colors.textCyan} size={14} />
              <Text style={styles.retryButtonText}>RETRY CONNECTIVITY</Text>
            </TouchableOpacity>
          </CyberPanel>
        )}

        {/* Adversary Campaigns Section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.purple }]}>
            TRACKED ADVERSARY CAMPAIGNS
          </Text>
        </View>

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="small" color={colors.purple} />
            <Text style={styles.loadingText}>QUERYING CAMPAIGN INTEL...</Text>
          </View>
        ) : campaigns.length === 0 ? (
          <CyberPanel glowColor="purple" style={styles.emptyPanel}>
            <Text style={styles.emptyText}>NO ACTIVE CAMPAIGNS TRACKED</Text>
            <Text style={styles.emptySubtext}>Adversary campaign telemetry will appear when detected.</Text>
          </CyberPanel>
        ) : (
          campaigns.map((camp) => (
            <CyberPanel key={camp.id} glowColor="purple" style={styles.campCard}>
              <View style={styles.campHeader}>
                <View style={styles.campTitleRow}>
                  <Globe2 color={colors.purple} size={18} />
                  <Text style={styles.campName}>{camp.name}</Text>
                </View>
                <SeverityBadge severity={camp.threat_level} />
              </View>

              <Text style={styles.campAdversary}>ACTOR: {camp.adversary}</Text>

              <View style={styles.tacticsRow}>
                {camp.mitre_tactics.map((t, idx) => (
                  <View key={idx} style={styles.tacticTag}>
                    <Text style={styles.tacticText}>{t}</Text>
                  </View>
                ))}
              </View>
            </CyberPanel>
          ))
        )}

        {/* Indicators of Compromise (IoCs) */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>HIGH-CONFIDENCE INDICATORS (IoCs)</Text>
        </View>

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="small" color={colors.cyan} />
            <Text style={styles.loadingText}>SYNCING STIX/TAXII INDICATORS...</Text>
          </View>
        ) : indicators.length === 0 ? (
          <CyberPanel glowColor="blue" style={styles.emptyPanel}>
            <Text style={styles.emptyText}>NO INDICATORS INDEXED</Text>
            <Text style={styles.emptySubtext}>Feed ingestion active. No IoCs currently match query threshold.</Text>
          </CyberPanel>
        ) : (
          indicators.map((ioc) => (
            <CyberPanel key={ioc.id} style={styles.iocCard}>
              <View style={styles.iocHeader}>
                <Text style={styles.iocValue}>{ioc.value}</Text>
                <View style={styles.confidencePill}>
                  <Text style={styles.confidenceText}>{ioc.confidence}% CONFIDENCE</Text>
                </View>
              </View>

              <View style={styles.iocMetaRow}>
                <Text style={styles.iocType}>{ioc.threat_type}</Text>
                <Text style={styles.iocSource}>SOURCE: {ioc.source}</Text>
              </View>
            </CyberPanel>
          ))
        )}

        {/* Threat Hunting Hypotheses */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>HYPOTHESIS-DRIVEN THREAT HUNTS</Text>
        </View>

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="small" color={colors.optimal} />
            <Text style={styles.loadingText}>EVALUATING HUNT HYPOTHESES...</Text>
          </View>
        ) : hunts.length === 0 ? (
          <CyberPanel glowColor="optimal" style={styles.emptyPanel}>
            <Text style={styles.emptyText}>NO OPEN THREAT HUNTS</Text>
            <Text style={styles.emptySubtext}>All proactive hunting queries satisfied.</Text>
          </CyberPanel>
        ) : (
          hunts.map((hunt) => (
            <CyberPanel key={hunt.id} style={styles.huntCard}>
              <View style={styles.huntHeader}>
                <Text style={styles.huntTitle}>{hunt.title}</Text>
                <View style={styles.findingsPill}>
                  <Text style={styles.findingsText}>{hunt.findings_count} FINDINGS</Text>
                </View>
              </View>
              <Text style={styles.huntDesc}>{hunt.description}</Text>
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
  lookupBtn: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderColor: colors.purple,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: 4,
  },
  lookupBtnText: {
    fontFamily: typography.fontFamily,
    fontSize: 10,
    color: colors.purple,
    fontWeight: typography.weights.bold,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
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
  campCard: {
    marginVertical: 4,
    padding: spacing.md,
  },
  campHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  campTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  campName: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  campAdversary: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
    color: colors.purple,
    marginBottom: 6,
  },
  tacticsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  tacticTag: {
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.25)',
    borderRadius: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tacticText: {
    fontFamily: typography.fontFamily,
    fontSize: 9,
    color: colors.purple,
  },
  iocCard: {
    marginVertical: 4,
    padding: spacing.md,
  },
  iocHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  iocValue: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.cyan,
    flex: 1,
  },
  confidencePill: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: colors.optimal,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  confidenceText: {
    fontFamily: typography.fontFamily,
    fontSize: 9,
    fontWeight: typography.weights.bold,
    color: colors.optimal,
  },
  iocMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iocType: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
    color: colors.textPrimary,
  },
  iocSource: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
  },
  huntCard: {
    marginVertical: 4,
    padding: spacing.md,
  },
  huntHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  huntTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  findingsPill: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderColor: colors.blue,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  findingsText: {
    fontFamily: typography.fontFamily,
    fontSize: 9,
    fontWeight: typography.weights.bold,
    color: colors.blue,
  },
  huntDesc: {
    fontFamily: typography.fontFamilySans,
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    lineHeight: 16,
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

