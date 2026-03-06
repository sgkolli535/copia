import type { CountryCode } from './jurisdiction.js';
import type { ConfidenceTier } from './citation.js';
import type { ModificationType } from './scenario.js';

export type EventType =
  | 'profile_created'
  | 'plan_computed'
  | 'scenario_explored'
  | 'citation_expanded'
  | 'confidence_tier_viewed'
  | 'professional_referral_clicked'
  | 'session_ended';

export interface BaseEvent {
  type: EventType;
  timestamp: string;
  sessionId: string;
}

export interface ProfileCreatedEvent extends BaseEvent {
  type: 'profile_created';
  jurisdictionCount: number;
  assetCount: number;
  familyMemberCount: number;
}

export interface PlanComputedEvent extends BaseEvent {
  type: 'plan_computed';
  jurisdictions: CountryCode[];
  totalExposure: number;
  conflictCount: number;
  computeTimeMs: number;
}

export interface ScenarioExploredEvent extends BaseEvent {
  type: 'scenario_explored';
  modificationType: ModificationType;
  netImpact: number;
}

export interface CitationExpandedEvent extends BaseEvent {
  type: 'citation_expanded';
  citationId: string;
  sourceType: string;
}

export interface ConfidenceTierViewedEvent extends BaseEvent {
  type: 'confidence_tier_viewed';
  tier: ConfidenceTier;
  context: string;
}

export interface ProfessionalReferralClickedEvent extends BaseEvent {
  type: 'professional_referral_clicked';
  jurisdiction: CountryCode;
}

export interface SessionEndedEvent extends BaseEvent {
  type: 'session_ended';
  durationMs: number;
  scenariosExplored: number;
  citationsExpanded: number;
}

export type AnalyticsEvent =
  | ProfileCreatedEvent
  | PlanComputedEvent
  | ScenarioExploredEvent
  | CitationExpandedEvent
  | ConfidenceTierViewedEvent
  | ProfessionalReferralClickedEvent
  | SessionEndedEvent;
