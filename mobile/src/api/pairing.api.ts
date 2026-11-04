/**
 * Secure QR Device Pairing API Client (Phase 4).
 */

import { apiClient } from './client';
import { API_ENDPOINTS } from './endpoints';
import {
  PairingChallengeResponse,
  PairingClaimRequest,
  PairingStatusResponse,
} from '../types';

export const pairingApi = {
  /**
   * Request an ephemeral (180s) single-use pairing challenge for QR rendering.
   */
  async createChallenge(): Promise<PairingChallengeResponse> {
    const { data } = await apiClient.post<PairingChallengeResponse>(
      API_ENDPOINTS.PAIRING.CHALLENGE
    );
    return data;
  },

  /**
   * Mobile device claims pairing challenge by presenting device fingerprint & metadata.
   */
  async claimChallenge(payload: PairingClaimRequest): Promise<{
    claimed: boolean;
    challenge_id: string;
    operator_username: string;
    status: string;
    message: string;
  }> {
    const { data } = await apiClient.post(API_ENDPOINTS.PAIRING.CLAIM, payload);
    return data;
  },

  /**
   * SOC Administrator authorizes claimed device with step-up verification passphrase.
   */
  async approvePairing(
    challengeId: string,
    passphrase: string
  ): Promise<{
    approved: boolean;
    challenge_id: string;
    status: string;
    approved_by: string;
  }> {
    const { data } = await apiClient.post(
      API_ENDPOINTS.PAIRING.APPROVE(challengeId),
      { passphrase }
    );
    return data;
  },

  /**
   * Revoke paired device authorization immediately.
   */
  async revokePairing(
    challengeId: string
  ): Promise<{ revoked: boolean; challenge_id: string; status: string }> {
    const { data } = await apiClient.post(
      API_ENDPOINTS.PAIRING.REVOKE(challengeId)
    );
    return data;
  },

  /**
   * Query live status of device pairing challenge.
   */
  async getStatus(challengeId: string): Promise<PairingStatusResponse> {
    const { data } = await apiClient.get<PairingStatusResponse>(
      API_ENDPOINTS.PAIRING.STATUS(challengeId)
    );
    return data;
  },
};

