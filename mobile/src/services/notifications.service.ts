/**
 * Android Push Notification Service for HoneyShield X (Phase 3).
 *
 * Implements:
 * - Android Notification Channel creation (security-critical, security-alerts, deception-hits).
 * - System notification permission requests.
 * - Expo/FCM push token acquisition and backend registration.
 * - Deep linking response handlers for alert, attack, and incident navigation.
 * - Secure token revocation upon operator logout.
 */

import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { eventsApi } from '../api/events.api';

// Configure foreground notification presentation policy
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

type DeepLinkHandler = (screen: string, resourceId: string, data: Record<string, any>) => void;

class PushNotificationService {
  private currentToken: string | null = null;
  private deepLinkHandler: DeepLinkHandler | null = null;
  private responseSubscription: Notifications.Subscription | null = null;

  public setDeepLinkHandler(handler: DeepLinkHandler): void {
    this.deepLinkHandler = handler;
  }

  /**
   * Initialize Android notification channels and setup listener.
   */
  public async init(): Promise<void> {
    if (Platform.OS === 'android') {
      // Channel 1: Critical Security Alerts (Governor Step-Up, Ransomware, Critical Threat)
      await Notifications.setNotificationChannelAsync('security-critical', {
        name: 'Critical Security Breaches',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#ef4444',
        sound: 'default',
        enableLights: true,
        enableVibrate: true,
      });

      // Channel 2: High & Medium Threat Alerts
      await Notifications.setNotificationChannelAsync('security-alerts', {
        name: 'SOC Threat Alerts',
        importance: Notifications.AndroidImportance.HIGH,
        lightColor: '#00f0ff',
        sound: 'default',
        enableLights: true,
      });

      // Channel 3: Deception Grid Trips
      await Notifications.setNotificationChannelAsync('deception-hits', {
        name: 'Deception Honeytoken Trips',
        importance: Notifications.AndroidImportance.HIGH,
        lightColor: '#a855f7',
        sound: 'default',
        enableLights: true,
      });
    }

    // Deep link response listener
    this.responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      try {
        const data = response.notification.request.content.data;
        if (data && data.screen && this.deepLinkHandler) {
          this.deepLinkHandler(data.screen, String(data.resourceId || ''), data);
        }
      } catch (err) {
        console.warn('Error handling push response:', err);
      }
    });
  }

  /**
   * Request system notification permissions and register token with HoneyShield-X backend.
   */
  public async registerForPushNotifications(): Promise<string | null> {
    if (!Device.isDevice) {
      console.log('Push notifications require physical device or supported emulator');
      return null;
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Notification permissions denied by user');
        return null;
      }

      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ??
        Constants?.easConfig?.projectId ??
        'honeyshield-x-mobile';

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      this.currentToken = tokenData.data;

      // Register with backend
      await eventsApi.registerDevice(this.currentToken, {
        brand: Device.brand,
        modelName: Device.modelName,
        osVersion: Device.osVersion,
        platformApiLevel: Device.platformApiLevel,
      });

      return this.currentToken;
    } catch (error) {
      console.warn('Failed to obtain or register push token:', error);
      return null;
    }
  }

  /**
   * Revoke device push token from HoneyShield-X backend on sign-out.
   */
  public async unregister(): Promise<void> {
    if (this.currentToken) {
      try {
        await eventsApi.unregisterDevice(this.currentToken);
      } catch (err) {
        console.warn('Failed to unregister push token:', err);
      }
      this.currentToken = null;
    }

    if (this.responseSubscription) {
      this.responseSubscription.remove();
      this.responseSubscription = null;
    }
  }
}

export const pushNotificationService = new PushNotificationService();

