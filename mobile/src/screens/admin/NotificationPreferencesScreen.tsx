/**
 * Operator Notification Preferences Screen (Phase 3).
 *
 * Configures real-time push filters, minimum severity thresholds,
 * category toggles, and quiet hours.
 */

import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Bell, Check, Clock, Moon, ShieldAlert, Sliders, Zap } from 'lucide-react-native';
import { eventsApi } from '../../api/events.api';
import { OperatorNotificationPreferences } from '../../types';

export const NotificationPreferencesScreen: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState<OperatorNotificationPreferences>({
    min_severity: 'HIGH',
    enable_canary_push: true,
    enable_governor_stepup_push: true,
    enable_service_failure_push: true,
    quiet_hours_enabled: false,
    quiet_hours_start: '22:00',
    quiet_hours_end: '07:00',
    categories: ['attacks', 'alerts', 'deception', 'incidents', 'service'],
  });

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const data = await eventsApi.getPreferences();
      setPrefs(data);
    } catch (e) {
      console.warn('Failed to load preferences:', e);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    try {
      setSaving(true);
      await eventsApi.updatePreferences(prefs);
      Alert.alert('Settings Synchronized', 'Mobile notification filters updated across all active devices.');
    } catch (e: any) {
      Alert.alert('Sync Failed', e?.response?.data?.detail || 'Failed to persist preferences.');
    } finally {
      setSaving(false);
    }
  };

  const toggleCategory = (cat: string) => {
    setPrefs((prev) => {
      const exists = prev.categories.includes(cat);
      const updated = exists ? prev.categories.filter((c) => c !== cat) : [...prev.categories, cat];
      return { ...prev, categories: updated };
    });
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#00f0ff" />
        <Text style={styles.loadingText}>Loading Operator Preferences...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Bell size={24} color="#00f0ff" />
        <View style={styles.headerText}>
          <Text style={styles.title}>PUSH NOTIFICATIONS & FILTERS</Text>
          <Text style={styles.subtitle}>Deterministic Threat Filtering Matrix</Text>
        </View>
      </View>

      {/* Minimum Severity Selector */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <ShieldAlert size={18} color="#00f0ff" />
          <Text style={styles.cardTitle}>MINIMUM ALERT SEVERITY</Text>
        </View>
        <Text style={styles.cardDescription}>
          Select the lowest alert priority permitted to dispatch push notifications to your device.
        </Text>
        <View style={styles.severityGrid}>
          {(['CRITICAL', 'HIGH', 'MEDIUM', 'ALL'] as const).map((sev) => {
            const isSelected = prefs.min_severity === sev;
            return (
              <TouchableOpacity
                key={sev}
                style={[styles.severityBtn, isSelected && styles.severityBtnActive]}
                onPress={() => setPrefs({ ...prefs, min_severity: sev })}
              >
                <Text style={[styles.severityBtnText, isSelected && styles.severityBtnTextActive]}>
                  {sev}
                </Text>
                {isSelected && <Check size={14} color="#00f0ff" />}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Security Domain Categories */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Sliders size={18} color="#00f0ff" />
          <Text style={styles.cardTitle}>AUTHORIZED DOMAIN CATEGORIES</Text>
        </View>
        {[
          { key: 'alerts', label: 'SOC Security Alerts', desc: 'Critical rule escalations & multi-vector correlations' },
          { key: 'attacks', label: 'Hostile Attack Telemetry', desc: 'Honeypot probe ingestion & exploit attempts' },
          { key: 'deception', label: 'Active Deception Grid', desc: 'Canary honeytoken & tripwire triggers' },
          { key: 'incidents', label: 'Incident Cases & SOAR', desc: 'Case escalations & playbook updates' },
          { key: 'service', label: 'Supervised Host Services', desc: 'Daemon restarts & supervisor health' },
        ].map((item) => {
          const isEnabled = prefs.categories.includes(item.key);
          return (
            <View key={item.key} style={styles.toggleRow}>
              <View style={styles.toggleText}>
                <Text style={styles.toggleLabel}>{item.label}</Text>
                <Text style={styles.toggleDesc}>{item.desc}</Text>
              </View>
              <Switch
                value={isEnabled}
                onValueChange={() => toggleCategory(item.key)}
                trackColor={{ false: '#1e293b', true: '#0369a1' }}
                thumbColor={isEnabled ? '#00f0ff' : '#64748b'}
              />
            </View>
          );
        })}
      </View>

      {/* Quiet Hours */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Moon size={18} color="#a855f7" />
          <Text style={styles.cardTitle}>QUIET HOURS POLICY</Text>
        </View>
        <Text style={styles.cardDescription}>
          Suppress non-critical notifications between scheduled hours. Critical severity overrides quiet hours.
        </Text>
        <View style={styles.toggleRow}>
          <View style={styles.toggleText}>
            <Text style={styles.toggleLabel}>Enable Quiet Hours</Text>
            <Text style={styles.toggleDesc}>
              {prefs.quiet_hours_start} to {prefs.quiet_hours_end} UTC
            </Text>
          </View>
          <Switch
            value={prefs.quiet_hours_enabled}
            onValueChange={(val) => setPrefs({ ...prefs, quiet_hours_enabled: val })}
            trackColor={{ false: '#1e293b', true: '#6b21a8' }}
            thumbColor={prefs.quiet_hours_enabled ? '#a855f7' : '#64748b'}
          />
        </View>
      </View>

      {/* Save Button */}
      <TouchableOpacity
        style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
        onPress={savePreferences}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator size="small" color="#030712" />
        ) : (
          <>
            <Zap size={18} color="#030712" />
            <Text style={styles.saveBtnText}>PERSIST NOTIFICATION FILTERS</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030712',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#030712',
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 12,
    fontSize: 14,
    fontFamily: 'monospace',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    paddingBottom: 16,
  },
  headerText: {
    marginLeft: 12,
  },
  title: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
    fontFamily: 'monospace',
  },
  subtitle: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  card: {
    backgroundColor: '#0b1329',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    color: '#00f0ff',
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginLeft: 8,
    fontFamily: 'monospace',
  },
  cardDescription: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 16,
    lineHeight: 18,
  },
  severityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  severityBtn: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1f2937',
    borderRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 6,
  },
  severityBtnActive: {
    borderColor: '#00f0ff',
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
  },
  severityBtnText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  severityBtnTextActive: {
    color: '#00f0ff',
    fontWeight: 'bold',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#111827',
  },
  toggleText: {
    flex: 1,
    paddingRight: 12,
  },
  toggleLabel: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '500',
  },
  toggleDesc: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
  },
  saveBtn: {
    backgroundColor: '#00f0ff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 6,
    marginTop: 8,
    gap: 8,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: '#030712',
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 1,
    fontFamily: 'monospace',
  },
});

