import { generateObject } from 'ai';
import { z } from 'zod';
import type { MoneyEvent } from '@copia/types';
import { getModel } from '../provider.js';
import { MONEY_EVENT_PARSE_SYSTEM_PROMPT } from '../prompts/v1.0.0/index.js';

const CountryCodeSchema = z.enum(['US', 'GB', 'IN', 'PT']);
const CurrencyCodeSchema = z.enum(['USD', 'GBP', 'INR', 'EUR']);

const MoneyEventTypeSchema = z.enum([
  'inheritance',
  'property_sale',
  'business_exit',
  'pension',
  'settlement',
  'gift',
  'investment_liquidation',
]);

const ResidencyStatusSchema = z.enum([
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

const MoneyEventSchema = z.object({
  id: z.string(),
  type: MoneyEventTypeSchema,
  sourceCountry: CountryCodeSchema,
  destinationCountry: CountryCodeSchema,
  amount: z.number().positive(),
  currency: CurrencyCodeSchema,
  date: z.string(),
  relatedAsset: z.string(),
  relationship: z.string(),
  userStatusInSource: ResidencyStatusSchema,
  description: z.string(),
});

const ParseResultSchema = z.object({
  event: MoneyEventSchema,
  flaggedEntities: z.array(
    z.object({
      type: z.string(),
      value: z.string(),
      suggestion: z.string(),
    }),
  ),
  ambiguities: z.array(
    z.object({
      field: z.string(),
      description: z.string(),
      defaultChosen: z.string(),
    }),
  ),
});

export interface ParsedMoneyEvent {
  event: MoneyEvent;
  flaggedEntities: Array<{ type: string; value: string; suggestion: string }>;
  ambiguities: Array<{ field: string; description: string; defaultChosen: string }>;
}

/**
 * Parse a natural-language description of a cross-border money event
 * into a structured MoneyEvent using LLM-powered extraction.
 */
export async function parseMoneyEvent(
  userInput: string,
  context?: string,
): Promise<ParsedMoneyEvent> {
  const model = getModel('structured');

  const result = await generateObject({
    model,
    schema: ParseResultSchema,
    system: MONEY_EVENT_PARSE_SYSTEM_PROMPT,
    prompt: context
      ? `Context:\n${context}\n\nUser input:\n${userInput}`
      : userInput,
  });

  return {
    event: result.object.event as MoneyEvent,
    flaggedEntities: result.object.flaggedEntities,
    ambiguities: result.object.ambiguities,
  };
}
