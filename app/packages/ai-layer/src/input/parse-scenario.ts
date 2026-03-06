import { generateObject } from 'ai';
import { z } from 'zod';
import type { ScenarioModification } from '@copia/types';
import { getModel } from '../provider.js';
import { SCENARIO_PARSE_SYSTEM_PROMPT } from '../prompts/v1.0.0/index.js';

// ----- Zod Schemas -----

const CountryCodeSchema = z.enum(['US', 'GB', 'IN', 'PT']);

const ModificationTypeSchema = z.enum([
  'relocate',
  'gift_asset',
  'restructure_ownership',
  'change_timing',
  'add_jurisdiction',
  'spousal_planning',
]);

const RelocateParamsSchema = z.object({
  type: z.literal('relocate'),
  personId: z.string(),
  toCountry: CountryCodeSchema,
  daysPresent: z.number().int().min(0).max(366),
  year: z.number().int(),
});

const GiftAssetParamsSchema = z.object({
  type: z.literal('gift_asset'),
  assetId: z.string(),
  recipientId: z.string(),
  fraction: z.number().min(0).max(1),
});

const RestructureOwnershipParamsSchema = z.object({
  type: z.literal('restructure_ownership'),
  assetId: z.string(),
  newOwnershipType: z.string(),
  newOwnershipFraction: z.number().min(0).max(1),
});

const ChangeTimingParamsSchema = z.object({
  type: z.literal('change_timing'),
  event: z.string(),
  year: z.number().int(),
});

const AddJurisdictionParamsSchema = z.object({
  type: z.literal('add_jurisdiction'),
  country: CountryCodeSchema,
  daysPresent: z.number().int().min(0).max(366),
});

const SpousalPlanningParamsSchema = z.object({
  type: z.literal('spousal_planning'),
  strategy: z.string(),
  assetIds: z.array(z.string()),
});

const ScenarioParamsSchema = z.discriminatedUnion('type', [
  RelocateParamsSchema,
  GiftAssetParamsSchema,
  RestructureOwnershipParamsSchema,
  ChangeTimingParamsSchema,
  AddJurisdictionParamsSchema,
  SpousalPlanningParamsSchema,
]);

const ParsedScenarioSchema = z.object({
  modification: z.object({
    id: z.string(),
    type: ModificationTypeSchema,
    description: z.string(),
    params: ScenarioParamsSchema,
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

export type ParsedScenario = {
  modification: ScenarioModification;
  flaggedEntities: Array<{ entity: string; reason: string }>;
  ambiguities: Array<{ field: string; description: string }>;
};

// ----- Main Function -----

/**
 * Parse a natural language scenario description into a structured
 * ScenarioModification, given the current profile context for resolving
 * asset and family member references.
 */
export async function parseScenario(
  naturalLanguageInput: string,
  currentProfile: {
    name: string;
    assets: Array<{ id: string; name: string }>;
    family: Array<{ id: string; name: string }>;
  },
): Promise<ParsedScenario> {
  const model = getModel('structured');

  const assetList = currentProfile.assets
    .map((a) => `  - ID: "${a.id}", Name: "${a.name}"`)
    .join('\n');
  const familyList = currentProfile.family
    .map((f) => `  - ID: "${f.id}", Name: "${f.name}"`)
    .join('\n');

  const contextBlock = `
## Current Profile: ${currentProfile.name}

### Assets:
${assetList || '  (none)'}

### Family Members:
${familyList || '  (none)'}

Use "self" as the personId when the user refers to themselves (the profile holder).
`;

  const { object } = await generateObject({
    model,
    schema: ParsedScenarioSchema,
    system: SCENARIO_PARSE_SYSTEM_PROMPT + '\n\n' + contextBlock,
    prompt: `Parse the following scenario description into a structured ScenarioModification. Generate an ID in the format "mod-${Date.now()}".

---
${naturalLanguageInput}
---`,
  });

  return {
    modification: object.modification as ScenarioModification,
    flaggedEntities: object.flaggedEntities,
    ambiguities: object.ambiguities,
  };
}
