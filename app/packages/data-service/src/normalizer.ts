import type { Jurisdiction, CountryCode, CurrencyCode } from '@copia/types';
import type { TreatyEdge, TreatyPair } from '@copia/types';

/**
 * Normalizer merges API data with static data.
 * API data takes precedence for fields it covers;
 * static data fills in gaps.
 */

export interface DataSource {
  source: string;
  lastUpdated: string;
  isStale: boolean;
}

export interface NormalizedJurisdiction {
  jurisdiction: Jurisdiction;
  dataSources: DataSource[];
  /** Warnings about stale or missing data */
  warnings: string[];
}

export interface NormalizedTreaty {
  treaty: TreatyEdge;
  dataSources: DataSource[];
  warnings: string[];
}

/**
 * Merge an API-sourced partial jurisdiction update into a static baseline.
 * API fields overwrite static fields where present.
 */
export function mergeJurisdictionData(
  staticData: Jurisdiction,
  apiUpdates: Partial<Jurisdiction> | null,
  apiSource: DataSource | null,
): NormalizedJurisdiction {
  const warnings: string[] = [];
  const dataSources: DataSource[] = [
    { source: staticData.source, lastUpdated: staticData.lastUpdated, isStale: false },
  ];

  if (!apiUpdates || !apiSource) {
    return { jurisdiction: staticData, dataSources, warnings };
  }

  dataSources.push(apiSource);
  if (apiSource.isStale) {
    warnings.push(`API data from ${apiSource.source} is stale (last updated: ${apiSource.lastUpdated})`);
  }

  // Shallow merge — API takes precedence for top-level fields it provides
  const merged: Jurisdiction = {
    ...staticData,
    ...filterDefined(apiUpdates),
    // Always preserve the code and name from static
    code: staticData.code,
    name: staticData.name,
    currency: staticData.currency,
    lastUpdated: apiSource.lastUpdated || staticData.lastUpdated,
    source: `${staticData.source} + ${apiSource.source}`,
  };

  return { jurisdiction: merged, dataSources, warnings };
}

/**
 * Merge treaty data from API into static baseline.
 */
export function mergeTreatyData(
  staticData: TreatyEdge,
  apiUpdates: Partial<TreatyEdge> | null,
  apiSource: DataSource | null,
): NormalizedTreaty {
  const warnings: string[] = [];
  const dataSources: DataSource[] = [
    { source: staticData.source, lastUpdated: staticData.lastUpdated, isStale: false },
  ];

  if (!apiUpdates || !apiSource) {
    return { treaty: staticData, dataSources, warnings };
  }

  dataSources.push(apiSource);
  if (apiSource.isStale) {
    warnings.push(`API treaty data from ${apiSource.source} is stale (last updated: ${apiSource.lastUpdated})`);
  }

  const merged: TreatyEdge = {
    ...staticData,
    ...filterDefined(apiUpdates),
    pair: staticData.pair,
    countries: staticData.countries,
    lastUpdated: apiSource.lastUpdated || staticData.lastUpdated,
    source: `${staticData.source} + ${apiSource.source}`,
  };

  return { treaty: merged, dataSources, warnings };
}

/**
 * Create a canonical treaty pair key (alphabetically ordered).
 */
export function makeTreatyPair(a: CountryCode, b: CountryCode): TreatyPair {
  const sorted = [a, b].sort() as [CountryCode, CountryCode];
  return `${sorted[0]}-${sorted[1]}` as TreatyPair;
}

/** Filter out undefined values from a partial object */
function filterDefined<T extends Record<string, unknown>>(obj: Partial<T>): Partial<T> {
  const result: Partial<T> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      (result as Record<string, unknown>)[key] = value;
    }
  }
  return result;
}
