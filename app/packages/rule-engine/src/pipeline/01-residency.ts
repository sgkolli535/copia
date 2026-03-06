import type {
  UserProfile,
  CountryCode,
  Jurisdiction,
  ConfidenceTier,
  SourceCitation,
} from '@copia/types';
import type { AuditEntry } from '@copia/types';

const ENGINE_VERSION = '1.0.0';

// -----------------------------------------------------------------------
// Public interface
// -----------------------------------------------------------------------

export interface ResidencyDetermination {
  personId: string;
  personName: string;
  jurisdiction: CountryCode;
  isResident: boolean;
  residencyCategory: string;
  taxScope: 'worldwide' | 'domestic' | 'remittance';
  basis: string;
  confidence: ConfidenceTier;
  citations: SourceCitation[];
}

// -----------------------------------------------------------------------
// Helpers – per-jurisdiction residency logic
// -----------------------------------------------------------------------

interface PersonInfo {
  id: string;
  name: string;
  citizenships: CountryCode[];
  daysPresent: number;
  isDomiciled: boolean;
  yearsResident: number;
  status: string;
}

function makeCitation(
  jurisdiction: CountryCode,
  title: string,
  reference: string,
  confidence: ConfidenceTier,
): SourceCitation {
  return {
    id: `cit-${jurisdiction}-${reference.replace(/[^a-zA-Z0-9]/g, '')}`,
    sourceType: 'statute',
    title,
    reference,
    url: null,
    confidence,
    asOfDate: new Date().toISOString().slice(0, 10),
    jurisdiction,
  };
}

/** US: citizenship-based + substantial presence test */
function determineUS(person: PersonInfo, residency: { daysPresent: number; isDomiciled: boolean; yearsResident: number; status: string } | null): ResidencyDetermination[] {
  const results: ResidencyDetermination[] = [];
  const isUSCitizen = person.citizenships.includes('US');

  if (isUSCitizen) {
    results.push({
      personId: person.id,
      personName: person.name,
      jurisdiction: 'US',
      isResident: true,
      residencyCategory: 'us-citizen',
      taxScope: 'worldwide',
      basis: 'US citizens are taxed on worldwide estate regardless of residence (IRC section 2001).',
      confidence: 'statutory',
      citations: [
        makeCitation('US', 'US Citizenship-Based Taxation', 'IRC section 2001', 'statutory'),
      ],
    });
    return results;
  }

  // Check substantial presence / green card
  if (residency) {
    if (residency.status === 'green_card' || residency.isDomiciled) {
      results.push({
        personId: person.id,
        personName: person.name,
        jurisdiction: 'US',
        isResident: true,
        residencyCategory: 'us-resident-alien',
        taxScope: 'worldwide',
        basis: `Lawful permanent resident (green card) or US domiciliary; worldwide estate taxation applies.`,
        confidence: 'statutory',
        citations: [
          makeCitation('US', 'Resident Alien Estate Tax', 'IRC section 2031', 'statutory'),
        ],
      });
    } else if (residency.daysPresent >= 183) {
      results.push({
        personId: person.id,
        personName: person.name,
        jurisdiction: 'US',
        isResident: true,
        residencyCategory: 'us-spt-resident',
        taxScope: 'worldwide',
        basis: `Met substantial presence test with ${residency.daysPresent} days (>= 183). Treated as US tax resident.`,
        confidence: 'statutory',
        citations: [
          makeCitation('US', 'Substantial Presence Test', 'IRC section 7701(b)', 'statutory'),
        ],
      });
    } else {
      results.push({
        personId: person.id,
        personName: person.name,
        jurisdiction: 'US',
        isResident: false,
        residencyCategory: 'us-nonresident-alien',
        taxScope: 'domestic',
        basis: `Non-resident alien: ${residency.daysPresent} days present (< 183), not a US citizen or green card holder. Taxed only on US-situs assets.`,
        confidence: 'statutory',
        citations: [
          makeCitation('US', 'Non-Resident Alien Estate Tax', 'IRC section 2101-2108', 'statutory'),
        ],
      });
    }
  }

  return results;
}

