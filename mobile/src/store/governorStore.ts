/**
 * HoneyShield X — Incident Command Governor Store (Zustand)
 * Manages Level-3 step-up authorization requests, containment pending queues,
 * and emergency break-glass timers.
 */

import { create } from 'zustand';

interface GovernorPendingRequest {
  actionId: string;
  actionType: string;
  target: string;
  riskLevel: 1 | 2 | 3;
  timestamp: string;
}

interface GovernorState {
  pendingRequest: GovernorPendingRequest | null;
  isStepUpActive: boolean;
  breakGlassActive: boolean;
  breakGlassExpiresAt: number | null;

  // Actions
  stageAction: (req: GovernorPendingRequest) => void;
  clearPendingAction: () => void;
  setStepUpActive: (active: boolean) => void;
  activateBreakGlass: (durationSeconds: number) => void;
  clearBreakGlass: () => void;
}

export const useGovernorStore = create<GovernorState>((set) => ({
  pendingRequest: null,
  isStepUpActive: false,
  breakGlassActive: false,
  breakGlassExpiresAt: null,

  stageAction: (req) => set({ pendingRequest: req, isStepUpActive: true }),
  clearPendingAction: () => set({ pendingRequest: null, isStepUpActive: false }),
  setStepUpActive: (active) => set({ isStepUpActive: active }),

  activateBreakGlass: (durationSeconds) =>
    set({
      breakGlassActive: true,
      breakGlassExpiresAt: Date.now() + durationSeconds * 1000,
    }),

  clearBreakGlass: () =>
    set({
      breakGlassActive: false,
      breakGlassExpiresAt: null,
    }),
}));

