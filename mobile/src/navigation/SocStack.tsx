/**
 * HoneyShield X — System 1: SOC Command Navigation Stack
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SocDashboardScreen } from '../screens/soc/SocDashboardScreen';
import { AlertsListScreen } from '../screens/soc/AlertsListScreen';
import { AlertDetailScreen } from '../screens/soc/AlertDetailScreen';
import { AttackExplorerScreen } from '../screens/soc/AttackExplorerScreen';

const Stack = createNativeStackNavigator();

export const SocStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="SocDashboard" component={SocDashboardScreen} />
      <Stack.Screen name="AlertsList" component={AlertsListScreen} />
      <Stack.Screen name="AlertDetail" component={AlertDetailScreen} />
      <Stack.Screen name="AttackExplorer" component={AttackExplorerScreen} />
    </Stack.Navigator>
  );
};

