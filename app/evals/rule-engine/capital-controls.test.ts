import { describe, it, expect } from 'vitest';
import {
  determineSourceCountryStatus,
  analyzeCapitalControls,
} from '@copia/rule-engine';
import { getJurisdiction } from '@copia/data-service';
import type { UserProfile, Jurisdiction } from '@copia/types';

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
    assets: [
      {
        id: 'asset-1',
        name: 'Test Asset',
        assetClass: 'bank_deposits',
        spikeLocation: 'US',
        value: 100_000,
        currency: 'USD',
        costBasis: 100_000,
        ownershipType: 'sole',
        ownershipFraction: 1,
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

function makeMoneyEvent(overrides = {}) {
  return {
    id: 'evt-1',
    type: 'inheritance' as const,
    sourceCountry: 'IN' as const,
    destinationCountry: 'GB' as const,
    amount: 500_000,
    currency: 'INR' as const,
    date: '2024-06-01',
    relatedAsset: 'Property in Mumbai',
    relationship: 'father',
    userStatusInSource: 'nri' as const,
    description: 'Inherited property from father in India',
    ...overrides,
  };
}

describe('Capital Controls — Status Determination', () => {
  it('determines NRI status for Indian citizen abroad', () => {
    const profile = makeProfile({
      citizenships: ['IN'],
      residencies: [
        { country: 'GB', daysPresent: 300, isDomiciled: true, yearsResident: 10, status: '' },
        { country: 'IN', daysPresent: 30, isDomiciled: false, yearsResident: 0, status: '' },
      ],
    });
    const status = determineSourceCountryStatus(profile, 'IN');
    expect(status.status).toBe('nri');
    expect(status.confidence).toBe('statutory');
    expect(status.citations.length).toBeGreaterThan(0);
  });

  it('determines resident status for Indian citizen in India', () => {
    const profile = makeProfile({
      citizenships: ['IN'],
      residencies: [
        { country: 'IN', daysPresent: 250, isDomiciled: true, yearsResident: 30, status: '' },
      ],
    });
    const status = determineSourceCountryStatus(profile, 'IN');
    expect(status.status).toBe('resident');
  });

  it('determines OCI status when indicated', () => {
    const profile = makeProfile({
      citizenships: ['GB'],
      residencies: [
        { country: 'GB', daysPresent: 300, isDomiciled: true, yearsResident: 15, status: '' },
        { country: 'IN', daysPresent: 0, isDomiciled: false, yearsResident: 0, status: 'OCI cardholder' },
      ],
    });
    const status = determineSourceCountryStatus(profile, 'IN');
    expect(status.status).toBe('oci');
  });

  it('determines US citizen status', () => {
    const profile = makeProfile({ citizenships: ['US'] });
    const status = determineSourceCountryStatus(profile, 'US');
    expect(status.status).toBe('citizen');
    expect(status.description).toContain('worldwide');
  });

  it('determines UK deemed domiciled at 15 years', () => {
    const profile = makeProfile({
      citizenships: ['IN'],
      residencies: [
        { country: 'GB', daysPresent: 300, isDomiciled: false, yearsResident: 16, status: '' },
      ],
    });
    const status = determineSourceCountryStatus(profile, 'GB');
    expect(status.status).toBe('deemed_domiciled');
  });

  it('determines UK non-domiciled under 15 years', () => {
    const profile = makeProfile({
      citizenships: ['IN'],
      residencies: [
        { country: 'GB', daysPresent: 300, isDomiciled: false, yearsResident: 10, status: '' },
      ],
    });
    const status = determineSourceCountryStatus(profile, 'GB');
    expect(status.status).toBe('non_domiciled');
  });

  it('determines Portugal non-resident', () => {
    const profile = makeProfile({
      citizenships: ['US'],
      residencies: [
        { country: 'US', daysPresent: 300, isDomiciled: true, yearsResident: 20, status: '' },
      ],
    });
    const status = determineSourceCountryStatus(profile, 'PT');
    expect(status.status).toBe('non_resident');
  });
});

describe('Capital Controls — India NRI Rules', () => {
  it('India has capital controls', () => {
    const { jurisdiction } = getJurisdiction('IN');
    expect(jurisdiction.capitalControls).toBeDefined();
    expect(jurisdiction.capitalControls!.hasControls).toBe(true);
  });

  it('India NRO repatriation limit is $1M/year', () => {
    const { jurisdiction } = getJurisdiction('IN');
    const nroLimit = jurisdiction.capitalControls!.outboundLimits.find(
      (l) => l.name.includes('NRO'),
    );
    expect(nroLimit).toBeDefined();
    expect(nroLimit!.annualLimitUSD).toBe(1_000_000);
  });

  it('India LRS limit is $250K', () => {
    const { jurisdiction } = getJurisdiction('IN');
    const lrsLimit = jurisdiction.capitalControls!.outboundLimits.find(
      (l) => l.name.includes('LRS'),
    );
    expect(lrsLimit).toBeDefined();
    expect(lrsLimit!.annualLimitUSD).toBe(250_000);
  });

  it('India has NRO, NRE, FCNR account requirements', () => {
    const { jurisdiction } = getJurisdiction('IN');
    const accountTypes = jurisdiction.capitalControls!.accountRequirements.map(
      (a) => a.accountType,
    );
    expect(accountTypes).toContain('NRO');
    expect(accountTypes).toContain('NRE');
    expect(accountTypes).toContain('FCNR');
  });

  it('India requires RBI approval above $1M', () => {
    const { jurisdiction } = getJurisdiction('IN');
    const rbiApproval = jurisdiction.capitalControls!.approvalThresholds.find(
      (t) => t.authority.includes('RBI'),
    );
    expect(rbiApproval).toBeDefined();
    expect(rbiApproval!.thresholdUSD).toBe(1_000_000);
  });

  it('reports approval required for event above $1M', () => {
    const { jurisdiction } = getJurisdiction('IN');
    const profile = makeProfile({
      citizenships: ['IN'],
      residencies: [
        { country: 'GB', daysPresent: 300, isDomiciled: true, yearsResident: 10, status: '' },
      ],
    });
    const status = determineSourceCountryStatus(profile, 'IN');
    const event = makeMoneyEvent({ amount: 2_000_000 });
    const controls = analyzeCapitalControls(event, status, jurisdiction);
    expect(controls.approvalRequired).toBe(true);
  });

  it('reports no approval required for event under $1M', () => {
    const { jurisdiction } = getJurisdiction('IN');
    const profile = makeProfile({
      citizenships: ['IN'],
      residencies: [
        { country: 'GB', daysPresent: 300, isDomiciled: true, yearsResident: 10, status: '' },
      ],
    });
    const status = determineSourceCountryStatus(profile, 'IN');
    const event = makeMoneyEvent({ amount: 500_000 });
    const controls = analyzeCapitalControls(event, status, jurisdiction);
    expect(controls.approvalRequired).toBe(false);
  });
});

describe('Capital Controls — US (No Controls)', () => {
  it('US has no capital controls', () => {
    const { jurisdiction } = getJurisdiction('US');
    expect(jurisdiction.capitalControls).toBeDefined();
    expect(jurisdiction.capitalControls!.hasControls).toBe(false);
  });

  it('US has Form 3520 in documentation', () => {
    const { jurisdiction } = getJurisdiction('US');
    const docs = jurisdiction.capitalControls!.documentationRequired;
    expect(docs.some((d) => d.includes('3520'))).toBe(true);
  });

  it('analyzeCapitalControls returns no controls for US', () => {
    const { jurisdiction } = getJurisdiction('US');
    const profile = makeProfile();
    const status = determineSourceCountryStatus(profile, 'US');
    const event = makeMoneyEvent({ sourceCountry: 'US' });
    const controls = analyzeCapitalControls(event, status, jurisdiction);
    expect(controls.hasControls).toBe(false);
    expect(controls.approvalRequired).toBe(false);
  });
});

describe('Capital Controls — UK and Portugal (No Controls)', () => {
  it('UK has no capital controls since 1979', () => {
    const { jurisdiction } = getJurisdiction('GB');
    expect(jurisdiction.capitalControls!.hasControls).toBe(false);
    expect(jurisdiction.capitalControls!.exemptions.some((e) => e.includes('1979'))).toBe(true);
  });

  it('Portugal has no capital controls (EU free movement)', () => {
    const { jurisdiction } = getJurisdiction('PT');
    expect(jurisdiction.capitalControls!.hasControls).toBe(false);
    expect(jurisdiction.capitalControls!.exemptions.some((e) => e.includes('Art. 63'))).toBe(true);
  });
});
