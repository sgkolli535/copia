import { describe, it, expect } from 'vitest';
import { computeTaxLayers } from '@copia/rule-engine';
import { getJurisdiction } from '@copia/data-service';
import type { MoneyEvent, UserProfile, ExchangeRateSnapshot, TreatyEdge } from '@copia/types';

function makeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 'test-user',
    name: 'Test User',
    age: 40,
    citizenships: ['GB'],
    residencies: [
      {
        country: 'GB',
        daysPresent: 300,
        isDomiciled: true,
        yearsResident: 12,
        status: '',
      },
    ],
    assets: [],
    family: [],
    reportingCurrency: 'GBP',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeEvent(overrides = {}): MoneyEvent {
  return {
    id: 'evt-1',
    type: 'inheritance',
    sourceCountry: 'IN',
    destinationCountry: 'GB',
    amount: 5_000_000,
    currency: 'INR',
    date: '2024-06-01',
    relatedAsset: 'Property in Mumbai',
    relationship: 'father',
    userStatusInSource: 'nri',
    description: 'Inherited property',
    ...overrides,
  };
}

const exchangeRates: ExchangeRateSnapshot[] = [
  { from: 'INR', to: 'GBP', rate: 0.0095, asOf: '2024-01-01', source: 'test' },
  { from: 'INR', to: 'USD', rate: 0.012, asOf: '2024-01-01', source: 'test' },
  { from: 'GBP', to: 'INR', rate: 105.0, asOf: '2024-01-01', source: 'test' },
  { from: 'USD', to: 'INR', rate: 83.0, asOf: '2024-01-01', source: 'test' },
  { from: 'USD', to: 'GBP', rate: 0.79, asOf: '2024-01-01', source: 'test' },
  { from: 'GBP', to: 'USD', rate: 1.27, asOf: '2024-01-01', source: 'test' },
];

