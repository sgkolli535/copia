import type {
  UserProfile,
  CountryCode,
  TreatyEdge,
} from '@copia/types';
import type { AuditEntry } from '@copia/types';
import { getTreaty } from '@copia/data-service';
import type { ResidencyDetermination } from './01-residency.js';

const ENGINE_VERSION = '1.0.0';

// -----------------------------------------------------------------------
// Public interface
// -----------------------------------------------------------------------

export interface ApplicableTreaty {
  treaty: TreatyEdge;
  relevance: string;
  affectedPersons: string[];
}

// -----------------------------------------------------------------------
// Main exported function
// -----------------------------------------------------------------------

/**
 * Identify all applicable treaties given the residency determinations.
 *
 * A treaty is "applicable" when at least one person has tax connections
 * (residency or citizenship-based taxation) in both jurisdictions of the
 * treaty pair.  We also surface treaties for jurisdiction pairs where
 * assets are sited, even if no person is resident, because source-country
 * taxing rights still matter.
 */
export function identifyTreaties(
  determinations: ResidencyDetermination[],
  profile: UserProfile,
): { treaties: ApplicableTreaty[]; auditEntry: AuditEntry } {
  const applicableTreaties: ApplicableTreaty[] = [];
  const seenPairs = new Set<string>();

  // 1. Build a map: personId -> set of jurisdictions where they have a
  //    tax connection (either resident or taxed on domestic-situs assets).
  const personJurisdictions = new Map<string, Set<CountryCode>>();

  for (const det of determinations) {
    let jurisdictionSet = personJurisdictions.get(det.personId);
    if (!jurisdictionSet) {
      jurisdictionSet = new Set();
      personJurisdictions.set(det.personId, jurisdictionSet);
    }
    jurisdictionSet.add(det.jurisdiction);
  }

  // 2. Also add jurisdictions where the person owns assets (source taxation)
  const allPersonIds = new Set([
    profile.id,
    ...profile.family.map((m) => m.id),
  ]);

  for (const personId of allPersonIds) {
    let jurisdictionSet = personJurisdictions.get(personId);
    if (!jurisdictionSet) {
      jurisdictionSet = new Set();
      personJurisdictions.set(personId, jurisdictionSet);
    }
    // The primary profile holder owns all assets
    if (personId === profile.id) {
      for (const asset of profile.assets) {
        jurisdictionSet.add(asset.spikeLocation);
      }
    }
  }

  // 3. For each person, check every pair of their jurisdictions for a treaty
  for (const [personId, jurisdictions] of personJurisdictions.entries()) {
    const codes = [...jurisdictions];
    for (let i = 0; i < codes.length; i++) {
      for (let j = i + 1; j < codes.length; j++) {
        const c1 = codes[i];
        const c2 = codes[j];
        const pairKey = [c1, c2].sort().join('-');

        const result = getTreaty(c1, c2);
        if (!result) continue;

        if (seenPairs.has(pairKey)) {
          // Treaty already added -- just add this person to the affected list
          const existing = applicableTreaties.find(
            (at) => at.treaty.pair === result.treaty.pair,
          );
          if (existing && !existing.affectedPersons.includes(personId)) {
            existing.affectedPersons.push(personId);
          }
          continue;
        }

        seenPairs.add(pairKey);

        // Determine relevance description
        const personDeterminations = determinations.filter(
          (d) => d.personId === personId,
        );
        const c1Det = personDeterminations.find((d) => d.jurisdiction === c1);
        const c2Det = personDeterminations.find((d) => d.jurisdiction === c2);

        let relevance: string;
        if (c1Det?.isResident && c2Det?.isResident) {
          relevance = `Dual residency: person is tax-resident in both ${c1} and ${c2}. Treaty tie-breaker and relief provisions are applicable.`;
        } else if (c1Det?.isResident || c2Det?.isResident) {
          const residentIn = c1Det?.isResident ? c1 : c2;
          const otherCountry = residentIn === c1 ? c2 : c1;
          relevance = `Resident in ${residentIn} with assets or tax connections in ${otherCountry}. Treaty may allocate taxing rights and provide relief.`;
        } else {
          relevance = `Assets situated in both ${c1} and ${c2}; treaty may affect source-country taxing rights.`;
        }

        applicableTreaties.push({
          treaty: result.treaty,
          relevance,
          affectedPersons: [personId],
        });
      }
    }
  }

  const auditEntry: AuditEntry = {
    step: '02-treaties',
    timestamp: new Date().toISOString(),
    determination: `Identified ${applicableTreaties.length} applicable treaty/treaty-like arrangement(s) across ${seenPairs.size} jurisdiction pair(s).`,
    inputs: {
      determinationCount: determinations.length,
      jurisdictionPairsChecked: seenPairs.size,
    },
    outputs: {
      treaties: applicableTreaties.map((at) => ({
        pair: at.treaty.pair,
        name: at.treaty.treatyName,
        reliefMethod: at.treaty.reliefMethod,
        affectedPersons: at.affectedPersons,
      })),
    },
    citations: applicableTreaties.flatMap((at) => [
      {
        id: `cit-treaty-${at.treaty.pair}`,
        sourceType: 'treaty' as const,
        title: at.treaty.treatyName,
        reference: at.treaty.pair,
        url: null,
        confidence: 'statutory' as const,
        asOfDate: at.treaty.lastUpdated,
        jurisdiction: at.treaty.pair,
      },
    ]),
    engineVersion: ENGINE_VERSION,
  };

  return { treaties: applicableTreaties, auditEntry };
}
