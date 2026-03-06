/**
 * Golden Persona: Marcus & Priya
 *
 * Marcus Chen: US citizen, 12yr UK resident, London flat (£1.1M), US brokerage ($2.5M)
 * Spouse Priya Sharma: Indian citizen, UK resident, non-domiciled
 */

import type { UserProfile } from '@copia/types';

export const MARCUS_AND_PRIYA: UserProfile = {
  id: 'golden-marcus',
  name: 'Marcus Chen',
  age: 52,
  citizenships: ['US'],
  residencies: [
    {
      country: 'GB',
      daysPresent: 250,
      isDomiciled: true,
      yearsResident: 12,
      status: 'indefinite_leave_to_remain',
    },
  ],
  assets: [
    {
      id: 'asset-london-flat',
      name: 'London Flat (Kensington)',
      assetClass: 'immovable_property',
      spikeLocation: 'GB',
      value: 1_100_000,
      currency: 'GBP',
      costBasis: 650_000,
      ownershipType: 'sole',
      ownershipFraction: 1.0,
      dateAcquired: '2014-03-15',
      notes: 'Primary residence in London. Purchased 2014.',
    },
    {
      id: 'asset-us-brokerage',
      name: 'US Brokerage Account (Schwab)',
      assetClass: 'shares',
      spikeLocation: 'US',
      value: 2_500_000,
      currency: 'USD',
      costBasis: 1_200_000,
      ownershipType: 'sole',
      ownershipFraction: 1.0,
      dateAcquired: '2008-06-01',
      notes: 'Diversified US equity portfolio. Accumulated over 15+ years.',
    },
  ],
  family: [
    {
      id: 'family-priya',
      name: 'Priya Sharma',
      relationship: 'spouse',
      citizenships: ['IN'],
      residency: {
        country: 'GB',
        daysPresent: 250,
        isDomiciled: false,
        yearsResident: 10,
        status: 'spouse_visa',
      },
      isBeneficiary: true,
      age: 48,
    },
  ],
  reportingCurrency: 'USD',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

/**
 * Expected baseline results for Marcus & Priya:
 *
 * US Estate Tax:
 *   - Total estate ~$3.9M (USD equivalent)
 *   - Below $12.92M exemption → $0 tentative tax
 *   - BUT Priya is non-US-citizen spouse → no unlimited marital deduction
 *   - QDOT required for marital deduction
 *   - For $15M test case: $15M - $12.92M = $2.08M taxable → ~$832K tax
 *
 * UK IHT:
 *   - Marcus is UK resident (12 years), approaching deemed domicile (15 years)
 *   - London flat: £1.1M - £325K NRB - £175K RNRB = £600K taxable
 *   - IHT: £600K × 40% = £240K (with RNRB)
 *   - Without RNRB (if no direct descendants): £1.1M - £325K = £775K × 40% = £310K
 *
 * Conflicts:
 *   - US-UK dual taxation on London flat (US worldwide + UK situs)
 *   - US-UK Estate Tax Treaty provides credit method relief
 *   - Priya's non-citizen status limits spousal transfer options
 */

// Run as script
if (typeof process !== 'undefined' && process.argv[1]?.endsWith('seed-golden-persona.ts')) {
  console.log(JSON.stringify(MARCUS_AND_PRIYA, null, 2));
}
