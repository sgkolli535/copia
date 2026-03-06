import { describe, it, expect } from 'vitest';
import { computeEstatePlan } from '@copia/rule-engine';
import { validateProfile } from '@copia/rule-engine/validators/profile-validator';
import type { UserProfile } from '@copia/types';

// ---------------------------------------------------------------------------
// Helper: build a minimal valid profile with overrides
// ---------------------------------------------------------------------------
function makeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 'edge-case-test',
    name: 'Test Person',
    age: 40,
    citizenships: ['US'],
    residencies: [
      {
        country: 'US',
        daysPresent: 365,
        isDomiciled: true,
        yearsResident: 20,
        status: 'citizen',
      },
    ],
    assets: [
      {
        id: 'asset-1',
        name: 'Test Asset',
        assetClass: 'shares',
        spikeLocation: 'US',
        value: 100_000,
        currency: 'USD',
        costBasis: 50_000,
        ownershipType: 'sole',
        ownershipFraction: 1.0,
        dateAcquired: '2020-01-01',
        notes: '',
      },
    ],
    family: [],
    reportingCurrency: 'USD',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Zero-value asset
// ---------------------------------------------------------------------------
describe('edge case: zero-value asset', () => {
  it('produces no tax liability for a zero-value asset', async () => {
    // Note: validateProfile rejects value <= 0, so this tests computeEstatePlan
    // directly with a minimal positive value instead, or tests the validator.
    const profile = makeProfile({
      assets: [
        {
          id: 'asset-zero',
          name: 'Worthless Widget',
          assetClass: 'personal_property',
          spikeLocation: 'US',
          value: 1, // near-zero
          currency: 'USD',
          costBasis: 0,
          ownershipType: 'sole',
          ownershipFraction: 1.0,
          dateAcquired: '2020-01-01',
          notes: '',
        },
      ],
    });

    const plan = await computeEstatePlan(profile);

    // Estate of $1 is well below $12.92M exemption, so $0 tax
    const estateLiabilities = plan.liabilities.filter((l) => l.taxType === 'estate');
    for (const liability of estateLiabilities) {
      expect(liability.netAmount).toBe(0);
    }
  }, 30_000);
});

// ---------------------------------------------------------------------------
// Single-jurisdiction profile (US only)
// ---------------------------------------------------------------------------
describe('edge case: single-jurisdiction US-only profile', () => {
  it('produces no conflicts when only one jurisdiction is involved', async () => {
    const profile = makeProfile();

    const plan = await computeEstatePlan(profile);

    // With only US citizenship, US residency, and US-situs assets,
    // there should be no cross-border conflicts
    expect(plan.conflicts.length).toBe(0);
  }, 30_000);

  it('still produces a valid plan with liabilities and filing obligations', async () => {
    const profile = makeProfile();

    const plan = await computeEstatePlan(profile);

    expect(plan.liabilities.length).toBeGreaterThan(0);
    expect(plan.filingObligations.length).toBeGreaterThan(0);
    expect(plan.auditTrail.length).toBeGreaterThan(0);
  }, 30_000);
});

// ---------------------------------------------------------------------------
// India-only profile (no estate tax)
// ---------------------------------------------------------------------------
describe('edge case: India-only profile', () => {
  it('produces no estate tax liability since India abolished estate duty', async () => {
    const profile = makeProfile({
      id: 'edge-india-only',
      citizenships: ['IN'],
      residencies: [
        {
          country: 'IN',
          daysPresent: 365,
          isDomiciled: true,
          yearsResident: 30,
          status: 'citizen',
        },
      ],
      assets: [
        {
          id: 'asset-mumbai',
          name: 'Mumbai Flat',
          assetClass: 'immovable_property',
          spikeLocation: 'IN',
          value: 10_000_000,
          currency: 'INR',
          costBasis: 3_000_000,
          ownershipType: 'sole',
          ownershipFraction: 1.0,
          dateAcquired: '2010-01-01',
          notes: '',
        },
      ],
      reportingCurrency: 'INR',
    });

    const plan = await computeEstatePlan(profile);

    // No estate tax liability (India has no estate tax)
    const estateLiabilities = plan.liabilities.filter((l) => l.taxType === 'estate');
    expect(estateLiabilities.length).toBe(0);

    // But stamp duty should apply for immovable property in India
    const stampDutyLiabilities = plan.liabilities.filter((l) => l.taxType === 'stamp_duty');
    expect(stampDutyLiabilities.length).toBeGreaterThan(0);

    // Stamp duty rate may vary (6% or 7% depending on pipeline implementation)
    const stampDuty = stampDutyLiabilities[0]!;
    expect(stampDuty.grossAmount).toBeGreaterThan(500_000);
    expect(stampDuty.grossAmount).toBeLessThan(800_000);
    expect(stampDuty.currency).toBe('INR');
  }, 30_000);
});

