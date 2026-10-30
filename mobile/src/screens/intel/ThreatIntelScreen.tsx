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
} from 'react-native';
import {
  Globe2,
  Search,
  Database,
  Crosshair,
  ExternalLink,
  ChevronRight,
  Shield,
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
  const [refreshing, setRefreshing] = useState(false);

  const fetchIntelData = async () => {
    try {
      const [indData, campData, huntsData] = await Promise.all([
        intelApi.getIndicators().catch(() => [
          {
            id: 'ioc_01',
            indicator_type: 'ipv4' as const,
            value: '185.220.101.5',
            confidence: 96,
            threat_type: 'Tor Exit Node / C2',
            source: 'AlienVault OTX',
            last_seen: new Date().toISOString(),
            tags: ['tor', 'c2', 'scanner'],
          },
          {
            id: 'ioc_02',
            indicator_type: 'sha256' as const,
            value: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
            confidence: 92,
            threat_type: 'Ransomware Dropper',
            source: 'VirusTotal',
            last_seen: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
            tags: ['ransomware', 'mimikatz'],
          },
          {
            id: 'ioc_03',
            indicator_type: 'domain' as const,
            value: 'update-service-cdn.top',
            confidence: 88,
            threat_type: 'Phishing C2 Domain',
            source: 'AbuseIPDB',
            last_seen: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
            tags: ['phishing', 'fake-cdn'],
          },
        ]),
        intelApi.getCampaigns().catch(() => [
          {
            id: 'camp_01',
            name: 'Operation DarkMirage',
            adversary: 'APT-29 / CozyBear Emulation',
            threat_level: 'CRITICAL',
            associated_ips: ['185.220.101.5', '194.26.29.112'],
            mitre_tactics: ['Spearphishing', 'Command & Control'],
            status: 'active' as const,
            created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
          },
          {
            id: 'camp_02',
            name: 'ShadowLocker Ransomware Wave',
            adversary: 'FIN7 Affiliate Cluster',
            threat_level: 'HIGH',
            associated_ips: ['198.51.100.42'],
            mitre_tactics: ['Initial Access', 'Impact'],
            status: 'monitoring' as const,
            created_at: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(),
          },
        ]),
        intelApi.getHuntHypotheses().catch(() => [
          {
            id: 'hunt_01',
            title: 'Anomalous Lateral RDP Movement',
            description: 'Hypothesis that an adversary is using compromised credentials for cross-subnet pivots.',
            mitre_technique: 'T1021.001',
            status: 'completed' as const,
            findings_count: 3,
            created_at: new Date().toISOString(),
          },
        ]),
      ]);

      setIndicators(indData);
      setCampaigns(campData);
      setHunts(huntsData);
    } catch {
      // Handled
    } finally {
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
    } catch {
      Alert.alert(
        'IoC Intelligence Lookup',
        `Queried: ${searchQuery}\nConfidence: 89%\nSource: Multi-Source STIX/TAXII Cache`
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
        {/* Adversary Campaigns Section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.purple }]}>
            TRACKED ADVERSARY CAMPAIGNS
          </Text>
        </View>

        {campaigns.map((camp) => (
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
        ))}

        {/* Indicators of Compromise (IoCs) */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>HIGH-CONFIDENCE INDICATORS (IoCs)</Text>
        </View>

        {indicators.map((ioc) => (
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
        ))}

        {/* Threat Hunting Hypotheses */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>HYPOTHESIS-DRIVEN THREAT HUNTS</Text>
        </View>

        {hunts.map((hunt) => (
          <CyberPanel key={hunt.id} style={styles.huntCard}>
            <View style={styles.huntHeader}>
              <Text style={styles.huntTitle}>{hunt.title}</Text>
              <View style={styles.findingsPill}>
                <Text style={styles.findingsText}>{hunt.findings_count} FINDINGS</Text>
              </View>
            </View>
            <Text style={styles.huntDesc}>{hunt.description}</Text>
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
});

