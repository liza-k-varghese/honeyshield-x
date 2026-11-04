/**
 * HoneyShield X — Domain Navigation Stacks
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DeceptionDashboardScreen } from '../screens/deception/DeceptionDashboardScreen';
import { ThreatIntelScreen } from '../screens/intel/ThreatIntelScreen';
import { CasesListScreen } from '../screens/cases/CasesListScreen';
import { ServiceControlScreen } from '../screens/admin/ServiceControlScreen';
import { AuditLogsScreen } from '../screens/admin/AuditLogsScreen';
import { SettingsScreen } from '../screens/admin/SettingsScreen';
import { NotificationPreferencesScreen } from '../screens/admin/NotificationPreferencesScreen';
import { EmergencyConsoleScreen } from '../screens/admin/EmergencyConsoleScreen';
import { QrPairingScreen } from '../screens/auth/QrPairingScreen';

const DeceptionNav = createNativeStackNavigator();
export const DeceptionStack = () => (
  <DeceptionNav.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
    <DeceptionNav.Screen name="DeceptionDashboard" component={DeceptionDashboardScreen} />
  </DeceptionNav.Navigator>
);

const IntelNav = createNativeStackNavigator();
export const IntelStack = () => (
  <IntelNav.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
    <IntelNav.Screen name="ThreatIntelDashboard" component={ThreatIntelScreen} />
  </IntelNav.Navigator>
);

const CasesNav = createNativeStackNavigator();
export const CasesStack = () => (
  <CasesNav.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
    <CasesNav.Screen name="CasesList" component={CasesListScreen} />
  </CasesNav.Navigator>
);

const AdminNav = createNativeStackNavigator();
export const AdminStack = () => (
  <AdminNav.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
    <AdminNav.Screen name="ServiceControl" component={ServiceControlScreen} />
    <AdminNav.Screen name="AuditLogs" component={AuditLogsScreen} />
    <AdminNav.Screen name="NotificationPreferences" component={NotificationPreferencesScreen} />
    <AdminNav.Screen name="EmergencyConsole" component={EmergencyConsoleScreen} />
    <AdminNav.Screen name="QrPairing" component={QrPairingScreen} />
    <AdminNav.Screen name="Settings" component={SettingsScreen} />
  </AdminNav.Navigator>
);

