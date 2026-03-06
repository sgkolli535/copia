/**
 * Frankfurter API provider for exchange rates.
 *
 * Uses the free Frankfurter API (https://api.frankfurter.app) which sources
 * rates from the European Central Bank (ECB). The ECB does not publish INR
 * directly, so INR rates are calculated via a EUR cross rate using a
 * hardcoded fallback when the API does not include INR.
 */

import type { CurrencyCode } from '@copia/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExchangeRateResult {
  /** Base currency the rates are expressed against */
  base: CurrencyCode;
  /** Rates keyed by ISO 4217 currency code */
  rates: Record<string, number>;
  /** ISO 8601 date string the rates are valid for */
  date: string;
  /** Data source identifier */
  source: 'frankfurter';
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BASE_URL = 'https://api.frankfurter.app';

/** Currencies supported by the Copia system */
const SUPPORTED_CURRENCIES: CurrencyCode[] = ['USD', 'GBP', 'INR', 'EUR'];

/**
 * Fallback EUR -> INR rate used when the Frankfurter API (ECB) does not
 * include INR.  This should be periodically reviewed and updated.
 */
const FALLBACK_EUR_INR = 89.5;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Currencies the Frankfurter API (ECB) is known to support.
 * INR is NOT among them, so it is excluded from direct requests.
 */
const ECB_CURRENCIES: CurrencyCode[] = ['USD', 'GBP', 'EUR'];

function ecbTargets(base: CurrencyCode): string {
  return ECB_CURRENCIES.filter((c) => c !== base).join(',');
}

/**
 * Given a set of rates from Frankfurter (which may lack INR) and the base
 * currency, fills in an INR entry via a EUR cross rate.
 *
 * Strategy:
 *   - If the rates already include INR, use them directly.
 *   - If the base is EUR, apply the fallback EUR/INR.
 *   - Otherwise, derive EUR from the returned rates and cross-multiply.
 */
