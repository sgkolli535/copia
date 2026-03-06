/**
 * OECD Statistics API provider.
 *
 * Uses the OECD SDMX REST API (https://sdmx.oecd.org/public/rest/) to fetch
 * macro-level tax revenue statistics.  The OECD SDMX API is quite complex and
 * dataset identifiers / dimension structures change over time, so this is a
 * best-effort implementation that degrades gracefully when the upstream
 * service is unavailable or the response format is unexpected.
 */

import type { CountryCode } from '@copia/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single tax revenue observation from the OECD */
export interface OecdTaxObservation {
  /** Tax revenue category (e.g. "1000" = Total tax revenue) */
  category: string;
  /** Human-readable label when available */
  label: string;
  /** Year the data refers to */
  year: number;
  /** Value (typically percentage of GDP or absolute amount) */
  value: number;
  /** Unit of measurement */
  unit: string;
}

/** Normalised result returned by the OECD provider */
export interface OecdTaxData {
  /** ISO country code queried */
  countryCode: string;
  /** Array of tax revenue observations */
  observations: OecdTaxObservation[];
  /** Data source identifier */
  source: 'oecd';
  /** ISO 8601 timestamp of when this data was fetched */
  lastUpdated: string;
  /** Indicates whether live data was fetched or a fallback was used */
  isLive: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BASE_URL = 'https://sdmx.oecd.org/public/rest';

/**
 * The Revenue Statistics dataset (REV).  Dimension order (SDMX key):
 *   COUNTRY . TAX . GOV . VAR (variable = e.g. TAXGDP)
 *
 * We request total tax revenue (TAX = "TOTALTAX") as a percentage of GDP
 * (VAR = "TAXGDP") for all levels of government (GOV = "NES" -- national
 * estimates).
 */
const DATASET_ID = 'REV';

/**
 * Mapping from Copia CountryCode to the three-letter ISO code the OECD uses.
 */
const COUNTRY_MAP: Record<string, string> = {
  US: 'USA',
  GB: 'GBR',
  IN: 'IND',
  PT: 'PRT',
  // Extend as new jurisdictions are added to Copia.
};

/**
 * Fallback data for when the OECD API is unavailable. Values represent
 * total tax revenue as a percentage of GDP (approximate, circa 2022).
 */
const FALLBACK_DATA: Record<string, OecdTaxObservation[]> = {
  USA: [
    {
      category: 'TOTALTAX',
      label: 'Total tax revenue (% of GDP)',
      year: 2022,
      value: 27.7,
      unit: '% of GDP',
    },
  ],
  GBR: [
    {
      category: 'TOTALTAX',
      label: 'Total tax revenue (% of GDP)',
      year: 2022,
      value: 35.3,
      unit: '% of GDP',
    },
  ],
  IND: [
    {
      category: 'TOTALTAX',
      label: 'Total tax revenue (% of GDP)',
      year: 2022,
      value: 17.5,
      unit: '% of GDP',
    },
  ],
  PRT: [
    {
      category: 'TOTALTAX',
      label: 'Total tax revenue (% of GDP)',
      year: 2022,
      value: 34.8,
      unit: '% of GDP',
    },
  ],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Resolve a Copia CountryCode (or any string) to an OECD 3-letter code.
 * Falls back to the input string if no mapping exists.
 */
function resolveOecdCountry(code: string): string {
  return COUNTRY_MAP[code] ?? code;
}

/**
 * Parse the SDMX-JSON response into normalised observations.
 *
 * The SDMX-JSON format is deeply nested; this parser makes a best-effort
 * attempt and returns an empty array if the structure is unexpected.
 */
function parseObservations(json: unknown): OecdTaxObservation[] {
  const observations: OecdTaxObservation[] = [];

  try {
    const root = json as Record<string, unknown>;
    const dataSets = root['dataSets'] as Array<Record<string, unknown>> | undefined;
    const structure = root['structure'] as Record<string, unknown> | undefined;

    if (!dataSets?.length || !structure) {
      return observations;
    }

    // Extract time dimension values for labelling.
    const dimensions = structure['dimensions'] as Record<string, unknown> | undefined;
    const observationDims =
      (dimensions?.['observation'] as Array<Record<string, unknown>>) ?? [];
    const timeDim = observationDims.find(
      (d) => (d['id'] as string)?.toUpperCase() === 'TIME_PERIOD',
    );
    const timeValues =
      (timeDim?.['values'] as Array<Record<string, string>>) ?? [];

    const series =
      (dataSets[0]['series'] as Record<string, Record<string, unknown>>) ?? {};

    for (const seriesKey of Object.keys(series)) {
      const seriesObj = series[seriesKey];
      const obs =
        (seriesObj['observations'] as Record<string, Array<number | null>>) ?? {};

      for (const obsKey of Object.keys(obs)) {
        const value = obs[obsKey]?.[0];
        if (value === null || value === undefined) continue;

        const timeIndex = parseInt(obsKey, 10);
        const yearStr = timeValues[timeIndex]?.['id'] ?? obsKey;
        const year = parseInt(yearStr, 10);

        observations.push({
          category: 'TOTALTAX',
          label: 'Total tax revenue (% of GDP)',
          year: isNaN(year) ? 0 : year,
          value,
          unit: '% of GDP',
        });
      }
    }
  } catch {
    // Swallow parse errors -- caller will see an empty array.
  }

  return observations;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch tax revenue statistics for a given country from the OECD.
 *
 * @param countryCode - Two-letter ISO country code (Copia CountryCode) or
 *   three-letter OECD code.
 * @returns Normalised tax revenue data.  If the live API is unavailable the
 *   result falls back to hardcoded approximations with `isLive: false`.
 */
export async function fetchTaxRevenueData(
  countryCode: string,
): Promise<OecdTaxData> {
  const oecdCode = resolveOecdCountry(countryCode);
  const now = new Date().toISOString();

  // SDMX REST key: COUNTRY.TOTALTAX.NES.TAXGDP
  const dataKey = `${oecdCode}.TOTALTAX.NES.TAXGDP`;
  const url =
    `${BASE_URL}/data/${DATASET_ID}/${dataKey}` +
    `?dimensionAtObservation=TimeDimension` +
    `&format=application/vnd.sdmx.data+json;version=2.0.0`;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/vnd.sdmx.data+json;version=2.0.0',
      },
    });

    if (!response.ok) {
      console.warn(
        `[oecd] API returned ${response.status} for ${oecdCode}; using fallback`,
      );
      return buildFallback(countryCode, oecdCode, now);
    }

    const json: unknown = await response.json();
    const observations = parseObservations(json);

    if (observations.length === 0) {
      console.warn(
        `[oecd] No observations parsed for ${oecdCode}; using fallback`,
      );
      return buildFallback(countryCode, oecdCode, now);
    }

    return {
      countryCode,
      observations,
      source: 'oecd',
      lastUpdated: now,
      isLive: true,
    };
  } catch (error) {
    console.warn('[oecd] Failed to fetch tax revenue data:', error);
    return buildFallback(countryCode, oecdCode, now);
  }
}

// ---------------------------------------------------------------------------
// Fallback builder
// ---------------------------------------------------------------------------

function buildFallback(
  countryCode: string,
  oecdCode: string,
  timestamp: string,
): OecdTaxData {
  const fallback = FALLBACK_DATA[oecdCode] ?? [];

  return {
    countryCode,
    observations: fallback,
    source: 'oecd',
    lastUpdated: timestamp,
    isLive: false,
  };
}
