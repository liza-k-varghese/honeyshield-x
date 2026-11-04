/**
 * HoneyShield X — Authentication Navigation Stack
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { BreakGlassScreen } from '../screens/auth/BreakGlassScreen';
import { QrPairingScreen } from '../screens/auth/QrPairingScreen';

const Stack = createNativeStackNavigator();

export const AuthStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'fade',
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="BreakGlass" component={BreakGlassScreen} />
      <Stack.Screen name="QrPairing" component={QrPairingScreen} />
    </Stack.Navigator>
  );
};

