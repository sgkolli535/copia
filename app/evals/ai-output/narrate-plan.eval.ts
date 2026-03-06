import { describe, it, expect } from 'vitest';
import { computeEstatePlan } from '@copia/rule-engine';
import { narratePlan, checkCitations, checkConfidence } from '@copia/ai-layer';
import type { UserProfile } from '@copia/types';

const HAS_API_KEY = !!(
  process.env.ANTHROPIC_API_KEY ||
  process.env.OPENAI_API_KEY ||
  process.env.GOOGLE_GENERATIVE_AI_API_KEY
);

const MARCUS_PROFILE: UserProfile = {
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
      status: 'ilr',
    },
  ],
  assets: [
    {
      id: 'asset-london-flat',
      name: 'London Flat',
      assetClass: 'immovable_property',
      spikeLocation: 'GB',
      value: 1_100_000,
      currency: 'GBP',
      costBasis: 650_000,
      ownershipType: 'sole',
      ownershipFraction: 1.0,
      dateAcquired: '2014-03-15',
      notes: '',
    },
    {
      id: 'asset-us-brokerage',
      name: 'US Brokerage',
      assetClass: 'shares',
      spikeLocation: 'US',
      value: 2_500_000,
      currency: 'USD',
      costBasis: 1_200_000,
      ownershipType: 'sole',
      ownershipFraction: 1.0,
      dateAcquired: '2008-06-01',
      notes: '',
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
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

describe.skipIf(!HAS_API_KEY)('narratePlan AI eval', () => {
  let plan: Awaited<ReturnType<typeof computeEstatePlan>>;
  let narration: string;

  it('computes plan and narrates successfully', async () => {
    plan = await computeEstatePlan(MARCUS_PROFILE);
    expect(plan).toBeDefined();

    narration = await narratePlan(plan);
    expect(narration).toBeTruthy();
    expect(narration.length).toBeGreaterThan(100);
  }, 120_000);

  it('narration passes citation check', () => {
    expect(plan).toBeDefined();
    expect(narration).toBeTruthy();

    const result = checkCitations(narration, plan);
    expect(result.passed).toBe(true);
  });

  it('narration passes confidence check', () => {
    expect(plan).toBeDefined();
    expect(narration).toBeTruthy();

    const result = checkConfidence(narration, plan);
    expect(result.passed).toBe(true);
  });

  it('narration mentions key jurisdictions', () => {
    expect(narration).toBeTruthy();

    const lower = narration.toLowerCase();
    expect(lower).toMatch(/united states|us|u\.s\./);
    expect(lower).toMatch(/united kingdom|uk|u\.k\.|britain/);
  });

  it('narration includes a disclaimer', () => {
    expect(narration).toBeTruthy();

    const lower = narration.toLowerCase();
    expect(lower).toMatch(/informational|not constitute|professional|consult/);
  });
});
