/**
 * HMRC Manuals API provider.
 *
 * Fetches structured content from the GOV.UK Content API which exposes
 * HMRC guidance manuals.  The API is publicly available at
 * https://www.gov.uk/api/content/ and returns JSON.
 *
 * Useful manual IDs for Copia:
 *   - "inheritance-tax-manual" (IHTM)
 *   - "rdr3" (Statutory Residence Test guidance)
 *   - "capital-gains-manual"
 *   - "trusts-settlements-and-estates-manual"
 */

import type { CountryCode } from '@copia/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A child section reference within a manual */
export interface HmrcChildSection {
  /** Section ID (slug) */
  sectionId: string;
  /** Section title */
  title: string;
  /** Relative web path */
  webUrl: string;
}

/** Normalised result for a single HMRC manual section */
export interface HmrcSection {
  /** Manual identifier (e.g. "inheritance-tax-manual") */
  manualId: string;
  /** Section identifier within the manual */
  sectionId: string;
  /** Section title */
  title: string;
  /** HTML body of the section guidance */
  bodyHtml: string;
  /** Plain-text extract (HTML stripped) for easier processing */
  bodyText: string;
  /** Breadcrumb / parent section titles */
  breadcrumbs: string[];
  /** Child (sub-section) references */
  childSections: HmrcChildSection[];
  /** Full GOV.UK URL for this section */
  webUrl: string;
  /** Data source identifier */
  source: 'hmrc';
  /** ISO 8601 timestamp from the API (public_updated_at) or fetch time */
  lastUpdated: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BASE_URL = 'https://www.gov.uk/api/content';

/**
 * Well-known HMRC manual IDs that Copia may reference.
 * Provided as a convenience for callers.
 */
export const KNOWN_MANUALS = {
  INHERITANCE_TAX: 'inheritance-tax-manual',
  STATUTORY_RESIDENCE: 'rdr3',
  CAPITAL_GAINS: 'capital-gains-manual',
  TRUSTS: 'trusts-settlements-and-estates-manual',
} as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Strip HTML tags to produce a plain-text version of the body content.
 * This is intentionally simple -- it removes tags and collapses whitespace
 * but does not attempt full HTML-to-Markdown conversion.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Build the API path for a manual section.
 *
 * GOV.UK content paths take the form:
 *   /hmrc-internal-manuals/{manualId}/{sectionId}
 *
 * For top-level manual pages:
 *   /hmrc-internal-manuals/{manualId}
 *
 * Some manuals (like RDR3) live at /government/publications paths instead,
 * so we try multiple patterns.
 */
function buildPaths(manualId: string, sectionId: string): string[] {
  const paths: string[] = [];

  if (sectionId) {
    paths.push(
      `${BASE_URL}/hmrc-internal-manuals/${manualId}/${sectionId}`,
    );
    // Some section IDs are lowercase versions of the manual prefix + number,
    // e.g. ihtm04031 under inheritance-tax-manual.
    paths.push(
      `${BASE_URL}/hmrc-internal-manuals/${manualId}/${sectionId.toLowerCase()}`,
    );
  } else {
    paths.push(`${BASE_URL}/hmrc-internal-manuals/${manualId}`);
  }

  // Fallback: guidance or government publications path.
  paths.push(`${BASE_URL}/guidance/${manualId}`);

  return paths;
}

/**
 * Parse the GOV.UK Content API JSON into our normalised HmrcSection.
 */
function parseContentResponse(
  json: unknown,
  manualId: string,
  sectionId: string,
): HmrcSection | null {
  try {
    const root = json as Record<string, unknown>;

    const title = (root['title'] as string | undefined) ?? '';
    const webUrl =
      typeof root['web_url'] === 'string'
        ? (root['web_url'] as string)
        : `https://www.gov.uk/hmrc-internal-manuals/${manualId}/${sectionId}`;

    const publicUpdatedAt =
      (root['public_updated_at'] as string | undefined) ??
      new Date().toISOString();

    // Body content lives in `details.body` for manual sections.
    const details = (root['details'] as Record<string, unknown>) ?? {};
    const manualDetails =
      (details['manual'] as Record<string, unknown> | undefined);
    const bodyHtml =
      (details['body'] as string | undefined) ??
      (manualDetails?.['body'] as string | undefined) ??
      '';

    // Breadcrumbs.
    const links = (root['links'] as Record<string, unknown>) ?? {};
    const breadcrumbItems =
      (links['breadcrumbs'] as Array<Record<string, unknown>>) ??
      (links['parent'] as Array<Record<string, unknown>>) ??
      [];
    const breadcrumbs = breadcrumbItems
      .map((b) => (b['title'] as string | undefined) ?? '')
      .filter(Boolean);

    // Child sections.
    const childSectionRefs =
      (details['child_section_groups'] as Array<Record<string, unknown>>) ??
      [];
    const childSections: HmrcChildSection[] = [];

    for (const group of childSectionRefs) {
      const items =
        (group['child_sections'] as Array<Record<string, unknown>>) ?? [];
      for (const item of items) {
        const childTitle = (item['title'] as string | undefined) ?? '';
        const basePath =
          (item['base_path'] as string | undefined) ?? '';
        const childId =
          (item['section_id'] as string | undefined) ??
          basePath.split('/').pop() ??
          '';

        childSections.push({
          sectionId: childId,
          title: childTitle,
          webUrl: basePath
            ? `https://www.gov.uk${basePath}`
            : '',
        });
      }
    }

    // Also check links.children for top-level manual pages.
    const linkedChildren =
      (links['children'] as Array<Record<string, unknown>>) ?? [];
    for (const child of linkedChildren) {
      const childTitle = (child['title'] as string | undefined) ?? '';
      const basePath = (child['base_path'] as string | undefined) ?? '';
      const childId = basePath.split('/').pop() ?? '';

      if (childId && !childSections.some((cs) => cs.sectionId === childId)) {
        childSections.push({
          sectionId: childId,
          title: childTitle,
          webUrl: basePath ? `https://www.gov.uk${basePath}` : '',
        });
      }
    }

    return {
      manualId,
      sectionId: sectionId || manualId,
      title,
      bodyHtml,
      bodyText: stripHtml(bodyHtml),
      breadcrumbs,
      childSections,
      webUrl,
      source: 'hmrc',
      lastUpdated: publicUpdatedAt,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch a section from an HMRC manual via the GOV.UK Content API.
 *
 * @param manualId  - Slug identifier of the manual
 *   (e.g. "inheritance-tax-manual", "rdr3").
 * @param sectionId - Slug identifier of the section within the manual
 *   (e.g. "ihtm04031").  Pass an empty string to fetch the manual index page.
 * @returns The structured section content, or `null` if unavailable.
 */
export async function fetchHmrcManual(
  manualId: string,
  sectionId: string,
): Promise<HmrcSection | null> {
  const paths = buildPaths(manualId, sectionId);

  for (const url of paths) {
    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        // Try next path variant.
        continue;
      }

      const json: unknown = await response.json();
      const result = parseContentResponse(json, manualId, sectionId);

      if (result) {
        return result;
      }
    } catch {
      // Try next URL pattern.
    }
  }

  console.warn(
    `[hmrc] Could not fetch manual section: ${manualId}/${sectionId}`,
  );
  return null;
}