/** GB: SRT days test + domicile/deemed domicile for IHT */
function determineGB(person: PersonInfo, residency: { daysPresent: number; isDomiciled: boolean; yearsResident: number; status: string } | null): ResidencyDetermination[] {
  const results: ResidencyDetermination[] = [];

  if (!residency) return results;

  // SRT income/CGT residence
  const isSRTResident = residency.daysPresent >= 183;

  // IHT domicile / deemed domicile
  const isDeemedDomiciled = residency.yearsResident >= 15;
  const isDomiciled = residency.isDomiciled;

  if (isDomiciled || isDeemedDomiciled) {
    results.push({
      personId: person.id,
      personName: person.name,
      jurisdiction: 'GB',
      isResident: true,
      residencyCategory: isDeemedDomiciled && !isDomiciled ? 'deemed_domiciled' : 'gb-domiciled',
      taxScope: 'worldwide',
      basis: isDeemedDomiciled && !isDomiciled
        ? `Deemed UK-domiciled for IHT: UK resident for ${residency.yearsResident} of previous 20 tax years (>= 15). Worldwide assets within IHT scope.`
        : 'UK-domiciled: worldwide assets subject to UK IHT.',
      confidence: 'statutory',
      citations: [
        makeCitation('GB', 'UK Deemed Domicile Rule', 'IHTA 1984 section 267', 'statutory'),
        ...(isDeemedDomiciled ? [makeCitation('GB', 'Finance Act 2017 Deemed Domicile', 'Finance (No. 2) Act 2017 s30', 'statutory')] : []),
      ],
    });
  } else if (isSRTResident) {
    // SRT resident but not domiciled -- domestic scope for IHT (UK-situs only),
    // worldwide for income/CGT
    results.push({
      personId: person.id,
      personName: person.name,
      jurisdiction: 'GB',
      isResident: true,
      residencyCategory: 'gb-non-domiciled',
      taxScope: 'domestic',
      basis: `UK tax resident under SRT (${residency.daysPresent} days >= 183) but not UK-domiciled (${residency.yearsResident} years < 15). IHT applies only to UK-situs assets.`,
      confidence: 'statutory',
      citations: [
        makeCitation('GB', 'Statutory Residence Test', 'Finance Act 2013 Schedule 45', 'statutory'),
        makeCitation('GB', 'Non-Domiciled IHT Scope', 'IHTA 1984 section 6(1)', 'statutory'),
      ],
    });
  } else {
    results.push({
      personId: person.id,
      personName: person.name,
      jurisdiction: 'GB',
      isResident: false,
      residencyCategory: 'gb-srt-non-resident',
      taxScope: 'domestic',
      basis: `Not UK tax resident under SRT (${residency.daysPresent} days < 183). IHT applies only to UK-situs assets.`,
      confidence: 'statutory',
      citations: [
        makeCitation('GB', 'Statutory Residence Test', 'Finance Act 2013 Schedule 45', 'statutory'),
      ],
    });
  }

  return results;
}

/** IN: 182-day test, 60-day + prior years test, NRI, RNOR */
function determineIN(person: PersonInfo, residency: { daysPresent: number; isDomiciled: boolean; yearsResident: number; status: string } | null): ResidencyDetermination[] {
  const results: ResidencyDetermination[] = [];

  if (!residency) return results;

  const days = residency.daysPresent;

  // India has no estate tax (abolished 1985). We still determine residency
  // for income/CGT purposes and stamp duty applicability.

  if (days >= 182) {
    results.push({
      personId: person.id,
      personName: person.name,
      jurisdiction: 'IN',
      isResident: true,
      residencyCategory: 'resident',
      taxScope: 'worldwide',
      basis: `Indian resident: ${days} days present (>= 182). Subject to Indian income tax on worldwide income. No estate duty (abolished 1985).`,
      confidence: 'statutory',
      citations: [
        makeCitation('IN', 'India Residency Test', 'Income Tax Act 1961 section 6(1)', 'statutory'),
        makeCitation('IN', 'Estate Duty Abolition', 'Estate Duty (Abolition) Act 1985', 'statutory'),
      ],
    });
  } else if (days >= 60) {
    // The 60-day + 365 in prior 4 years test -- we approximate by checking
    // yearsResident (if they've been resident at least 1 prior year).
    const hasPriorPresence = residency.yearsResident >= 1;
    if (hasPriorPresence) {
      results.push({
        personId: person.id,
        personName: person.name,
        jurisdiction: 'IN',
        isResident: true,
        residencyCategory: 'RNOR',
        taxScope: 'remittance',
        basis: `Indian resident (RNOR) under 60-day + prior-year test: ${days} days present (>= 60) with prior Indian residency. Taxed on Indian-source income and income received/remitted to India.`,
        confidence: 'interpretive',
        citations: [
          makeCitation('IN', 'India 60-Day Residency Test', 'Income Tax Act 1961 section 6(6)', 'interpretive'),
        ],
      });
    } else {
      results.push({
        personId: person.id,
        personName: person.name,
        jurisdiction: 'IN',
        isResident: false,
        residencyCategory: 'NRI',
        taxScope: 'domestic',
        basis: `Non-Resident Indian (NRI): ${days} days present (< 182) with no significant prior-year presence. Taxed only on Indian-source income.`,
        confidence: 'statutory',
        citations: [
          makeCitation('IN', 'NRI Status', 'Income Tax Act 1961 section 6', 'statutory'),
        ],
      });
    }
  } else {
    results.push({
      personId: person.id,
      personName: person.name,
      jurisdiction: 'IN',
      isResident: false,
      residencyCategory: 'NRI',
      taxScope: 'domestic',
      basis: `Non-Resident Indian (NRI): ${days} days present (< 60). Taxed only on Indian-source income. No estate duty.`,
      confidence: 'statutory',
      citations: [
        makeCitation('IN', 'NRI Status', 'Income Tax Act 1961 section 6', 'statutory'),
      ],
    });
  }

  return results;
}