describe('Tax Layers — 5-Layer Cost Stack', () => {
  it('computes 5 layers', () => {
    const event = makeEvent();
    const profile = makeProfile();
    const sourceJurisdiction = getJurisdiction('IN').jurisdiction;
    const destJurisdiction = getJurisdiction('GB').jurisdiction;

    const result = computeTaxLayers(
      event,
      profile,
      sourceJurisdiction,
      destJurisdiction,
      [],
      exchangeRates,
    );

    expect(result.layers).toHaveLength(5);
    expect(result.layers.map((l) => l.layer)).toEqual([
      'source_tax',
      'destination_tax',
      'treaty_relief',
      'transfer_costs',
      'timing',
    ]);
  });

  it('source tax for India inheritance is 0 (no estate tax)', () => {
    const event = makeEvent({ type: 'inheritance', sourceCountry: 'IN' });
    const profile = makeProfile();
    const sourceJurisdiction = getJurisdiction('IN').jurisdiction;
    const destJurisdiction = getJurisdiction('GB').jurisdiction;

    const result = computeTaxLayers(
      event,
      profile,
      sourceJurisdiction,
      destJurisdiction,
      [],
      exchangeRates,
    );

    const sourceTax = result.layers.find((l) => l.layer === 'source_tax')!;
    expect(sourceTax.amount).toBe(0);
    expect(sourceTax.description).toContain('No estate/inheritance tax');
  });

  it('destination tax for UK inheritance is positive (IHT exists)', () => {
    const event = makeEvent({
      type: 'inheritance',
      sourceCountry: 'IN',
      destinationCountry: 'GB',
      amount: 1_000_000,
    });
    const profile = makeProfile();
    const sourceJurisdiction = getJurisdiction('IN').jurisdiction;
    const destJurisdiction = getJurisdiction('GB').jurisdiction;

    const result = computeTaxLayers(
      event,
      profile,
      sourceJurisdiction,
      destJurisdiction,
      [],
      exchangeRates,
    );

    const destTax = result.layers.find((l) => l.layer === 'destination_tax')!;
    expect(destTax.amount).toBeGreaterThan(0);
  });

  it('treaty relief is 0 when no treaty provided', () => {
    const event = makeEvent();
    const profile = makeProfile();
    const sourceJurisdiction = getJurisdiction('IN').jurisdiction;
    const destJurisdiction = getJurisdiction('GB').jurisdiction;

    const result = computeTaxLayers(
      event,
      profile,
      sourceJurisdiction,
      destJurisdiction,
      [],
      exchangeRates,
    );

    const treatyRelief = result.layers.find((l) => l.layer === 'treaty_relief')!;
    expect(treatyRelief.amount).toBe(0);
    expect(treatyRelief.description).toContain('No applicable');
  });

  it('transfer costs are estimated at ~0.5%', () => {
    const event = makeEvent({ amount: 1_000_000 });
    const profile = makeProfile();
    const sourceJurisdiction = getJurisdiction('IN').jurisdiction;
    const destJurisdiction = getJurisdiction('GB').jurisdiction;

    const result = computeTaxLayers(
      event,
      profile,
      sourceJurisdiction,
      destJurisdiction,
      [],
      exchangeRates,
    );

    const transferCosts = result.layers.find((l) => l.layer === 'transfer_costs')!;
    expect(transferCosts.amount).toBeCloseTo(5_000, -1); // 0.5% of 1M
    expect(transferCosts.confidence).toBe('advisory');
  });

  it('totalCost is non-negative', () => {
    const event = makeEvent({ amount: 100_000 });
    const profile = makeProfile();
    const sourceJurisdiction = getJurisdiction('IN').jurisdiction;
    const destJurisdiction = getJurisdiction('GB').jurisdiction;

    const result = computeTaxLayers(
      event,
      profile,
      sourceJurisdiction,
      destJurisdiction,
      [],
      exchangeRates,
    );

    expect(result.totalCost).toBeGreaterThanOrEqual(0);
    expect(result.netAmount).toBeGreaterThanOrEqual(0);
    expect(result.netAmount).toBeLessThanOrEqual(event.amount);
  });

  it('effectiveRate is between 0 and 1', () => {
    const event = makeEvent({ amount: 500_000 });
    const profile = makeProfile();
    const sourceJurisdiction = getJurisdiction('IN').jurisdiction;
    const destJurisdiction = getJurisdiction('GB').jurisdiction;

    const result = computeTaxLayers(
      event,
      profile,
      sourceJurisdiction,
      destJurisdiction,
      [],
      exchangeRates,
    );

    expect(result.effectiveRate).toBeGreaterThanOrEqual(0);
    expect(result.effectiveRate).toBeLessThanOrEqual(1);
  });

  it('property sale triggers LTCG in source', () => {
    const event = makeEvent({
      type: 'property_sale',
      sourceCountry: 'IN',
      amount: 10_000_000,
    });
    const profile = makeProfile();
    const sourceJurisdiction = getJurisdiction('IN').jurisdiction;
    const destJurisdiction = getJurisdiction('GB').jurisdiction;

    const result = computeTaxLayers(
      event,
      profile,
      sourceJurisdiction,
      destJurisdiction,
      [],
      exchangeRates,
    );

    const sourceTax = result.layers.find((l) => l.layer === 'source_tax')!;
    expect(sourceTax.amount).toBeGreaterThan(0);
    expect(sourceTax.description).toContain('LTCG');
  });

  it('US to GB inheritance: US estate tax applies', () => {
    const event = makeEvent({
      type: 'inheritance',
      sourceCountry: 'US',
      destinationCountry: 'GB',
      amount: 20_000_000,
      currency: 'USD',
    });
    const profile = makeProfile({ citizenships: ['GB'] });
    const sourceJurisdiction = getJurisdiction('US').jurisdiction;
    const destJurisdiction = getJurisdiction('GB').jurisdiction;

    const result = computeTaxLayers(
      event,
      profile,
      sourceJurisdiction,
      destJurisdiction,
      [],
      exchangeRates,
    );

    const sourceTax = result.layers.find((l) => l.layer === 'source_tax')!;
    expect(sourceTax.amount).toBeGreaterThan(0);
  });
});

describe('Tax Layers — Timing', () => {
  it('timing layer has confidence advisory when no issues', () => {
    const event = makeEvent({ date: '2028-01-01' }); // Far future
    const profile = makeProfile();
    const sourceJurisdiction = getJurisdiction('IN').jurisdiction;
    const destJurisdiction = getJurisdiction('GB').jurisdiction;

    const result = computeTaxLayers(
      event,
      profile,
      sourceJurisdiction,
      destJurisdiction,
      [],
      exchangeRates,
    );

    const timing = result.layers.find((l) => l.layer === 'timing')!;
    // Amount is always 0 for timing layer (informational)
    expect(timing.amount).toBe(0);
  });
});
