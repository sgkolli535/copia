import type {
  UserProfile,
  CountryCode,
  CurrencyCode,
  Jurisdiction,
  TreatyEdge,
  ExchangeRateSnapshot,
} from '@copia/types';
import { COUNTRY_CURRENCIES } from '@copia/types';
import {
  getJurisdiction,
  getTreaty,
  listJurisdictions,
  getExchangeRate,
} from '@copia/data-service';

export { getJurisdiction, getTreaty, listJurisdictions, getExchangeRate };

/**
 * Collect every distinct CountryCode referenced in a profile:
 * citizenships, residency countries, asset situs locations, and family
 * member citizenships / residencies.
 */
function collectCountryCodes(profile: UserProfile): Set<CountryCode> {
  const codes = new Set<CountryCode>();

  for (const c of profile.citizenships) codes.add(c);
  for (const r of profile.residencies) codes.add(r.country);
  for (const a of profile.assets) codes.add(a.spikeLocation);

  for (const member of profile.family) {
    for (const c of member.citizenships) codes.add(c);
    if (member.residency) codes.add(member.residency.country);
  }

  return codes;
}

/**
 * Load all Jurisdiction objects relevant to a profile.
 *
 * This pulls from the data-service layer (which merges static +
 * API-sourced data, with caching).
 */
export function loadProfileJurisdictions(
  profile: UserProfile,
): { jurisdictions: Map<CountryCode, Jurisdiction>; warnings: string[] } {
  const codes = collectCountryCodes(profile);
  const map = new Map<CountryCode, Jurisdiction>();
  const warnings: string[] = [];

  for (const code of codes) {
    try {
      const result = getJurisdiction(code);
      map.set(code, result.jurisdiction);
      warnings.push(...result.warnings);
    } catch {
      // Unsupported jurisdiction -- skip silently; the pipeline will
      // still process other jurisdictions and flag the gap.
    }
  }

  return { jurisdictions: map, warnings };
}

/**
 * Load every treaty edge that could be relevant given the set of
 * jurisdictions in the profile.
 *
 * For N jurisdictions this checks all N*(N-1)/2 pairs.
 */
export function loadProfileTreaties(profile: UserProfile): { treaties: TreatyEdge[]; warnings: string[] } {
  const codes = [...collectCountryCodes(profile)];
  const treaties: TreatyEdge[] = [];
  const warnings: string[] = [];

  for (let i = 0; i < codes.length; i++) {
    for (let j = i + 1; j < codes.length; j++) {
      const result = getTreaty(codes[i], codes[j]);
      if (result) {
        treaties.push(result.treaty);
        warnings.push(...result.warnings);
      }
    }
  }

  return { treaties, warnings };
}

/**
 * Collect every distinct CurrencyCode that appears in the profile
 * (asset currencies, reporting currency, and the native currencies of
 * all referenced jurisdictions).
 */
function collectCurrencyCodes(profile: UserProfile): Set<CurrencyCode> {
  const currencies = new Set<CurrencyCode>();

  currencies.add(profile.reportingCurrency);

  for (const asset of profile.assets) {
    currencies.add(asset.currency);
  }

  const countryCodes = collectCountryCodes(profile);
  for (const cc of countryCodes) {
    const localCurrency = COUNTRY_CURRENCIES[cc];
    if (localCurrency) currencies.add(localCurrency);
  }

  return currencies;
}

/**
 * Fetch all exchange rate snapshots the pipeline will need.
 *
 * For each pair of distinct currencies referenced in the profile we
 * fetch the rate via the data-service (which talks to Frankfurter API,
 * with cache and fallback).
 */
export async function loadExchangeRates(
  profile: UserProfile,
): Promise<ExchangeRateSnapshot[]> {
  const currencies = [...collectCurrencyCodes(profile)];
  const snapshots: ExchangeRateSnapshot[] = [];

  for (let i = 0; i < currencies.length; i++) {
    for (let j = i + 1; j < currencies.length; j++) {
      const from = currencies[i];
      const to = currencies[j];

      try {
        const fwd = await getExchangeRate(from, to);
        snapshots.push({
          from,
          to,
          rate: fwd.rate,
          asOf: fwd.asOf,
          source: fwd.source,
        });

        // Also store the inverse so look-ups in either direction work
        snapshots.push({
          from: to,
          to: from,
          rate: fwd.rate !== 0 ? 1 / fwd.rate : 0,
          asOf: fwd.asOf,
          source: fwd.source,
        });
      } catch {
        // If a rate is unavailable we log but don't crash --
        // the pipeline will throw at the point it actually needs it.
      }
    }
  }

  return snapshots;
}