/** PT: 183-day test or habitual abode */
function determinePT(person: PersonInfo, residency: { daysPresent: number; isDomiciled: boolean; yearsResident: number; status: string } | null): ResidencyDetermination[] {
  const results: ResidencyDetermination[] = [];

  if (!residency) return results;

  const days = residency.daysPresent;

  if (days >= 183 || residency.isDomiciled) {
    results.push({
      personId: person.id,
      personName: person.name,
      jurisdiction: 'PT',
      isResident: true,
      residencyCategory: 'resident',
      taxScope: 'worldwide',
      basis: residency.isDomiciled
        ? 'Portuguese tax resident: habitual abode in Portugal. Worldwide income subject to IRS.'
        : `Portuguese tax resident: ${days} days present (>= 183). Worldwide income subject to IRS.`,
      confidence: 'statutory',
      citations: [
        makeCitation('PT', 'Portugal Residency Rule', 'Codigo do IRS Art 16', 'statutory'),
      ],
    });
  } else {
    results.push({
      personId: person.id,
      personName: person.name,
      jurisdiction: 'PT',
      isResident: false,
      residencyCategory: 'non-resident',
      taxScope: 'domestic',
      basis: `Non-resident in Portugal: ${days} days present (< 183) and no habitual abode. Subject to tax only on Portuguese-source income.`,
      confidence: 'statutory',
      citations: [
        makeCitation('PT', 'Portugal Non-Resident', 'Codigo do IRS Art 16', 'statutory'),
      ],
    });
  }

  return results;
}

// -----------------------------------------------------------------------
// Dispatch map
// -----------------------------------------------------------------------

type JurisdictionDeterminer = (
  person: PersonInfo,
  residency: { daysPresent: number; isDomiciled: boolean; yearsResident: number; status: string } | null,
) => ResidencyDetermination[];

const DETERMINERS: Record<CountryCode, JurisdictionDeterminer> = {
  US: determineUS,
  GB: determineGB,
  IN: determineIN,
  PT: determinePT,
};

// -----------------------------------------------------------------------
// Main exported function
// -----------------------------------------------------------------------

/**
 * Determine tax residency for all persons in the profile across all
 * relevant jurisdictions.
 *
 * Pure function: reads profile + jurisdiction data and returns residency
 * determinations with an audit trail.
 */
export function determineResidency(
  profile: UserProfile,
  jurisdictions: Jurisdiction[],
): {
  determinations: ResidencyDetermination[];
  auditEntry: AuditEntry;
} {
  const determinations: ResidencyDetermination[] = [];

  // Collect the jurisdictions we support
  const supportedCodes = new Set(jurisdictions.map((j) => j.code));

  // Build the list of persons to evaluate:
  // 1) The primary profile holder
  // 2) Each family member (they may have separate tax residencies)
  const persons: PersonInfo[] = [
    {
      id: profile.id,
      name: profile.name,
      citizenships: profile.citizenships,
      daysPresent: 0, // filled per-jurisdiction below
      isDomiciled: false,
      yearsResident: 0,
      status: '',
    },
    ...profile.family.map((m) => ({
      id: m.id,
      name: m.name,
      citizenships: m.citizenships,
      daysPresent: m.residency?.daysPresent ?? 0,
      isDomiciled: m.residency?.isDomiciled ?? false,
      yearsResident: m.residency?.yearsResident ?? 0,
      status: m.residency?.status ?? '',
    })),
  ];

  for (const code of supportedCodes) {
    const determiner = DETERMINERS[code];
    if (!determiner) continue;

    for (const person of persons) {
      // Find the matching residency record for this jurisdiction
      let residencyRecord: { daysPresent: number; isDomiciled: boolean; yearsResident: number; status: string } | null = null;

      if (person.id === profile.id) {
        // Primary person: look in profile.residencies
        const match = profile.residencies.find((r) => r.country === code);
        if (match) {
          residencyRecord = {
            daysPresent: match.daysPresent,
            isDomiciled: match.isDomiciled,
            yearsResident: match.yearsResident,
            status: match.status,
          };
        }
      } else {
        // Family member: their single residency
        const member = profile.family.find((m) => m.id === person.id);
        if (member?.residency && member.residency.country === code) {
          residencyRecord = {
            daysPresent: member.residency.daysPresent,
            isDomiciled: member.residency.isDomiciled,
            yearsResident: member.residency.yearsResident,
            status: member.residency.status,
          };
        }
      }

      // Even without a residency record, citizenship-based rules (US) may apply
      const results = determiner(person, residencyRecord);
      determinations.push(...results);
    }
  }

  const auditEntry: AuditEntry = {
    step: '01-residency',
    timestamp: new Date().toISOString(),
    determination: `Determined residency status for ${persons.length} person(s) across ${supportedCodes.size} jurisdiction(s). Found ${determinations.length} determination(s).`,
    inputs: {
      personCount: persons.length,
      jurisdictions: [...supportedCodes],
    },
    outputs: {
      determinationCount: determinations.length,
      summaries: determinations.map((d) => ({
        person: d.personName,
        jurisdiction: d.jurisdiction,
        category: d.residencyCategory,
        taxScope: d.taxScope,
      })),
    },
    citations: determinations.flatMap((d) => d.citations),
    engineVersion: ENGINE_VERSION,
  };

  return { determinations, auditEntry };
}
