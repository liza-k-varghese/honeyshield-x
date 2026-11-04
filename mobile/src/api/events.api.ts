/**
 * Real-Time Events & Push Notification API Client (Phase 3).
 */

import { apiClient } from './client';
import { API_ENDPOINTS } from './endpoints';
import {
  ConnectionTicketResponse,
  EventReplayResponse,
  OperatorNotificationPreferences,
} from '../types';

export const eventsApi = {
  /**
   * Acquire a single-use 60-second connection ticket for authenticating WebSockets.
   */
  async getWsTicket(): Promise<ConnectionTicketResponse> {
    const { data } = await apiClient.post<ConnectionTicketResponse>(API_ENDPOINTS.EVENTS.TICKET);
    return data;
  },

  /**
   * Replay historical events occurring since the specified cursor for offline recovery.
   */
  async replayEvents(sinceCursor?: number | null, limit: number = 50): Promise<EventReplayResponse> {
    const params: Record<string, any> = { limit };
    if (sinceCursor !== undefined && sinceCursor !== null) {
      params.since_cursor = sinceCursor;
    }
    const { data } = await apiClient.get<EventReplayResponse>(API_ENDPOINTS.EVENTS.REPLAY, { params });
    return data;
  },

  /**
   * Fetch current operator push notification preferences.
   */
  async getPreferences(): Promise<OperatorNotificationPreferences> {
    const { data } = await apiClient.get<OperatorNotificationPreferences>(API_ENDPOINTS.MOBILE.PREFERENCES);
    return data;
  },

  /**
   * Update operator push notification preferences.
   */
  async updatePreferences(prefs: OperatorNotificationPreferences): Promise<OperatorNotificationPreferences> {
    const { data } = await apiClient.put<OperatorNotificationPreferences>(API_ENDPOINTS.MOBILE.PREFERENCES, prefs);
    return data;
  },

  /**
   * Register mobile device push token.
   */
  async registerDevice(pushToken: string, metadata: Record<string, any> = {}): Promise<any> {
    const { data } = await apiClient.post(API_ENDPOINTS.MOBILE.REGISTER_DEVICE, {
      push_token: pushToken,
      platform: 'android',
      metadata,
    });
    return data;
  },

  /**
   * Revoke device push token upon sign-out.
   */
  async unregisterDevice(pushToken: string): Promise<any> {
    const { data } = await apiClient.post(API_ENDPOINTS.MOBILE.UNREGISTER_DEVICE, {
      push_token: pushToken,
    });
    return data;
  },
};
