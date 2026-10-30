/**
 * HoneyShield X — Authentication API Module
 */

import { apiClient } from './client';
import { API_ENDPOINTS } from './endpoints';
import { LoginResponse, OperatorProfile, BreakGlassRequest } from '../types';

export const authApi = {
  async login(username: string, password: string): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>(API_ENDPOINTS.AUTH.LOGIN, {
      username,
      password,
    });
    return response.data;
  },

  async logout(): Promise<void> {
    await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT);
  },

  async getMe(): Promise<OperatorProfile> {
    const response = await apiClient.get<OperatorProfile>(API_ENDPOINTS.AUTH.ME);
    return response.data;
  },

  async breakGlass(payload: BreakGlassRequest): Promise<{ success: boolean; session_expires_in: number }> {
    const response = await apiClient.post(API_ENDPOINTS.AUTH.BREAK_GLASS, payload);
    return response.data;
  },

  async registerDevice(deviceToken: string, platformInfo: Record<string, any>): Promise<{ registered: boolean }> {
    try {
      const response = await apiClient.post(API_ENDPOINTS.AUTH.REGISTER_DEVICE, {
        push_token: deviceToken,
        platform: 'android',
        metadata: platformInfo,
      });
      return response.data;
    } catch {
      return { registered: false };
    }
  },
};

