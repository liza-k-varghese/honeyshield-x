/**
 * HoneyShield X — Hardware-Backed Secure Storage Adapter
 * Maps directly to Android Keystore via expo-secure-store.
 */

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'hsx_access_token';
const REFRESH_KEY = 'hsx_refresh_token';
const OPERATOR_KEY = 'hsx_operator_profile';

// In-memory fallback if running in environments where SecureStore is not yet initialized
const memoryFallback: Record<string, string> = {};

export const secureStorage = {
  async saveToken(token: string): Promise<void> {
    try {
      if (Platform.OS !== 'web') {
        await SecureStore.setItemAsync(TOKEN_KEY, token, {
          keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        });
      } else {
        memoryFallback[TOKEN_KEY] = token;
      }
    } catch {
      memoryFallback[TOKEN_KEY] = token;
    }
  },

  async getToken(): Promise<string | null> {
    try {
      if (Platform.OS !== 'web') {
        const token = await SecureStore.getItemAsync(TOKEN_KEY);
        return token || memoryFallback[TOKEN_KEY] || null;
      }
      return memoryFallback[TOKEN_KEY] || null;
    } catch {
      return memoryFallback[TOKEN_KEY] || null;
    }
  },

  async saveRefreshToken(refreshToken: string): Promise<void> {
    try {
      if (Platform.OS !== 'web') {
        await SecureStore.setItemAsync(REFRESH_KEY, refreshToken);
      } else {
        memoryFallback[REFRESH_KEY] = refreshToken;
      }
    } catch {
      memoryFallback[REFRESH_KEY] = refreshToken;
    }
  },

  async getRefreshToken(): Promise<string | null> {
    try {
      if (Platform.OS !== 'web') {
        return (await SecureStore.getItemAsync(REFRESH_KEY)) || memoryFallback[REFRESH_KEY] || null;
      }
      return memoryFallback[REFRESH_KEY] || null;
    } catch {
      return memoryFallback[REFRESH_KEY] || null;
    }
  },

  async clearAuth(): Promise<void> {
    try {
      if (Platform.OS !== 'web') {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        await SecureStore.deleteItemAsync(REFRESH_KEY);
        await SecureStore.deleteItemAsync(OPERATOR_KEY);
      }
    } catch {
      // Ignore deletion errors
    }
    delete memoryFallback[TOKEN_KEY];
    delete memoryFallback[REFRESH_KEY];
    delete memoryFallback[OPERATOR_KEY];
  },
};

