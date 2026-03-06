import type { Jurisdiction, CountryCode, CurrencyCode, CapitalControlRules, PermittedAction } from '@copia/types';
import type { TreatyEdge } from '@copia/types';
import { getCached, setCache, getDefaultTtl } from './cache/index.js';
import { mergeJurisdictionData, mergeTreatyData, makeTreatyPair } from './normalizer.js';
import type { DataSource } from './normalizer.js';
import { fetchExchangeRates } from './providers/frankfurter.js';
import { US_JURISDICTION } from './providers/static/us.js';
import { GB_JURISDICTION } from './providers/static/gb.js';
import { IN_JURISDICTION } from './providers/static/in.js';
import { PT_JURISDICTION } from './providers/static/pt.js';
import { TREATY_EDGES, getTreatyEdge as getStaticTreaty } from './providers/static/treaties.js';
import { IN_PERMITTED_ACTIONS } from './providers/static/permitted-actions/in-actions.js';
import { GB_PERMITTED_ACTIONS } from './providers/static/permitted-actions/gb-actions.js';
import { US_PERMITTED_ACTIONS } from './providers/static/permitted-actions/us-actions.js';
import { PT_PERMITTED_ACTIONS } from './providers/static/permitted-actions/pt-actions.js';

// Re-export normalizer utilities
export { makeTreatyPair } from './normalizer.js';
export type { DataSource, NormalizedJurisdiction, NormalizedTreaty } from './normalizer.js';

/** Static jurisdiction registry */
const STATIC_JURISDICTIONS: Record<CountryCode, Jurisdiction> = {
  US: US_JURISDICTION,
  GB: GB_JURISDICTION,
  IN: IN_JURISDICTION,
  PT: PT_JURISDICTION,
};

/**
 * Get jurisdiction data, merging API updates with static baseline.
 * Uses cache with TTL; falls back to static data if APIs unavailable.
 */
export function getJurisdiction(code: CountryCode): {
  jurisdiction: Jurisdiction;
  warnings: string[];
} {
  const staticData = STATIC_JURISDICTIONS[code];
  if (!staticData) {
    throw new Error(`Unsupported jurisdiction: ${code}`);
  }

  // For prototype, return static data directly
  // In production, this would check cache for API-sourced updates
  const cacheKey = `jurisdiction:${code}`;
  const cached = getCached<Jurisdiction>(cacheKey);

  if (cached) {
    return {
      jurisdiction: cached.data,
      warnings: cached.isStale
        ? [`Cached jurisdiction data for ${code} is stale`]
        : [],
    };
  }

  // Cache the static data
  setCache(cacheKey, staticData, {
    ttlMs: getDefaultTtl('static'),
    source: 'static',
  });

  return { jurisdiction: staticData, warnings: [] };
}

/**
 * Get treaty edge between two countries.
 */
export function getTreaty(
  country1: CountryCode,
  country2: CountryCode,
): { treaty: TreatyEdge; warnings: string[] } | null {
  const pair = makeTreatyPair(country1, country2);
  const cacheKey = `treaty:${pair}`;

  const cached = getCached<TreatyEdge>(cacheKey);
  if (cached) {
    return {
      treaty: cached.data,
      warnings: cached.isStale ? [`Cached treaty data for ${pair} is stale`] : [],
    };
  }

  const staticTreaty = getStaticTreaty(country1, country2);
  if (!staticTreaty) return null;

  setCache(cacheKey, staticTreaty, {
    ttlMs: getDefaultTtl('static'),
    source: 'static',
  });

  return { treaty: staticTreaty, warnings: [] };
}

/**
 * List all supported jurisdiction codes.
 */
export function listJurisdictions(): CountryCode[] {
  return Object.keys(STATIC_JURISDICTIONS) as CountryCode[];
}

/**
 * List all treaty edges.
 */
export function listTreaties(): TreatyEdge[] {
  return [...TREATY_EDGES];
}

/** Static permitted-actions registry */
const STATIC_PERMITTED_ACTIONS: Record<CountryCode, PermittedAction[]> = {
  US: US_PERMITTED_ACTIONS,
  GB: GB_PERMITTED_ACTIONS,
  IN: IN_PERMITTED_ACTIONS,
  PT: PT_PERMITTED_ACTIONS,
};

/**
 * Get capital control rules for a jurisdiction.
 */
export function getCapitalControls(code: CountryCode): CapitalControlRules | null {
  const { jurisdiction } = getJurisdiction(code);
  return jurisdiction.capitalControls ?? null;
}

/**
 * Get permitted actions for a jurisdiction.
 */
export function getPermittedActions(code: CountryCode): PermittedAction[] {
  return STATIC_PERMITTED_ACTIONS[code] ?? [];
}

/**
 * Get exchange rate between two currencies.
 * Uses Frankfurter API with cache fallback.
 */
export async function getExchangeRate(
  from: CurrencyCode,
  to: CurrencyCode,
): Promise<{ rate: number; asOf: string; source: string; isStale: boolean }> {
  if (from === to) {
    return { rate: 1, asOf: new Date().toISOString(), source: 'identity', isStale: false };
  }

  const cacheKey = `fx:${from}:${to}`;
  const cached = getCached<{ rate: number; asOf: string; source: string }>(cacheKey);
  if (cached && !cached.isStale) {
    return { ...cached.data, isStale: false };
  }

  try {
    const result = await fetchExchangeRates(from);
    const rate = result.rates[to];
    if (rate !== undefined) {
      const entry = { rate, asOf: result.date, source: 'frankfurter' };
      setCache(cacheKey, entry, {
        ttlMs: getDefaultTtl('frankfurter'),
        source: 'frankfurter',
      });
      return { ...entry, isStale: false };
    }
  } catch {
    // Fall through to cached or fallback
  }

  // Return stale cache if available
  if (cached) {
    return { ...cached.data, isStale: true };
  }

  // Hardcoded fallback rates (approximate)
  const fallbackRates: Record<string, number> = {
    'USD:GBP': 0.79, 'USD:EUR': 0.92, 'USD:INR': 83.0,
    'GBP:USD': 1.27, 'GBP:EUR': 1.16, 'GBP:INR': 105.0,
    'EUR:USD': 1.09, 'EUR:GBP': 0.86, 'EUR:INR': 90.0,
    'INR:USD': 0.012, 'INR:GBP': 0.0095, 'INR:EUR': 0.011,
  };

  const fallbackRate = fallbackRates[`${from}:${to}`];
  if (fallbackRate !== undefined) {
    return {
      rate: fallbackRate,
      asOf: new Date().toISOString(),
      source: 'fallback',
      isStale: true,
    };
  }

  throw new Error(`No exchange rate available for ${from} → ${to}`);
}

/**
 * Convert an amount between currencies.
 */
export async function convertCurrency(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode,
): Promise<{ converted: number; rate: number; asOf: string; source: string }> {
  const { rate, asOf, source } = await getExchangeRate(from, to);
  return {
    converted: amount * rate,
    rate,
    asOf,
    source,
  };
}