// ---------------------------------------------------------------------------
// Asset exactly at UK NRB threshold
// ---------------------------------------------------------------------------
describe('edge case: asset exactly at UK NRB threshold', () => {
  it('produces GBP 0 UK IHT when estate equals GBP 325K NRB', async () => {
    const profile = makeProfile({
      id: 'edge-uk-at-nrb',
      citizenships: ['GB'],
      residencies: [
        {
          country: 'GB',
          daysPresent: 365,
          isDomiciled: true,
          yearsResident: 40,
          status: 'citizen',
        },
      ],
      assets: [
        {
          id: 'asset-uk-exact-nrb',
          name: 'UK Savings',
          assetClass: 'bank_deposits',
          spikeLocation: 'GB',
          value: 325_000,
          currency: 'GBP',
          costBasis: 325_000,
          ownershipType: 'sole',
          ownershipFraction: 1.0,
          dateAcquired: '2015-01-01',
          notes: '',
        },
      ],
      family: [],
      reportingCurrency: 'GBP',
    });

    const plan = await computeEstatePlan(profile);

    const ukIHT = plan.liabilities.find(
      (l) => l.jurisdiction === 'GB' && l.taxType === 'estate',
    );

    // Estate of exactly GBP 325K should be within the nil-rate band
    // The liability entry may still exist (with tax = 0) or may not exist
    // depending on how the engine handles zero-tax situations.
    if (ukIHT) {
      expect(ukIHT.netAmount).toBe(0);
    }
  }, 30_000);
});

// ---------------------------------------------------------------------------
// Profile validation: negative ownership fraction
// ---------------------------------------------------------------------------
describe('edge case: negative ownership fraction (profile validator)', () => {
  it('rejects a profile with a negative ownership fraction', () => {
    const profile = makeProfile({
      assets: [
        {
          id: 'asset-neg-fraction',
          name: 'Bad Asset',
          assetClass: 'shares',
          spikeLocation: 'US',
          value: 100_000,
          currency: 'USD',
          costBasis: 50_000,
          ownershipType: 'sole',
          ownershipFraction: -0.5,
          dateAcquired: '2020-01-01',
          notes: '',
        },
      ],
    });

    const result = validateProfile(profile);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);

    const fractionError = result.errors.find((e) =>
      e.field.includes('ownershipFraction'),
    );
    expect(fractionError).toBeDefined();
    expect(fractionError!.message).toMatch(/ownershipFraction/);
  });

  it('rejects a profile with zero ownership fraction', () => {
    const profile = makeProfile({
      assets: [
        {
          id: 'asset-zero-fraction',
          name: 'Zero Fraction Asset',
          assetClass: 'shares',
          spikeLocation: 'US',
          value: 100_000,
          currency: 'USD',
          costBasis: 50_000,
          ownershipType: 'sole',
          ownershipFraction: 0,
          dateAcquired: '2020-01-01',
          notes: '',
        },
      ],
    });

    const result = validateProfile(profile);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field.includes('ownershipFraction'))).toBe(true);
  });

  it('rejects a profile with ownership fraction > 1', () => {
    const profile = makeProfile({
      assets: [
        {
          id: 'asset-over-fraction',
          name: 'Over Fraction Asset',
          assetClass: 'shares',
          spikeLocation: 'US',
          value: 100_000,
          currency: 'USD',
          costBasis: 50_000,
          ownershipType: 'sole',
          ownershipFraction: 1.5,
          dateAcquired: '2020-01-01',
          notes: '',
        },
      ],
    });

    const result = validateProfile(profile);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field.includes('ownershipFraction'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Profile validation: missing required fields
// ---------------------------------------------------------------------------
describe('edge case: profile validation for missing fields', () => {
  it('rejects a profile with no citizenships', () => {
    const profile = makeProfile({ citizenships: [] });
    const result = validateProfile(profile);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'citizenships')).toBe(true);
  });

  it('rejects a profile with no residencies', () => {
    const profile = makeProfile({ residencies: [] });
    const result = validateProfile(profile);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'residencies')).toBe(true);
  });

  it('rejects a profile with no assets', () => {
    const profile = makeProfile({ assets: [] });
    const result = validateProfile(profile);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'assets')).toBe(true);
  });

  it('rejects a profile with an empty name', () => {
    const profile = makeProfile({ name: '' });
    const result = validateProfile(profile);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'name')).toBe(true);
  });

  it('rejects an asset with a non-positive value', () => {
    const profile = makeProfile({
      assets: [
        {
          id: 'asset-negative',
          name: 'Negative Asset',
          assetClass: 'shares',
          spikeLocation: 'US',
          value: -100,
          currency: 'USD',
          costBasis: 0,
          ownershipType: 'sole',
          ownershipFraction: 1.0,
          dateAcquired: '2020-01-01',
          notes: '',
        },
      ],
    });

    const result = validateProfile(profile);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field.includes('value'))).toBe(true);
  });

  it('accepts a valid profile without errors', () => {
    const profile = makeProfile();
    const result = validateProfile(profile);

    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });
});
