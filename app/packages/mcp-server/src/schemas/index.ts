import { z } from 'zod';

// ---------------------------------------------------------------------------
// Shared enum schemas matching @copia/types exactly
// ---------------------------------------------------------------------------

export const CountryCodeSchema = z.enum(['US', 'GB', 'IN', 'PT']);

export const CurrencyCodeSchema = z.enum(['USD', 'GBP', 'INR', 'EUR']);

export const AssetClassSchema = z.enum([
  'immovable_property',
  'business_property',
  'shares',
  'bonds',
  'bank_deposits',
  'personal_property',
  'pension',
  'life_insurance',
  'other',
]);

export const OwnershipTypeSchema = z.enum([
  'sole',
  'joint_tenancy',
  'tenancy_in_common',
  'community_property',
  'trust',
]);

export const RelationshipTypeSchema = z.enum([
  'spouse',
  'child',
  'parent',
  'sibling',
  'other',
]);

export const ModificationTypeSchema = z.enum([
  'relocate',
  'gift_asset',
  'restructure_ownership',
  'change_timing',
  'add_jurisdiction',
  'spousal_planning',
  'repatriate',
]);

export const MoneyEventTypeSchema = z.enum([
  'inheritance',
  'property_sale',
  'business_exit',
  'pension',
  'settlement',
  'gift',
  'investment_liquidation',
]);

export const ResidencyStatusSchema = z.enum([
  'citizen',
  'former_citizen',
  'nri',
  'oci',
  'pio',
  'non_resident',
  'deemed_domiciled',
  'non_domiciled',
  'resident',
]);

// ---------------------------------------------------------------------------
// Sub-object schemas
// ---------------------------------------------------------------------------

const ResidencySchema = z.object({
  country: CountryCodeSchema,
  daysPresent: z.number().min(0).max(366),
  isDomiciled: z.boolean(),
  yearsResident: z.number().min(0),
  status: z.string().default(''),
});

const AssetSchema = z.object({
  id: z.string(),
  name: z.string(),
  assetClass: AssetClassSchema,
  spikeLocation: CountryCodeSchema,
  value: z.number().positive(),
  currency: CurrencyCodeSchema,
  costBasis: z.number().min(0),
  ownershipType: OwnershipTypeSchema,
  ownershipFraction: z.number().min(0).max(1),
  dateAcquired: z.string(),
  notes: z.string().default(''),
});

const FamilyMemberSchema = z.object({
  id: z.string(),
  name: z.string(),
  relationship: RelationshipTypeSchema,
  citizenships: z.array(CountryCodeSchema),
  residency: z.object({
    country: CountryCodeSchema,
    daysPresent: z.number(),
    isDomiciled: z.boolean(),
    yearsResident: z.number(),
    status: z.string(),
  }).nullable(),
  isBeneficiary: z.boolean(),
  age: z.number(),
});

// ---------------------------------------------------------------------------
// Tool input schemas
// ---------------------------------------------------------------------------

export const ParseUserProfileInput = z.object({
  name: z.string(),
  age: z.number().positive(),
  citizenships: z.array(CountryCodeSchema).min(1),
  residencies: z.array(ResidencySchema),
  assets: z.array(AssetSchema),
  family: z.array(FamilyMemberSchema),
  reportingCurrency: CurrencyCodeSchema.default('USD'),
});

export type ParseUserProfileInputType = z.infer<typeof ParseUserProfileInput>;

export const ComputeEstatePlanInput = z.object({
  profileId: z.string().optional(),
});

export type ComputeEstatePlanInputType = z.infer<typeof ComputeEstatePlanInput>;

export const ComputeScenarioDeltaInput = z.object({
  modification: z.object({
    type: ModificationTypeSchema,
    description: z.string(),
    params: z.record(z.unknown()),
  }),
});

export type ComputeScenarioDeltaInputType = z.infer<typeof ComputeScenarioDeltaInput>;

export const GetJurisdictionInfoInput = z.object({
  countryCode: CountryCodeSchema,
});

export type GetJurisdictionInfoInputType = z.infer<typeof GetJurisdictionInfoInput>;

export const GetTreatyInfoInput = z.object({
  country1: CountryCodeSchema,
  country2: CountryCodeSchema,
});

export type GetTreatyInfoInputType = z.infer<typeof GetTreatyInfoInput>;

export const FlagUnknownEntityInput = z.object({
  type: z.enum(['jurisdiction', 'asset_class', 'treaty', 'rule']),
  value: z.string(),
  context: z.string(),
});

export type FlagUnknownEntityInputType = z.infer<typeof FlagUnknownEntityInput>;

// GetApplicableRules and ListSupportedJurisdictions take no input (or optional session id)
export const GetApplicableRulesInput = z.object({}).optional();

export type GetApplicableRulesInputType = z.infer<typeof GetApplicableRulesInput>;

export const ListSupportedJurisdictionsInput = z.object({}).optional();

export type ListSupportedJurisdictionsInputType = z.infer<typeof ListSupportedJurisdictionsInput>;

// ---------------------------------------------------------------------------
// Capital Mobility tool inputs
// ---------------------------------------------------------------------------

export const MoneyEventInput = z.object({
  type: MoneyEventTypeSchema,
  sourceCountry: CountryCodeSchema,
  destinationCountry: CountryCodeSchema,
  amount: z.number().positive(),
  currency: CurrencyCodeSchema,
  date: z.string(),
  relatedAsset: z.string().default(''),
  relationship: z.string().default(''),
  userStatusInSource: ResidencyStatusSchema.optional(),
  description: z.string().default(''),
});

export type MoneyEventInputType = z.infer<typeof MoneyEventInput>;

export const RepatriationScenarioInput = z.object({
  modifications: z.array(
    z.object({
      channel: z.string(),
      timing: z.string(),
    }),
  ),
});

export type RepatriationScenarioInputType = z.infer<typeof RepatriationScenarioInput>;

export const PermittedActionsInput = z.object({
  sourceCountry: CountryCodeSchema,
  destinationCountry: CountryCodeSchema,
  eventType: MoneyEventTypeSchema.optional(),
});

export type PermittedActionsInputType = z.infer<typeof PermittedActionsInput>;
