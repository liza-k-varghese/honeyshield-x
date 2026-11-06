/**
 * HoneyShield X — Mobile Digital Agent Status & Journey Panel (System 1 & Digital Agent Universe)
 *
 * Provides cross-platform visibility into the 4 authoritative Digital Agents:
 * - SCOUT (Blue #3B82F6): Sensor collection & canary capture
 * - NEXUS (Cyan #06B6D4): Normalization, queue dispatch & courier transit
 * - ORACLE (Purple #A855F7): Correlation, IOC lookup & threat intelligence
 * - SENTINEL (Red #EF4444): Alert evaluation & incident containment
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Radio, Activity, Globe2, ShieldAlert } from 'lucide-react-native';
import { colors, typography, spacing } from '../../theme';
import { CyberPanel } from '../hud/CyberPanel';
import { RealtimeConnectionState, SecurityEventEnvelope } from '../../types';

interface DigitalAgentStatusPanelProps {
  connectionState: RealtimeConnectionState;
  lastCursor: number;
  latestEvent?: SecurityEventEnvelope | null;
  onSelectAgent?: (agentName: string) => void;
}

export const DigitalAgentStatusPanel: React.FC<DigitalAgentStatusPanelProps> = ({
  connectionState,
  lastCursor,
  latestEvent,
  onSelectAgent,
}) => {
  const activeAgent = latestEvent?.payload?._agent || latestEvent?.payload?.agent || 'SENTINEL';
  const activeStage = latestEvent?.payload?._stage || latestEvent?.payload?.stage || 'monitoring';

  const agents = [
    {
      name: 'SCOUT',
      color: '#3B82F6',
      role: 'Sensor Ingestion',
      territory: 'Perimeter',
      icon: Radio,
      isActive: activeAgent === 'SCOUT',
      status: connectionState === 'connected' ? 'COLLECTING' : 'STANDBY',
    },
    {
      name: 'NEXUS',
      color: '#06B6D4',
      role: 'Pipeline Courier',
      territory: 'Core Dispatch',
      icon: Activity,
      isActive: activeAgent === 'NEXUS',
      status: connectionState === 'connected' ? 'NORMALIZING' : 'STANDBY',
    },
    {
      name: 'ORACLE',
      color: '#A855F7',
      role: 'Threat Intel',
      territory: 'Sanctuary',
      icon: Globe2,
      isActive: activeAgent === 'ORACLE',
      status: connectionState === 'connected' ? 'ENRICHING' : 'STANDBY',
    },
    {
      name: 'SENTINEL',
      color: '#EF4444',
      role: 'SOC Defense',
      territory: 'Command Citadel',
      icon: ShieldAlert,
      isActive: activeAgent === 'SENTINEL',
      status: connectionState === 'connected' ? 'GUARDING' : 'STANDBY',
    },
  ];

  return (
    <CyberPanel
      title="DIGITAL AGENT UNIVERSE"
      badge={`CURSOR: #${lastCursor}`}
      badgeColor={connectionState === 'connected' ? 'cyan' : 'red'}
      style={styles.panel}
    >
      <View style={styles.grid}>
        {agents.map((ag) => {
          const IconComponent = ag.icon;
          return (
            <TouchableOpacity
              key={ag.name}
              style={[
                styles.agentCard,
                { borderColor: ag.isActive ? ag.color : colors.border },
                ag.isActive && { backgroundColor: `${ag.color}15` },
              ]}
              onPress={() => onSelectAgent && onSelectAgent(ag.name)}
              activeOpacity={0.7}
            >
              <View style={styles.agentHeader}>
                <View style={[styles.iconCircle, { backgroundColor: `${ag.color}20` }]}>
                  <IconComponent color={ag.color} size={16} strokeWidth={2} />
                </View>
                <View style={[styles.statusDot, { backgroundColor: ag.color }]} />
              </View>

              <Text style={[styles.agentName, { color: ag.color }]}>{ag.name}</Text>
              <Text style={styles.agentRole}>{ag.role}</Text>

              <View style={styles.badgeRow}>
                <Text style={styles.territoryText}>{ag.territory}</Text>
                <Text style={[styles.statusText, { color: ag.isActive ? ag.color : colors.textMuted }]}>
                  {ag.status}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {latestEvent && (
        <View style={styles.journeyFooter}>
          <Text style={styles.journeyLabel}>LATEST AGENT HANDOFF:</Text>
          <Text style={styles.journeyEvent} numberOfLines={1}>
            {activeAgent} [{activeStage.toUpperCase()}] &rarr; {latestEvent.event_type}
          </Text>
        </View>
      )}
    </CyberPanel>
  );
};

const styles = StyleSheet.create({
  panel: {
    marginBottom: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  agentCard: {
    width: '48%',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderRadius: 6,
    padding: spacing.sm,
  },
  agentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  agentName: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    fontWeight: typography.weights.bold,
    letterSpacing: 1,
  },
  agentRole: {
    fontFamily: typography.fontFamilySans,
    fontSize: 10,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 4,
  },
  territoryText: {
    fontFamily: typography.fontFamily,
    fontSize: 8,
    color: colors.textMuted,
  },
  statusText: {
    fontFamily: typography.fontFamily,
    fontSize: 8,
    fontWeight: typography.weights.bold,
  },
  journeyFooter: {
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  journeyLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 9,
    color: colors.textMuted,
    marginBottom: 2,
  },
  journeyEvent: {
    fontFamily: typography.fontFamily,
    fontSize: 10,
    color: colors.textCyan,
  },
});

