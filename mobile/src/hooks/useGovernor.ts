/**
 * HoneyShield X — Incident Command Governor Step-Up Hook
 * Integrates native Android BiometricPrompt with FastAPI Governor Engine.
 */

import { useState } from 'react';
import { useBiometrics } from './useBiometrics';
import { casesApi } from '../api/cases.api';

export function useGovernor() {
  const { authenticateBiometric } = useBiometrics();
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function executeContainment(
    action: string,
    target: string | number,
    justification: string,
    riskLevel: 1 | 2 | 3 = 3
  ): Promise<any | null> {
    setIsExecuting(true);
    setError(null);

    try {
      // Step 1: For Level-3 actions, require native biometric prompt
      if (riskLevel === 3) {
        const verified = await authenticateBiometric(
          `Governor Authorization: Confirm ${action.replace(/_/g, ' ').toUpperCase()} on ${target}`
        );
        if (!verified) {
          throw new Error('Biometric step-up authorization failed or was cancelled.');
        }
      }

      // Step 2: Validate justification string length (minimum 10 characters)
      if (!justification || justification.trim().length < 10) {
        throw new Error('Operational justification must be at least 10 characters long.');
      }

      // Step 3: Dispatch to backend Governor Engine
      const numericTargetId = typeof target === 'number' ? target : parseInt(target.replace(/\D/g, '') || '1', 10);
      const result = await casesApi.executeGovernorAction(
        action,
        numericTargetId,
        justification.trim()
      );

      return result;
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Governor execution failed.';
      setError(msg);
      return null;
    } finally {
      setIsExecuting(false);
    }
  }

  return {
    executeContainment,
    isExecuting,
    error,
  };
}
