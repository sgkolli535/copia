import { getTreaty } from '@copia/data-service';
import { GetTreatyInfoInput } from '../schemas/index.js';

/**
 * get_treaty_info tool handler.
 *
 * Validates the country pair and returns the full treaty edge
 * from the data service, including taxing rights, relief
 * method, tie-breaker rules, special provisions, and gaps.
 */
export async function handleGetTreatyInfo(args: unknown): Promise<string> {
  const input = GetTreatyInfoInput.parse(args);

  if (input.country1 === input.country2) {
    throw new Error(
      `Cannot look up a treaty between a country and itself: ${input.country1}.`,
    );
  }

  const result = getTreaty(input.country1, input.country2);

  if (!result) {
    return JSON.stringify({
      country1: input.country1,
      country2: input.country2,
      treatyExists: false,
      message: `No treaty data found for the ${input.country1}-${input.country2} pair.`,
    });
  }

  const { treaty, warnings } = result;

  return JSON.stringify({
    pair: treaty.pair,
    countries: treaty.countries,
    treatyName: treaty.treatyName,
    yearSigned: treaty.yearSigned,
    mliApplies: treaty.mliApplies,
    reliefMethod: treaty.reliefMethod,
    taxingRights: treaty.taxingRights,
    tieBreakerRules: treaty.tieBreakerRules,
    specialProvisions: treaty.specialProvisions,
    gaps: treaty.gaps,
    source: treaty.source,
    lastUpdated: treaty.lastUpdated,
    warnings,
    treatyExists: true,
  });
}
