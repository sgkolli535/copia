import { describe, it, expect } from 'vitest';
import { checkCitations, checkConfidence, sanityCheck } from '@copia/ai-layer';
import type { PlanResult, Liability, AuditEntry } from '@copia/types';

// -- Helpers --

function makeLiability(overrides: Partial<Liability> = {}): Liability {
  return {
    id: 'test-liability-1',
    jurisdiction: 'GB',
    taxType: 'inheritance',
    grossAmount: 100_000,
    reliefAmount: 0,
    netAmount: 100_000,
    currency: 'GBP',
    effectiveRate: 0.4,
    applicableAssets: ['asset-1'],
    confidence: 'statutory',
    citations: [
      {
        id: 'cit-1',
        sourceType: 'statute',
        title: 'IHTA 1984',
        reference: 'IHTA 1984 s.1',
        url: null,
        confidence: 'statutory',
        asOfDate: '2024-01-01',
        jurisdiction: 'GB',
      },
    ],
    breakdown: [
      {
        description: 'Taxable estate',
        amount: 100_000,
        currency: 'GBP',
        formula: 'estate - exemption',
      },
    ],
    ...overrides,
  };
}

function makePlan(overrides: Partial<PlanResult> = {}): PlanResult {
  return {
    id: 'test-plan-1',
    profileId: 'test-profile',
    liabilities: [makeLiability()],
    totalExposure: 100_000,
    reportingCurrency: 'GBP',
    conflicts: [],
    treatyApplications: [],
    filingObligations: [],
    auditTrail: [
      {
        step: '07-consolidate',
        timestamp: new Date().toISOString(),
        determination: 'Test consolidation',
        inputs: {},
        outputs: {},
        citations: [],
        engineVersion: '1.0.0',
      },
    ],
    computedAt: new Date().toISOString(),
    engineVersion: '1.0.0',
    promptVersion: '1.0.0',
    exchangeRates: [],
    warnings: [],
    ...overrides,
  };
}

// -- Tests --

describe('checkCitations', () => {
  it('passes when narration numbers match plan data', () => {
    const plan = makePlan();
    const narration = 'The UK inheritance tax liability is GBP 100,000 at a rate of 40%.';

    const result = checkCitations(narration, plan);
    expect(result.passed).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('fails when narration contains fabricated numbers', () => {
    const plan = makePlan();
    const narration = 'The total estate value is $5,000,000 with a liability of $750,000.';

    const result = checkCitations(narration, plan);
    expect(result.passed).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
  });
});

describe('checkConfidence', () => {
  it('passes when statutory items use definitive language', () => {
    const plan = makePlan();
    const narration = 'The GB inheritance tax liability is GBP 100,000.';

    const result = checkConfidence(narration, plan);
    expect(result.passed).toBe(true);
  });

  it('flags statutory items using advisory language', () => {
    const plan = makePlan();
    const narration =
      'You may want to consider the GB inheritance tax liability of GBP 100,000.';

    const result = checkConfidence(narration, plan);
    expect(result.passed).toBe(false);
    expect(result.issues.some((i) => i.includes('advisory language'))).toBe(true);
  });

  it('flags advisory items using definitive language', () => {
    const plan = makePlan({
      conflicts: [
        {
          id: 'conflict-1',
          jurisdictions: ['US', 'GB'],
          description: 'potential double taxation on shares',
          affectedAssets: ['shares'],
          exposureAmount: 50_000,
          currency: 'GBP',
          resolution: 'Seek professional advice',
          treaty: 'GB-US',
          confidence: 'advisory',
          citations: [],
        },
      ],
    });
    const narration =
      'Potential double taxation on shares is required and must be resolved.';

    const result = checkConfidence(narration, plan);
    expect(result.passed).toBe(false);
    expect(result.issues.some((i) => i.includes('definitive language'))).toBe(true);
  });
});

describe('sanityCheck', () => {
  it('passes on a valid plan', () => {
    const plan = makePlan();
    const result = sanityCheck(plan);
    expect(result.passed).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('flags netAmount > grossAmount', () => {
    const plan = makePlan({
      liabilities: [makeLiability({ netAmount: 200_000, grossAmount: 100_000 })],
      totalExposure: 200_000,
    });
    const result = sanityCheck(plan);
    expect(result.passed).toBe(false);
    expect(result.issues.some((i) => i.includes('net amount') && i.includes('exceeding gross'))).toBe(true);
  });

  it('flags negative net amounts', () => {
    const plan = makePlan({
      liabilities: [makeLiability({ netAmount: -5_000 })],
      totalExposure: 100_000,
    });
    const result = sanityCheck(plan);
    expect(result.passed).toBe(false);
    expect(result.issues.some((i) => i.includes('negative net amount'))).toBe(true);
  });

  it('flags liabilities without citations', () => {
    const plan = makePlan({
      liabilities: [makeLiability({ citations: [] })],
    });
    const result = sanityCheck(plan);
    expect(result.passed).toBe(false);
    expect(result.issues.some((i) => i.includes('no supporting citations'))).toBe(true);
  });

  it('flags negative relief amount', () => {
    const plan = makePlan({
      liabilities: [makeLiability({ reliefAmount: -1_000 })],
    });
    const result = sanityCheck(plan);
    expect(result.passed).toBe(false);
    expect(result.issues.some((i) => i.includes('negative relief amount'))).toBe(true);
  });
});
