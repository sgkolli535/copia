/**
 * Tax Treaties Explorer provider (ICTD).
 *
 * Attempts to fetch treaty information from the ICTD Tax Treaties Explorer.
 * The ICTD dataset is published at https://www.tax-treaties.org and the
 * underlying data is also available via a data API.  Because the exact API
 * surface and structure may change, this implementation degrades gracefully:
 * it returns `null` when the upstream is unavailable or the response format
 * is unexpected.
 */

import type { CountryCode } from '@copia/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Withholding rate for a specific income category */
export interface WithholdingRate {
  /** Income type (e.g. "dividends", "interest", "royalties") */
  incomeType: string;
  /** Rate as a decimal (0.15 = 15%) */
  rate: number;
  /** Any qualifying conditions or footnotes */
  conditions: string;
}

/** Normalised treaty result from the ICTD data */
export interface TreatyApiResult {
  /** First country (ISO alpha-2) */
  country1: string;
  /** Second country (ISO alpha-2) */
  country2: string;
  /** Treaty title / name */
  treatyName: string;
  /** Year the treaty was signed */
  yearSigned: number | null;
  /** Year the treaty entered into force */
  yearInForce: number | null;
  /** Whether the treaty has been modified by the MLI */
  mliStatus: 'applied' | 'not_applied' | 'unknown';
  /** Withholding rate caps per income type */
  withholdingRates: WithholdingRate[];
  /** Broad treaty model (UN / OECD / other) */
  model: string;
  /** Free-text notes or caveats */
  notes: string;
  /** Data source identifier */
  source: 'ictd-tax-treaties';
  /** ISO 8601 timestamp of when this data was fetched */
  lastUpdated: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Base URL for the ICTD Tax Treaties dataset API.
 *
 * The Tax Treaties Explorer is typically available at:
 *   https://tax-treaties-explorer-api.ictd.ac/ or via a CKAN data store.
 * The exact endpoint may change; this is a best-effort integration.
 */
const BASE_URL = 'https://tax-treaties-explorer-api.ictd.ac';

/**
 * Mapping from two-letter ISO country codes to the names or codes the
 * ICTD dataset may use.
 */
const COUNTRY_NAME_MAP: Record<string, string> = {
  US: 'United States',
  GB: 'United Kingdom',
  IN: 'India',
  PT: 'Portugal',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolveCountryName(code: string): string {
  return COUNTRY_NAME_MAP[code.toUpperCase()] ?? code;
}

/**
 * Parse the raw API response into a normalised TreatyApiResult.
 *
 * The response structure is speculative -- this function is intentionally
 * lenient and extracts whatever it can find.
 */
function parseApiResponse(
  json: unknown,
  country1: string,
  country2: string,
  timestamp: string,
): TreatyApiResult | null {
  try {
    // The API may return an array of treaties or a single object.
    const records = Array.isArray(json)
      ? (json as Array<Record<string, unknown>>)
      : [json as Record<string, unknown>];

    if (records.length === 0) {
      return null;
    }

    const record = records[0];

    const treatyName =
      (record['treaty_name'] as string | undefined) ??
      (record['name'] as string | undefined) ??
      `${resolveCountryName(country1)}-${resolveCountryName(country2)} Tax Treaty`;

    const yearSigned = parseYear(record['year_signed'] ?? record['signed']);
    const yearInForce = parseYear(
      record['year_in_force'] ?? record['in_force'],
    );

    const mliRaw =
      (record['mli_status'] as string | undefined) ??
      (record['mli'] as string | undefined);
    const mliStatus = parseMliStatus(mliRaw);

    const withholdingRates = parseWithholdingRates(record);

    const model =
      (record['model'] as string | undefined) ??
      (record['treaty_model'] as string | undefined) ??
      'unknown';

    const notes =
      (record['notes'] as string | undefined) ??
      (record['remarks'] as string | undefined) ??
      '';

    return {
      country1,
      country2,
      treatyName,
      yearSigned,
      yearInForce,
      mliStatus,
      withholdingRates,
      model,
      notes,
      source: 'ictd-tax-treaties',
      lastUpdated: timestamp,
    };
  } catch {
    return null;
  }
}

function parseYear(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === 'number' ? value : parseInt(String(value), 10);
  return isNaN(n) ? null : n;
}

function parseMliStatus(
  value: string | undefined,
): 'applied' | 'not_applied' | 'unknown' {
  if (!value) return 'unknown';
  const lower = value.toLowerCase();
  if (lower.includes('applied') || lower === 'yes' || lower === 'true') {
    return 'applied';
  }
  if (lower.includes('not') || lower === 'no' || lower === 'false') {
    return 'not_applied';
  }
  return 'unknown';
}

function parseWithholdingRates(
  record: Record<string, unknown>,
): WithholdingRate[] {
  const rates: WithholdingRate[] = [];

  // Try structured array first.
  const rawRates = record['withholding_rates'] as
    | Array<Record<string, unknown>>
    | undefined;

  if (Array.isArray(rawRates)) {
    for (const r of rawRates) {
      rates.push({
        incomeType: String(r['income_type'] ?? r['type'] ?? 'unknown'),
        rate: parseFloat(String(r['rate'] ?? 0)),
        conditions: String(r['conditions'] ?? r['notes'] ?? ''),
      });
    }
    return rates;
  }

  // Fall back to well-known flat fields.
  const incomeTypes = ['dividends', 'interest', 'royalties'] as const;
  for (const incomeType of incomeTypes) {
    const rateField =
      record[`${incomeType}_rate`] ??
      record[`wht_${incomeType}`] ??
      record[incomeType];

    if (rateField !== undefined && rateField !== null) {
      const value = parseFloat(String(rateField));
      if (!isNaN(value)) {
        rates.push({
          incomeType,
          rate: value > 1 ? value / 100 : value, // normalise to decimal
          conditions: '',
        });
      }
    }
  }

  return rates;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch treaty information between two countries from the ICTD Tax Treaties
 * Explorer.
 *
 * @param country1 - ISO alpha-2 code of the first country.
 * @param country2 - ISO alpha-2 code of the second country.
 * @returns The normalised treaty result, or `null` if no data is available.
 */
export async function fetchTreatyInfo(
  country1: string,
  country2: string,
): Promise<TreatyApiResult | null> {
  const now = new Date().toISOString();

  // Normalise country order for consistent cache keys.
  const [c1, c2] = [country1, country2].sort() as [string, string];
  const name1 = resolveCountryName(c1);
  const name2 = resolveCountryName(c2);

  // Try a few plausible URL patterns; the ICTD API structure may vary.
  const urls = [
    `${BASE_URL}/treaties?country1=${encodeURIComponent(name1)}&country2=${encodeURIComponent(name2)}`,
    `${BASE_URL}/api/treaties?partner1=${encodeURIComponent(c1)}&partner2=${encodeURIComponent(c2)}`,
    `${BASE_URL}/treaties/${c1}/${c2}`,
  ];

  for (const url of urls) {
    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        continue;
      }

      const json: unknown = await response.json();
      const result = parseApiResponse(json, c1, c2, now);

      if (result) {
        return result;
      }
    } catch {
      // Try the next URL pattern.
    }
  }

  console.warn(
    `[treaties-tax] Could not fetch treaty data for ${c1}-${c2} from ICTD`,
  );
  return null;
}
