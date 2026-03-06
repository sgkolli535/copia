import { generateObject } from 'ai';
import { z } from 'zod';
import type { UserProfile } from '@copia/types';
import { getModel } from '../provider.js';
import { PROFILE_PARSE_SYSTEM_PROMPT } from '../prompts/v1.0.0/index.js';

// ----- Zod Schemas -----

const CountryCodeSchema = z.enum(['US', 'GB', 'IN', 'PT']);
const CurrencyCodeSchema = z.enum(['USD', 'GBP', 'INR', 'EUR']);

const AssetClassSchema = z.enum([
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

const OwnershipTypeSchema = z.enum([
  'sole',
  'joint_tenancy',
  'tenancy_in_common',
  'community_property',
  'trust',
]);

const RelationshipTypeSchema = z.enum(['spouse', 'child', 'parent', 'sibling', 'other']);

const ResidencySchema = z.object({
  country: CountryCodeSchema,
  daysPresent: z.number().int().min(0).max(366),
  isDomiciled: z.boolean(),
  yearsResident: z.number().min(0),
  status: z.string(),
});

const AssetSchema = z.object({
  id: z.string(),
  name: z.string(),
  assetClass: AssetClassSchema,
  spikeLocation: CountryCodeSchema,
  value: z.number().min(0),
  currency: CurrencyCodeSchema,
  costBasis: z.number().min(0),
  ownershipType: OwnershipTypeSchema,
  ownershipFraction: z.number().min(0).max(1),
  dateAcquired: z.string(),
  notes: z.string(),
});

const FamilyMemberSchema = z.object({
  id: z.string(),
  name: z.string(),
  relationship: RelationshipTypeSchema,
  citizenships: z.array(CountryCodeSchema),
  residency: ResidencySchema.nullable(),
  isBeneficiary: z.boolean(),
  age: z.number().min(0),
});

const ParsedProfileSchema = z.object({
  profile: z.object({
    id: z.string(),
    name: z.string(),
    age: z.number().min(0),
    citizenships: z.array(CountryCodeSchema),
    residencies: z.array(ResidencySchema),
    assets: z.array(AssetSchema),
    family: z.array(FamilyMemberSchema),
    reportingCurrency: CurrencyCodeSchema,
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
  flaggedEntities: z.array(
    z.object({
      entity: z.string().describe('The entity or concept that could not be mapped'),
      reason: z.string().describe('Why this was flagged'),
    }),
  ),
  ambiguities: z.array(
    z.object({
      field: z.string().describe('Which field is ambiguous'),
      description: z.string().describe('What is ambiguous and what default was chosen'),
    }),
  ),
});

// ----- Types -----

export type ParsedProfile = {
  profile: UserProfile;
  flaggedEntities: Array<{ entity: string; reason: string }>;
  ambiguities: Array<{ field: string; description: string }>;
};

// ----- Main Function -----

/**
 * Parse a natural language description of a person's financial and family
 * situation into a structured UserProfile, along with any flagged entities
 * and ambiguities.
 */
export async function parseProfile(naturalLanguageInput: string): Promise<ParsedProfile> {
  const model = getModel('structured');
  const now = new Date().toISOString();

  const { object } = await generateObject({
    model,
    schema: ParsedProfileSchema,
    system: PROFILE_PARSE_SYSTEM_PROMPT,
    prompt: `Parse the following description into a structured UserProfile. Use "${now}" for createdAt and updatedAt timestamps. Generate a UUID-style id like "profile-1" for the profile.

---
${naturalLanguageInput}
---`,
  });

  return {
    profile: object.profile as UserProfile,
    flaggedEntities: object.flaggedEntities,
    ambiguities: object.ambiguities,
  };
}
