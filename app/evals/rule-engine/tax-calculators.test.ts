import { describe, it, expect } from 'vitest';
import {
  applyBrackets,
  calculateUSEstateTax,
  calculateUKIHT,
  calculateIndiaStampDuty,
  calculatePortugalStampDuty,
} from '@copia/rule-engine';
import type { TaxBracket } from '@copia/types';

// ---------------------------------------------------------------------------
// US federal estate tax brackets (IRC section 2001)
// ---------------------------------------------------------------------------
const US_BRACKETS: TaxBracket[] = [
  { from: 0, to: 10_000, rate: 0.18 },
  { from: 10_000, to: 20_000, rate: 0.20 },
  { from: 20_000, to: 40_000, rate: 0.22 },
  { from: 40_000, to: 60_000, rate: 0.24 },
  { from: 60_000, to: 80_000, rate: 0.26 },
  { from: 80_000, to: 100_000, rate: 0.28 },
  { from: 100_000, to: 150_000, rate: 0.30 },
  { from: 150_000, to: 250_000, rate: 0.32 },
  { from: 250_000, to: 500_000, rate: 0.34 },
  { from: 500_000, to: 750_000, rate: 0.37 },
  { from: 750_000, to: 1_000_000, rate: 0.39 },
  { from: 1_000_000, to: null, rate: 0.40 },
];

// ---------------------------------------------------------------------------
// UK IHT brackets
// ---------------------------------------------------------------------------
const UK_BRACKETS: TaxBracket[] = [
  { from: 0, to: 325_000, rate: 0.0 },
  { from: 325_000, to: null, rate: 0.40 },
];

// ---------------------------------------------------------------------------
// Helper: manually compute the expected tax through US brackets up to `amount`
// ---------------------------------------------------------------------------
function expectedUSBracketTax(amount: number): number {
  let tax = 0;
  for (const b of US_BRACKETS) {
    if (amount <= b.from) break;
    const upper = b.to === null ? amount : Math.min(b.to, amount);
    const taxable = upper - b.from;
    if (taxable <= 0) continue;
    tax += taxable * b.rate;
  }
  return tax;
}

// ---------------------------------------------------------------------------
// applyBrackets
// ---------------------------------------------------------------------------
describe('applyBrackets', () => {
  it('computes correct marginal tax for $100K through US estate brackets', () => {
    const result = applyBrackets(100_000, US_BRACKETS);

    // Expected breakdown:
    //  0-10K:  10000 * 0.18 =  1,800
    // 10-20K:  10000 * 0.20 =  2,000
    // 20-40K:  20000 * 0.22 =  4,400
    // 40-60K:  20000 * 0.24 =  4,800
    // 60-80K:  20000 * 0.26 =  5,200
    // 80-100K: 20000 * 0.28 =  5,600
    // Total:                   23,800
    const expected = 23_800;

    expect(result.tax).toBeCloseTo(expected, -2);
    expect(result.effectiveRate).toBeCloseTo(expected / 100_000, 4);
    expect(result.breakdown.length).toBeGreaterThan(0);
  });

  it('returns zero tax for a zero amount', () => {
    const result = applyBrackets(0, US_BRACKETS);
    expect(result.tax).toBe(0);
    expect(result.effectiveRate).toBe(0);
  });

  it('applies the top bracket for amounts exceeding all defined brackets', () => {
    const result = applyBrackets(2_000_000, US_BRACKETS);
    // Tax through 1M in lower brackets + (2M - 1M) * 0.40
    const taxThrough1M = expectedUSBracketTax(1_000_000);
    const expected = taxThrough1M + 1_000_000 * 0.40;
    expect(result.tax).toBeCloseTo(expected, -2);
  });

  it('produces a breakdown entry for each applicable bracket', () => {
    const result = applyBrackets(100_000, US_BRACKETS);
    // $100K spans exactly the first 6 brackets
    expect(result.breakdown.length).toBe(6);
  });
});

