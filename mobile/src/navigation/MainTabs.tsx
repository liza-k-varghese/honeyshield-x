/**
 * HoneyShield X — Bottom Cyber Navigation Tabs
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  ShieldAlert,
  Crosshair,
  Globe2,
  Briefcase,
  Server,
} from 'lucide-react-native';
import { colors, typography, spacing } from '../theme';
import { SocStack } from './SocStack';
import { DeceptionStack, IntelStack, CasesStack, AdminStack } from './DomainStacks';

const Tab = createBottomTabNavigator();

export const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.cyan,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tab.Screen
        name="SocTab"
        component={SocStack}
        options={{
          tabBarLabel: 'SOC',
          tabBarIcon: ({ color, size }) => <ShieldAlert color={color} size={20} />,
        }}
      />
      <Tab.Screen
        name="DeceptionTab"
        component={DeceptionStack}
        options={{
          tabBarLabel: 'LAB',
          tabBarIcon: ({ color, size }) => <Crosshair color={color} size={20} />,
        }}
      />
      <Tab.Screen
        name="IntelTab"
        component={IntelStack}
        options={{
          tabBarLabel: 'INTEL',
          tabBarIcon: ({ color, size }) => <Globe2 color={color} size={20} />,
        }}
      />
      <Tab.Screen
        name="CasesTab"
        component={CasesStack}
        options={{
          tabBarLabel: 'CASES',
          tabBarIcon: ({ color, size }) => <Briefcase color={color} size={20} />,
        }}
      />
      <Tab.Screen
        name="AdminTab"
        component={AdminStack}
        options={{
          tabBarLabel: 'SERVICES',
          tabBarIcon: ({ color, size }) => <Server color={color} size={20} />,
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    minHeight: 60,
    paddingBottom: 6,
    paddingTop: 6,
  },
  tabLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 9,
    fontWeight: typography.weights.bold,
    letterSpacing: 0.8,
  },
});

