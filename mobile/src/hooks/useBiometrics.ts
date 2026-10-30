/**
 * HoneyShield X — Android BiometricPrompt Hook
 * Integrates with expo-local-authentication for hardware-backed biometric verification.
 */

import { useState, useEffect } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

export function useBiometrics() {
  const [isSupported, setIsSupported] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);

  useEffect(() => {
    checkHardwareSupport();
  }, []);

  async function checkHardwareSupport() {
    try {
      if (Platform.OS === 'web') {
        setIsSupported(false);
        return;
      }
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setIsSupported(compatible);
      setIsEnrolled(enrolled);
    } catch {
      setIsSupported(false);
      setIsEnrolled(false);
    }
  }

  async function authenticateBiometric(promptMessage: string = 'Verify identity for HoneyShield X'): Promise<boolean> {
    try {
      if (Platform.OS === 'web') return true;

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
        fallbackLabel: 'Enter PIN/Password',
      });

      return result.success;
    } catch {
      return false;
    }
  }

  return {
    isSupported,
    isEnrolled,
    authenticateBiometric,
  };
}