// ---------------------------------------------------------------------------
// calculateUSEstateTax
// ---------------------------------------------------------------------------
describe('calculateUSEstateTax', () => {
  const EXEMPTION = 12_920_000;

  it('computes approximately $832K tax on a $15M estate with $12.92M exemption', () => {
    const result = calculateUSEstateTax(15_000_000, EXEMPTION, false, US_BRACKETS);

    // Net tax = tentative tax on $15M - unified credit (tax on $12.92M)
    const tentative = expectedUSBracketTax(15_000_000);
    const credit = expectedUSBracketTax(EXEMPTION);
    const expected = Math.max(0, tentative - credit);

    // Expected: ~$832,000
    expect(result.tax).toBeCloseTo(expected, -2);
    expect(result.tax).toBeCloseTo(832_000, -2);
    expect(result.effectiveRate).toBeGreaterThan(0);
    expect(result.breakdown.length).toBeGreaterThan(0);
  });

  it('returns $0 tax when estate ($5M) is below the exemption ($12.92M)', () => {
    const result = calculateUSEstateTax(5_000_000, EXEMPTION, false, US_BRACKETS);

    expect(result.tax).toBe(0);
    expect(result.effectiveRate).toBe(0);
  });

  it('returns $0 tax for a $0 estate', () => {
    const result = calculateUSEstateTax(0, EXEMPTION, false, US_BRACKETS);

    expect(result.tax).toBe(0);
    expect(result.effectiveRate).toBe(0);
  });

  it('returns $0 tax when spouse is a US citizen (unlimited marital deduction)', () => {
    const result = calculateUSEstateTax(50_000_000, EXEMPTION, true, US_BRACKETS);

    expect(result.tax).toBe(0);
    expect(result.effectiveRate).toBe(0);
    expect(result.breakdown.some((s) => s.description.includes('marital deduction'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// calculateUKIHT
// ---------------------------------------------------------------------------
describe('calculateUKIHT', () => {
  const NRB = 325_000;
  const RNRB = 175_000;

  it('computes GBP 310K IHT on GBP 1.1M estate without main residence', () => {
    const result = calculateUKIHT(1_100_000, NRB, false, RNRB, UK_BRACKETS);

    // (1,100,000 - 325,000) * 0.40 = 310,000
    const expected = 310_000;
    expect(result.tax).toBeCloseTo(expected, -2);
    expect(result.effectiveRate).toBeCloseTo(expected / 1_100_000, 4);
    expect(result.breakdown.length).toBeGreaterThan(0);
  });

  it('computes GBP 240K IHT on GBP 1.1M estate with main residence RNRB', () => {
    const result = calculateUKIHT(1_100_000, NRB, true, RNRB, UK_BRACKETS);

    // (1,100,000 - 325,000 - 175,000) * 0.40 = 240,000
    // RNRB taper does not apply since estate is below GBP 2M
    const expected = 240_000;
    expect(result.tax).toBeCloseTo(expected, -2);
    expect(result.effectiveRate).toBeCloseTo(expected / 1_100_000, 4);
  });

  it('returns GBP 0 IHT when estate (GBP 300K) is under the NRB', () => {
    const result = calculateUKIHT(300_000, NRB, false, RNRB, UK_BRACKETS);

    expect(result.tax).toBe(0);
    expect(result.effectiveRate).toBe(0);
  });

  it('returns GBP 0 IHT when estate equals the NRB exactly (GBP 325K)', () => {
    const result = calculateUKIHT(325_000, NRB, false, RNRB, UK_BRACKETS);

    expect(result.tax).toBe(0);
    expect(result.effectiveRate).toBe(0);
  });

  it('tapers the RNRB for estates exceeding GBP 2M', () => {
    // Estate: GBP 2,350,000; RNRB taper: (2,350,000 - 2,000,000) / 2 = 175,000
    // Effective RNRB = max(0, 175,000 - 175,000) = 0
    // So total threshold = 325,000 only; tax = (2,350,000 - 325,000) * 0.40 = 810,000
    const result = calculateUKIHT(2_350_000, NRB, true, RNRB, UK_BRACKETS);
    const expected = (2_350_000 - 325_000) * 0.40;
    expect(result.tax).toBeCloseTo(expected, -2);
  });

  it('returns GBP 0 IHT for a GBP 0 estate', () => {
    const result = calculateUKIHT(0, NRB, false, RNRB, UK_BRACKETS);

    expect(result.tax).toBe(0);
    expect(result.effectiveRate).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// calculateIndiaStampDuty
// ---------------------------------------------------------------------------
describe('calculateIndiaStampDuty', () => {
  it('computes INR 700K stamp duty on INR 10M property at 7%', () => {
    const result = calculateIndiaStampDuty(10_000_000, 0.07);

    expect(result.tax).toBeCloseTo(700_000, -2);
    expect(result.effectiveRate).toBe(0.07);
    expect(result.breakdown.length).toBeGreaterThan(0);
  });

  it('returns zero for a zero-value property', () => {
    const result = calculateIndiaStampDuty(0, 0.07);

    expect(result.tax).toBe(0);
    expect(result.effectiveRate).toBe(0.07);
  });
});

// ---------------------------------------------------------------------------
// calculatePortugalStampDuty
// ---------------------------------------------------------------------------
describe('calculatePortugalStampDuty', () => {
  it('computes EUR 50K stamp duty on EUR 500K to non-exempt beneficiary at 10%', () => {
    const result = calculatePortugalStampDuty(500_000, false, 0.10);

    expect(result.tax).toBeCloseTo(50_000, -2);
    expect(result.effectiveRate).toBe(0.10);
    expect(result.breakdown.length).toBeGreaterThan(0);
  });

  it('returns EUR 0 stamp duty for an exempt relative', () => {
    const result = calculatePortugalStampDuty(500_000, true, 0.10);

    expect(result.tax).toBe(0);
    expect(result.effectiveRate).toBe(0);
    expect(result.breakdown.some((s) => s.description.includes('Exempt'))).toBe(true);
  });

  it('returns zero for a zero-value transfer to non-exempt beneficiary', () => {
    const result = calculatePortugalStampDuty(0, false, 0.10);

    expect(result.tax).toBe(0);
  });
});
