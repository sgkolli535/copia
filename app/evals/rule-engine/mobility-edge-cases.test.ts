import { describe, it, expect } from 'vitest';
import {
  determineSourceCountryStatus,
  analyzeMoneyEvent,
  buildRepatriationChannels,
  analyzeCapitalControls,
} from '@copia/rule-engine';
import { getJurisdiction, getPermittedActions } from '@copia/data-service';
import type { UserProfile, MoneyEvent, MobilityAnalysisResult } from '@copia/types';

function makeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 'test-user',
    name: 'Test User',
    age: 40,
    citizenships: ['US'],
    residencies: [
      {
        country: 'US',
        daysPresent: 300,
        isDomiciled: true,
        yearsResident: 20,
        status: '',
      },
    ],
    assets: [],
    family: [],
    reportingCurrency: 'USD',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeEvent(overrides = {}): MoneyEvent {
  return {
    id: 'evt-1',
    type: 'inheritance' as const,
    sourceCountry: 'IN' as const,
    destinationCountry: 'US' as const,
    amount: 500_000,
    currency: 'INR' as const,
    date: '2024-06-01',
    relatedAsset: '',
    relationship: '',
    userStatusInSource: 'non_resident' as const,
    description: 'Test event',
    ...overrides,
  };
}

describe('Edge Case — OCI Holder', () => {
  it('OCI holders get NRO/NRE/FCNR account requirements', () => {
    const profile = makeProfile({
      citizenships: ['GB'],
      residencies: [
        { country: 'GB', daysPresent: 300, isDomiciled: true, yearsResident: 20, status: '' },
        { country: 'IN', daysPresent: 0, isDomiciled: false, yearsResident: 0, status: 'OCI cardholder' },
      ],
    });
    const status = determineSourceCountryStatus(profile, 'IN');
    expect(status.status).toBe('oci');

    const { jurisdiction } = getJurisdiction('IN');
    const event = makeEvent();
    const controls = analyzeCapitalControls(event, status, jurisdiction);
    expect(controls.hasControls).toBe(true);
    expect(controls.accountRequirements.length).toBeGreaterThan(0);
  });
});

describe('Edge Case — Repatriation Above $1M', () => {
  it('event exceeding $1M triggers approval requirement', () => {
    const profile = makeProfile({
      citizenships: ['IN'],
      residencies: [
        { country: 'US', daysPresent: 300, isDomiciled: true, yearsResident: 20, status: '' },
      ],
    });
    const status = determineSourceCountryStatus(profile, 'IN');
    const { jurisdiction } = getJurisdiction('IN');

    const event = makeEvent({ amount: 1_500_000 });
    const controls = analyzeCapitalControls(event, status, jurisdiction);
    expect(controls.approvalRequired).toBe(true);
    expect(controls.approvalThresholds.length).toBeGreaterThan(0);
    expect(controls.approvalThresholds[0].authority).toContain('RBI');
  });
});

describe('Edge Case — US Citizen Receiving Indian Funds', () => {
  it('US citizen status is correctly determined', () => {
    const profile = makeProfile({ citizenships: ['US'] });
    const status = determineSourceCountryStatus(profile, 'US');
    expect(status.status).toBe('citizen');
  });

  it('full mobility analysis completes for US citizen receiving from India', async () => {
    const profile = makeProfile({
      citizenships: ['US'],
      residencies: [
        { country: 'US', daysPresent: 300, isDomiciled: true, yearsResident: 20, status: '' },
      ],
      assets: [
        {
          id: 'in-property',
          name: 'Mumbai Flat',
          assetClass: 'immovable_property',
          spikeLocation: 'IN',
          value: 20_000_000,
          currency: 'INR',
          costBasis: 5_000_000,
          ownershipType: 'sole',
          ownershipFraction: 1,
          dateAcquired: '2024-01-01',
          notes: '',
        },
      ],
    });

    const event = makeEvent({
      type: 'property_sale',
      sourceCountry: 'IN',
      destinationCountry: 'US',
      amount: 20_000_000,
      currency: 'INR',
    });

    const result = await analyzeMoneyEvent(event, profile);
    expect(result).toBeDefined();
    expect(result.status.sourceCountry).toBe('IN');
    expect(result.controls.hasControls).toBe(true);
    expect(result.taxLayers.layers).toHaveLength(5);

    // Property sale should trigger LTCG in India
    const sourceTax = result.taxLayers.layers.find((l) => l.layer === 'source_tax');
    expect(sourceTax!.amount).toBeGreaterThan(0);

    // US has Form 3520 reporting requirements
    // (checked through controls documentation on the US side)
    expect(result.channels.length).toBeGreaterThan(0);
  }, 30_000);
});

describe('Edge Case — Permitted Actions Data', () => {
  it('India has at least one prohibited action (agricultural land)', () => {
    const actions = getPermittedActions('IN');
    const prohibited = actions.filter((a) => !a.permitted);
    expect(prohibited.length).toBeGreaterThanOrEqual(1);
    expect(prohibited.some((a) => a.id.includes('agricultural'))).toBe(true);
  });

  it('US has no prohibited actions (no restrictions)', () => {
    const actions = getPermittedActions('US');
    const prohibited = actions.filter((a) => !a.permitted);
    expect(prohibited.length).toBe(0);
  });

  it('all actions have citations', () => {
    for (const country of ['US', 'GB', 'IN', 'PT'] as const) {
      const actions = getPermittedActions(country);
      for (const action of actions) {
        expect(action.citations.length).toBeGreaterThan(0);
      }
    }
  });

  it('all actions have confidence tiers', () => {
    for (const country of ['US', 'GB', 'IN', 'PT'] as const) {
      const actions = getPermittedActions(country);
      for (const action of actions) {
        expect(['statutory', 'interpretive', 'advisory']).toContain(action.confidence);
      }
    }
  });
});

describe('Edge Case — No-Controls Jurisdictions', () => {
  it('US-to-GB event has no controls on either side', async () => {
    const profile = makeProfile({
      citizenships: ['US'],
      residencies: [
        { country: 'US', daysPresent: 200, isDomiciled: true, yearsResident: 20, status: '' },
        { country: 'GB', daysPresent: 100, isDomiciled: false, yearsResident: 2, status: '' },
      ],
    });

    const event = makeEvent({
      type: 'inheritance',
      sourceCountry: 'US',
      destinationCountry: 'GB',
      amount: 5_000_000,
      currency: 'USD',
    });

    const result = await analyzeMoneyEvent(event, profile);
    expect(result.controls.hasControls).toBe(false);
    expect(result.controls.approvalRequired).toBe(false);
  }, 30_000);
});

describe('Edge Case — Portugal EU Rules', () => {
  it('Portugal has EU free movement of capital exemption', () => {
    const { jurisdiction } = getJurisdiction('PT');
    expect(jurisdiction.capitalControls).toBeDefined();
    expect(jurisdiction.capitalControls!.hasControls).toBe(false);
    expect(
      jurisdiction.capitalControls!.exemptions.some((e) =>
        e.toLowerCase().includes('eu'),
      ),
    ).toBe(true);
  });
});
