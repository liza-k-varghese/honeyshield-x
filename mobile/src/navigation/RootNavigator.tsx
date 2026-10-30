/**
 * HoneyShield X — Root Navigator
 */

import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Shield } from 'lucide-react-native';
import { colors, typography } from '../theme';
import { useAuthStore } from '../store/authStore';
import { AuthStack } from './AuthStack';
import { MainTabs } from './MainTabs';

const Stack = createNativeStackNavigator();

export const RootNavigator = () => {
  const { isAuthenticated, isLoading, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.splashContainer}>
        <Shield color={colors.cyan} size={56} strokeWidth={2} />
        <Text style={styles.splashTitle}>HONEYSHIELD X</Text>
        <Text style={styles.splashSubtitle}>INITIALIZING SECURE KEYSTORE...</Text>
        <ActivityIndicator color={colors.cyan} size="large" style={{ marginTop: 20 }} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        {isAuthenticated ? (
          <Stack.Screen name="MainTabs" component={MainTabs} />
        ) : (
          <Stack.Screen name="Auth" component={AuthStack} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  splashTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.hudTitle,
    fontWeight: typography.weights.bold,
    color: colors.cyan,
    letterSpacing: 2,
    marginTop: 12,
  },
  splashSubtitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    letterSpacing: 1.2,
  },
});

