/**
 * HoneyShield X Mobile — Reusable Authenticated API Gateway Client
 */

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';
import { secureStorage } from '../store/secureStore';

export const apiClient = axios.create({
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-Client-Platform': 'Android-HoneyShieldX',
  },
});

// Request Interceptor: Attach dynamic Bearer Token and Base URL
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Dynamically assign Base URL from store
    const baseUrl = useAuthStore.getState().apiBaseUrl;
    config.baseURL = baseUrl;

    // Read token from memory store or secure storage
    let token = useAuthStore.getState().token;
    if (!token) {
      token = await secureStorage.getToken();
    }

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

// Response Interceptor: Handle 401 and authentication errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Don't auto-logout if the failed request was the login request itself
      const requestUrl = error.config?.url || '';
      if (!requestUrl.includes('/auth/login')) {
        await useAuthStore.getState().logout();
      }
    }
    return Promise.reject(error);
  }
);

