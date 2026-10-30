/**
 * HoneyShield X — Android Mobile Application Main Entry Point
 */

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RootNavigator } from './src/navigation/RootNavigator';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 15, // 15 seconds stale time for real-time telemetry
      refetchOnWindowFocus: true,
    },
  },
});

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" backgroundColor="#030712" />
        <RootNavigator />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

