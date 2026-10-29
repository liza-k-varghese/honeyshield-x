import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { OperatorProfile, LoginResponse, BreakGlassResponse } from '../types';
import { authLogin, authLogout, authBreakGlass } from '../api/client';

interface AuthContextType {
  operator: OperatorProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  breakGlass: (passphrase: string, justification: string) => Promise<void>;
  hasPermission: (permission: string) => boolean;
  sessionExpired: boolean;
  clearSessionExpired: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'hsx_auth_token';
const OPERATOR_KEY = 'hsx_operator';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => {
    return sessionStorage.getItem(TOKEN_KEY) || null;
  });

  const [operator, setOperator] = useState<OperatorProfile | null>(() => {
    const saved = sessionStorage.getItem(OPERATOR_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    // Default seed profile for initial SOC load
    return {
      username: 'responder_alex',
      role: 'incident_responder',
      email: 'responder.alex@honeyshield.local',
      permissions: [
        'telemetry:view',
        'investigation:view',
        'audit:view',
        'command:preview',
        'command:ack',
        'command:escalate',
        'command:resolve',
        'command:stage_containment',
        'command:dispatch_notification',
        'case:view',
        'case:create',
        'case:update',
        'case:respond',
      ],
      is_active: true,
    };
  });

  const [sessionExpired, setSessionExpired] = useState<boolean>(false);

  useEffect(() => {
    const handleExpiredEvent = () => {
      setSessionExpired(true);
    };
    window.addEventListener('session-expired', handleExpiredEvent);
    return () => window.removeEventListener('session-expired', handleExpiredEvent);
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<void> => {
    const data: LoginResponse = await authLogin({ username, password });
    setToken(data.token);
    setOperator(data.operator);
    sessionStorage.setItem(TOKEN_KEY, data.token);
    sessionStorage.setItem(OPERATOR_KEY, JSON.stringify(data.operator));
    setSessionExpired(false);
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    if (token) {
      try {
        await authLogout();
      } catch {
        // Ignore network errors on logout
      }
    }
    setToken(null);
    setOperator(null);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(OPERATOR_KEY);
    setSessionExpired(false);
  }, [token]);

  const breakGlass = useCallback(async (passphrase: string, justification: string): Promise<void> => {
    const data: BreakGlassResponse = await authBreakGlass({ passphrase, justification });
    setToken(data.token);
    setOperator(data.operator);
    sessionStorage.setItem(TOKEN_KEY, data.token);
    sessionStorage.setItem(OPERATOR_KEY, JSON.stringify(data.operator));
    setSessionExpired(false);
  }, []);

  const hasPermission = useCallback((permission: string): boolean => {
    if (!operator || !operator.is_active) return false;
    return operator.permissions.includes(permission);
  }, [operator]);

  const clearSessionExpired = useCallback(() => {
    setSessionExpired(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        operator,
        token,
        isAuthenticated: !!operator,
        login,
        logout,
        breakGlass,
        hasPermission,
        sessionExpired,
        clearSessionExpired,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

const defaultFallbackAuth: AuthContextType = {
  operator: {
    username: 'responder_alex',
    email: 'responder_alex@honeyshield.local',
    full_name: 'Alex Mercer (SOC Lead)',
    role: 'incident_responder',
    is_active: true,
    is_break_glass: false,
    permissions: [
      'read:telemetry',
      'read:dossier',
      'read:rules',
      'read:audit',
      'command:ack',
      'command:suppress',
      'rule:simulate',
      'command:resolve',
      'command:escalate',
      'command:dispatch',
      'command:contain',
    ],
  },
  token: null,
  isAuthenticated: true,
  login: async () => {},
  logout: async () => {},
  breakGlass: async () => {},
  hasPermission: () => true,
  sessionExpired: false,
  clearSessionExpired: () => {},
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    return defaultFallbackAuth;
  }
  return context;
};
