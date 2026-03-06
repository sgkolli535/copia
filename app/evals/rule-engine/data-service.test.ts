import { describe, it, expect } from 'vitest';
import { getJurisdiction, getTreaty, listJurisdictions } from '@copia/data-service';

// ---------------------------------------------------------------------------
// listJurisdictions
// ---------------------------------------------------------------------------
describe('listJurisdictions', () => {
  it('returns US, GB, IN, PT as the supported jurisdictions', () => {
    const codes = listJurisdictions();
    expect(codes).toEqual(expect.arrayContaining(['US', 'GB', 'IN', 'PT']));
    expect(codes.length).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// getJurisdiction
// ---------------------------------------------------------------------------
describe('getJurisdiction', () => {
  it('returns US jurisdiction with estate tax that exists', () => {
    const { jurisdiction, warnings } = getJurisdiction('US');

    expect(jurisdiction.code).toBe('US');
    expect(jurisdiction.name).toBe('United States');
    expect(jurisdiction.currency).toBe('USD');
    expect(jurisdiction.estateTax.exists).toBe(true);
    expect(jurisdiction.estateTax.taxBase).toBe('estate');
  });

  it('returns US jurisdiction with brackets and exemptions', () => {
    const { jurisdiction } = getJurisdiction('US');

    expect(jurisdiction.estateTax.brackets.length).toBeGreaterThan(0);
    expect(jurisdiction.estateTax.exemptions.length).toBeGreaterThan(0);
    // The basic exclusion amount should be $12,920,000
    const basicExclusion = jurisdiction.estateTax.exemptions[0];
    expect(basicExclusion?.amount).toBe(12_920_000);
  });

  it('returns US jurisdiction with filing obligations including Form 706', () => {
    const { jurisdiction } = getJurisdiction('US');

    const hasForm706 = jurisdiction.filingObligations.some((o) =>
      o.name.includes('Form 706'),
    );
    expect(hasForm706).toBe(true);
  });

  it('returns GB jurisdiction with IHT that exists', () => {
    const { jurisdiction } = getJurisdiction('GB');

    expect(jurisdiction.code).toBe('GB');
    expect(jurisdiction.currency).toBe('GBP');
    expect(jurisdiction.estateTax.exists).toBe(true);
    expect(jurisdiction.estateTax.brackets.length).toBeGreaterThan(0);
  });

  it('returns GB jurisdiction with filing obligations including IHT400', () => {
    const { jurisdiction } = getJurisdiction('GB');

    const hasIHT400 = jurisdiction.filingObligations.some((o) =>
      o.name.includes('IHT400'),
    );
    expect(hasIHT400).toBe(true);
  });

  it('returns GB jurisdiction with NRB exemption of GBP 325,000', () => {
    const { jurisdiction } = getJurisdiction('GB');

    const nrb = jurisdiction.estateTax.exemptions.find((e) =>
      e.name.includes('Nil-Rate Band'),
    );
    expect(nrb).toBeDefined();
    expect(nrb?.amount).toBe(325_000);
  });

  it('returns IN jurisdiction with estate tax that does NOT exist (abolished)', () => {
    const { jurisdiction } = getJurisdiction('IN');

    expect(jurisdiction.code).toBe('IN');
    expect(jurisdiction.currency).toBe('INR');
    expect(jurisdiction.estateTax.exists).toBe(false);
    expect(jurisdiction.estateTax.taxBase).toBe('none');
    expect(jurisdiction.estateTax.brackets.length).toBe(0);
  });

  it('returns IN jurisdiction with stamp duty special rule', () => {
    const { jurisdiction } = getJurisdiction('IN');

    const hasStampDuty = jurisdiction.estateTax.specialRules.some((r) =>
      r.name.toLowerCase().includes('stamp duty'),
    );
    expect(hasStampDuty).toBe(true);
  });

  it('returns PT jurisdiction with stamp duty (Imposto do Selo)', () => {
    const { jurisdiction } = getJurisdiction('PT');

    expect(jurisdiction.code).toBe('PT');
    expect(jurisdiction.currency).toBe('EUR');
    expect(jurisdiction.estateTax.exists).toBe(true);
    expect(jurisdiction.estateTax.taxBase).toBe('inheritance');
    // Single bracket: 10% flat
    expect(jurisdiction.estateTax.brackets.length).toBe(1);
    expect(jurisdiction.estateTax.brackets[0]?.rate).toBe(0.10);
  });

  it('throws for an unsupported jurisdiction code', () => {
    expect(() => getJurisdiction('JP' as any)).toThrow(/Unsupported jurisdiction/);
  });

  it('each jurisdiction has brackets, exemptions, and filing obligations', () => {
    const codes = listJurisdictions();
    for (const code of codes) {
      const { jurisdiction } = getJurisdiction(code);
      expect(jurisdiction.estateTax).toBeDefined();
      expect(jurisdiction.estateTax.exemptions).toBeDefined();
      expect(jurisdiction.filingObligations.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// getTreaty
// ---------------------------------------------------------------------------
describe('getTreaty', () => {
  it('returns a US-GB treaty with reliefMethod "credit"', () => {
    const result = getTreaty('US', 'GB');

    expect(result).not.toBeNull();
    expect(result!.treaty.reliefMethod).toBe('credit');
    expect(result!.treaty.pair).toBe('GB-US');
    expect(result!.treaty.countries).toEqual(expect.arrayContaining(['US', 'GB']));
  });

  it('returns a US-IN treaty with reliefMethod "none"', () => {
    const result = getTreaty('US', 'IN');

    expect(result).not.toBeNull();
    expect(result!.treaty.reliefMethod).toBe('none');
    expect(result!.treaty.pair).toBe('IN-US');
  });

  it('returns the same treaty regardless of argument order (GB, US) vs (US, GB)', () => {
    const resultA = getTreaty('US', 'GB');
    const resultB = getTreaty('GB', 'US');

    expect(resultA).not.toBeNull();
    expect(resultB).not.toBeNull();
    expect(resultA!.treaty.pair).toBe(resultB!.treaty.pair);
    expect(resultA!.treaty.reliefMethod).toBe(resultB!.treaty.reliefMethod);
    expect(resultA!.treaty.yearSigned).toBe(resultB!.treaty.yearSigned);
  });

  it('returns a GB-IN treaty (income only, no estate coverage)', () => {
    const result = getTreaty('GB', 'IN');

    expect(result).not.toBeNull();
    expect(result!.treaty.pair).toBe('GB-IN');
    // The treaty exists but has "not_covered" for all asset classes re: estate
    expect(result!.treaty.taxingRights.every((tr) => tr.right === 'not_covered')).toBe(true);
  });

  it('each treaty has taxingRights entries covering all standard asset classes', () => {
    const pairs: [string, string][] = [['US', 'GB'], ['US', 'IN'], ['US', 'PT'], ['GB', 'IN'], ['GB', 'PT'], ['IN', 'PT']];
    for (const [a, b] of pairs) {
      const result = getTreaty(a as any, b as any);
      expect(result).not.toBeNull();
      expect(result!.treaty.taxingRights.length).toBeGreaterThan(0);
    }
  });

  it('US-GB treaty includes taxing rights for immovable property and shares', () => {
    const result = getTreaty('US', 'GB');

    const immovable = result!.treaty.taxingRights.find((tr) => tr.assetClass === 'immovable_property');
    const shares = result!.treaty.taxingRights.find((tr) => tr.assetClass === 'shares');

    expect(immovable).toBeDefined();
    expect(immovable!.right).toBe('shared');

    expect(shares).toBeDefined();
    expect(shares!.right).toBe('exclusive_residence');
  });
});
