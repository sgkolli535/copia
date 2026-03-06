import type { CurrencyCode } from '@copia/types';
import type { ExchangeRateSnapshot } from '@copia/types';

/**
 * Create a canonical rate key for the exchange rate map.
 */
export function rateKey(from: CurrencyCode, to: CurrencyCode): string {
  return `${from}:${to}`;
}

/**
 * Build an exchange rate map from an array of ExchangeRateSnapshot values.
 *
 * The map is keyed by "FROM:TO" strings (e.g. "GBP:USD") and stores the
 * numeric rate. Identity rates (X:X = 1) are added for every currency
 * that appears in the snapshots.
 */
export function buildExchangeRateMap(
  snapshots: ExchangeRateSnapshot[],
): Map<string, number> {
  const map = new Map<string, number>();
  const currencies = new Set<CurrencyCode>();

  for (const snap of snapshots) {
    map.set(rateKey(snap.from, snap.to), snap.rate);
    currencies.add(snap.from);
    currencies.add(snap.to);
  }

  // Add identity rates
  for (const ccy of currencies) {
    map.set(rateKey(ccy, ccy), 1);
  }

  return map;
}

/**
 * Get an exchange rate from the map.
 *
 * Throws if the pair is missing so that callers never silently use an
 * incorrect rate.
 */
export function getRate(
  map: Map<string, number>,
  from: CurrencyCode,
  to: CurrencyCode,
): number {
  if (from === to) return 1;

  const key = rateKey(from, to);
  const rate = map.get(key);
  if (rate !== undefined) return rate;

  // Try inverse
  const inverseKey = rateKey(to, from);
  const inverseRate = map.get(inverseKey);
  if (inverseRate !== undefined && inverseRate !== 0) {
    return 1 / inverseRate;
  }

  throw new Error(
    `Exchange rate not available for ${from} -> ${to}. Ensure loadExchangeRates included this pair.`,
  );
}

/**
 * Convert an amount from one currency to another using the rate map.
 */
export function convert(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode,
  rateMap: Map<string, number>,
): number {
  if (from === to) return amount;
  const rate = getRate(rateMap, from, to);
  return amount * rate;
}