function ensureInr(
  rates: Record<string, number>,
  base: CurrencyCode,
): Record<string, number> {
  if (rates['INR'] !== undefined) {
    return rates;
  }

  const enriched = { ...rates };

  if (base === 'EUR') {
    enriched['INR'] = FALLBACK_EUR_INR;
  } else if (base === 'INR') {
    // Rates are already relative to INR; we need EUR in the result set.
    // If EUR is present we can skip; INR relative to itself is 1 (implicit).
    // Nothing additional to do.
  } else {
    // base is USD or GBP -- derive INR through EUR.
    const eurRate = enriched['EUR'];
    if (eurRate !== undefined) {
      enriched['INR'] = eurRate * FALLBACK_EUR_INR;
    }
  }

  return enriched;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch the latest exchange rates for the given base currency against all
 * other supported Copia currencies.
 *
 * Gracefully degrades: returns a best-effort result even when the upstream
 * API is unreachable (rates will be empty in that case).
 */
export async function fetchExchangeRates(
  base: CurrencyCode,
): Promise<ExchangeRateResult> {
  const targets = ecbTargets(base);
  const url = `${BASE_URL}/latest?base=${base}&symbols=${targets}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      console.warn(
        `[frankfurter] API returned ${response.status} for ${url}`,
      );
      return {
        base,
        rates: {},
        date: new Date().toISOString().slice(0, 10),
        source: 'frankfurter',
      };
    }

    const data = (await response.json()) as {
      base: string;
      date: string;
      rates: Record<string, number>;
    };

    const rates = ensureInr(data.rates, base);

    // If the base is INR, compute rates by inverting EUR-based lookup.
    if (base === 'INR') {
      return await fetchRatesForInrBase();
    }

    return {
      base,
      rates,
      date: data.date,
      source: 'frankfurter',
    };
  } catch (error) {
    console.warn('[frankfurter] Failed to fetch exchange rates:', error);
    return {
      base,
      rates: {},
      date: new Date().toISOString().slice(0, 10),
      source: 'frankfurter',
    };
  }
}

/**
 * Special handler for INR as the base currency.
 *
 * Because the ECB does not publish INR directly, we fetch EUR-based rates
 * and then mathematically invert them to express everything relative to INR.
 */
async function fetchRatesForInrBase(): Promise<ExchangeRateResult> {
  const url = `${BASE_URL}/latest?base=EUR&symbols=USD,GBP`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      return {
        base: 'INR',
        rates: {},
        date: new Date().toISOString().slice(0, 10),
        source: 'frankfurter',
      };
    }

    const data = (await response.json()) as {
      base: string;
      date: string;
      rates: Record<string, number>;
    };

    // EUR -> INR is our fallback constant.
    // 1 INR = 1 / FALLBACK_EUR_INR EUR
    const eurPerInr = 1 / FALLBACK_EUR_INR;
    const rates: Record<string, number> = {
      EUR: eurPerInr,
    };

    if (data.rates['USD'] !== undefined) {
      rates['USD'] = data.rates['USD'] / FALLBACK_EUR_INR;
    }
    if (data.rates['GBP'] !== undefined) {
      rates['GBP'] = data.rates['GBP'] / FALLBACK_EUR_INR;
    }

    return {
      base: 'INR',
      rates,
      date: data.date,
      source: 'frankfurter',
    };
  } catch (error) {
    console.warn(
      '[frankfurter] Failed to fetch INR-base rates via EUR cross:',
      error,
    );
    return {
      base: 'INR',
      rates: {},
      date: new Date().toISOString().slice(0, 10),
      source: 'frankfurter',
    };
  }
}

/**
 * Fetch a historical exchange rate between two currencies on a specific date.
 *
 * @param base   - The base currency code.
 * @param target - The target currency code.
 * @param date   - ISO 8601 date string (YYYY-MM-DD).
 * @returns The exchange rate as a number, or NaN if unavailable.
 */
export async function fetchHistoricalRate(
  base: CurrencyCode,
  target: CurrencyCode,
  date: string,
): Promise<number> {
  if (base === target) {
    return 1;
  }

  // If either currency is INR, use the EUR cross-rate approach.
  if (base === 'INR' || target === 'INR') {
    return fetchHistoricalInrRate(base, target, date);
  }

  const url = `${BASE_URL}/${date}?base=${base}&symbols=${target}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      console.warn(
        `[frankfurter] Historical rate API returned ${response.status} for ${url}`,
      );
      return NaN;
    }

    const data = (await response.json()) as {
      rates: Record<string, number>;
    };

    return data.rates[target] ?? NaN;
  } catch (error) {
    console.warn('[frankfurter] Failed to fetch historical rate:', error);
    return NaN;
  }
}

/**
 * Internal helper that calculates a historical rate involving INR via a
 * EUR cross rate, since the ECB does not publish INR.
 */
async function fetchHistoricalInrRate(
  base: CurrencyCode,
  target: CurrencyCode,
  date: string,
): Promise<number> {
  // Determine which ECB-published currencies we actually need.
  const ecbBase = base === 'INR' ? 'EUR' : base;
  const ecbTarget = target === 'INR' ? 'EUR' : target;

  if (ecbBase === ecbTarget) {
    // e.g. EUR -> INR or INR -> EUR
    return base === 'INR' ? 1 / FALLBACK_EUR_INR : FALLBACK_EUR_INR;
  }

  const url = `${BASE_URL}/${date}?base=${ecbBase}&symbols=${ecbTarget}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      return NaN;
    }

    const data = (await response.json()) as {
      rates: Record<string, number>;
    };

    const ecbRate = data.rates[ecbTarget];
    if (ecbRate === undefined) {
      return NaN;
    }

    // base=INR, target=USD  ->  1 INR = (1/FALLBACK_EUR_INR) EUR * ecbRate USD/EUR
    if (base === 'INR') {
      return ecbRate / FALLBACK_EUR_INR;
    }

    // base=USD, target=INR  ->  1 USD = ecbRate EUR * FALLBACK_EUR_INR INR/EUR
    return ecbRate * FALLBACK_EUR_INR;
  } catch (error) {
    console.warn(
      '[frankfurter] Failed to fetch historical INR cross rate:',
      error,
    );
    return NaN;
  }
}
