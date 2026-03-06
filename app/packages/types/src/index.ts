export type {
  CountryCode,
  CurrencyCode,
  TaxBracket,
  Exemption,
  EstateTaxRules,
  GiftTaxRules,
  CapitalGainsTaxRules,
  SpousalProvision,
  SpecialRule,
  ResidencyRule,
  ResidencyCategory,
  FilingObligation as JurisdictionFilingObligation,
  Jurisdiction,
  SunsetProvision,
} from './jurisdiction.js';

export type {
  MoneyEventType,
  ResidencyStatus,
  MoneyEvent,
  OutboundLimit,
  AccountType,
  AccountRequirement,
  ApprovalThreshold,
  CapitalControlRules,
  TaxLayer,
  TaxLayerResult,
  RepatriationChannel,
  ActionCategory,
  PermittedAction,
  StatusResult,
  ControlResult,
  MobilityAnalysisResult,
} from './capital-mobility.js';

export { COUNTRY_CURRENCIES } from './jurisdiction.js';

export type {
  TreatyPair,
  TaxingRight,
  ReliefMethod,
  AssetClass,
  TaxingRightEntry,
  TieBreakerRule,
  SpecialTreatyProvision,
  TreatyEdge,
  TreatyGap,
} from './treaty.js';

export type {
  OwnershipType,
  RelationshipType,
  Residency,
  Asset,
  FamilyMember,
  UserProfile,
} from './user-profile.js';

export type {
  ConfidenceTier,
  SourceCitation,
} from './citation.js';

export type {
  Liability,
  CalculationStep,
  Conflict,
  TreatyApplication,
  ReliefDetail,
  AuditEntry,
  PlanResult,
  FilingObligation,
  ExchangeRateSnapshot,
} from './plan-result.js';

export type {
  ModificationType,
  ScenarioModification,
  ScenarioParams,
  RelocateParams,
  GiftAssetParams,
  RestructureOwnershipParams,
  ChangeTimingParams,
  AddJurisdictionParams,
  SpousalPlanningParams,
  RepatriateParams,
  LiabilityDelta,
  ScenarioDelta,
  TradeOff,
} from './scenario.js';

export type {
  EventType,
  BaseEvent,
  ProfileCreatedEvent,
  PlanComputedEvent,
  ScenarioExploredEvent,
  CitationExpandedEvent,
  ConfidenceTierViewedEvent,
  ProfessionalReferralClickedEvent,
  SessionEndedEvent,
  AnalyticsEvent,
} from './analytics.js';
