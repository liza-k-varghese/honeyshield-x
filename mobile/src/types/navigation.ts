/**
 * HoneyShield X Mobile — Navigation Type Definitions
 */

import { NavigatorScreenParams } from '@react-navigation/native';
import { AlertItem, AttackSummary, IncidentCase, ThreatIndicator } from './index';

export type RootStackParamList = {
  Auth: undefined;
  Main: NavigatorScreenParams<MainTabParamList>;
  AlertDetail: { alertId: number; alert?: AlertItem };
  AttackDetail: { attackId: number; attack?: AttackSummary };
  CaseDetail: { caseId: string; caseItem?: IncidentCase };
  IndicatorDetail: { indicatorId: string; indicator?: ThreatIndicator };
  GovernorModal: {
    action: string;
    target: string;
    riskLevel: number;
    onConfirmed: (justification: string) => void;
  };
};

export type MainTabParamList = {
  SocTab: undefined;
  DeceptionTab: undefined;
  IntelTab: undefined;
  CasesTab: undefined;
  AdminTab: undefined;
};

export type SocStackParamList = {
  SocDashboard: undefined;
  AlertsList: undefined;
  AttackExplorer: undefined;
};

export type DeceptionStackParamList = {
  DeceptionDashboard: undefined;
  CanaryTokens: undefined;
  CanaryHits: undefined;
  DecoyHosts: undefined;
};

export type IntelStackParamList = {
  IntelDashboard: undefined;
  IndicatorSearch: undefined;
  Campaigns: undefined;
  ThreatHunting: undefined;
};

export type CasesStackParamList = {
  CasesList: undefined;
  IncidentCommand: undefined;
};

export type AdminStackParamList = {
  ServiceControl: undefined;
  AuditLogs: undefined;
  Settings: undefined;
};

