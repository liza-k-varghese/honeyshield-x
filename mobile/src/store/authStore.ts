/**
 * HoneyShield X — Operator Authentication & Session State Store (Zustand)
 */

import { create } from 'zustand';
import { OperatorProfile } from '../types';
import { secureStorage } from './secureStore';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  operator: OperatorProfile | null;
  apiBaseUrl: string;
  isBiometricsEnabled: boolean;
  
  // Actions
  initialize: () => Promise<void>;
  setAuth: (token: string, operator: OperatorProfile) => Promise<void>;
  setOperator: (operator: OperatorProfile) => void;
  logout: () => Promise<void>;
  setApiBaseUrl: (url: string) => void;
  setBiometricsEnabled: (enabled: boolean) => void;
}

// Android emulator default is 10.0.2.2 to access host machine; fallback to 127.0.0.1 for local dev
const DEFAULT_API_URL = 'http://10.0.2.2:8000/api/v1';

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  isLoading: true,
  token: null,
  operator: null,
  apiBaseUrl: DEFAULT_API_URL,
  isBiometricsEnabled: false,

  initialize: async () => {
    try {
      const storedToken = await secureStorage.getToken();
      if (storedToken) {
        set({ token: storedToken, isAuthenticated: true, isLoading: false });
      } else {
        set({ token: null, isAuthenticated: false, isLoading: false });
      }
    } catch {
      set({ token: null, isAuthenticated: false, isLoading: false });
    }
  },

  setAuth: async (token: string, operator: OperatorProfile) => {
    await secureStorage.saveToken(token);
    set({
      token,
      operator,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  setOperator: (operator: OperatorProfile) => {
    set({ operator });
  },

  logout: async () => {
    await secureStorage.clearAuth();
    set({
      token: null,
      operator: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  setApiBaseUrl: (url: string) => {
    set({ apiBaseUrl: url.replace(/\/+$/, '') });
  },

  setBiometricsEnabled: (enabled: boolean) => {
    set({ isBiometricsEnabled: enabled });
  },
}));

