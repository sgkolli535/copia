import { describe, it, expect } from 'vitest';
import { buildExchangeRateMap, getRate, convert, rateKey } from '@copia/rule-engine';
import type { ExchangeRateSnapshot, CurrencyCode } from '@copia/types';

// ---------------------------------------------------------------------------
// rateKey
// ---------------------------------------------------------------------------
describe('rateKey', () => {
  it('returns "USD:GBP" for ("USD", "GBP")', () => {
    expect(rateKey('USD' as CurrencyCode, 'GBP' as CurrencyCode)).toBe('USD:GBP');
  });

  it('returns "GBP:USD" for ("GBP", "USD") -- order matters', () => {
    expect(rateKey('GBP' as CurrencyCode, 'USD' as CurrencyCode)).toBe('GBP:USD');
  });

  it('returns "EUR:EUR" for an identity pair', () => {
    expect(rateKey('EUR' as CurrencyCode, 'EUR' as CurrencyCode)).toBe('EUR:EUR');
  });
});

// ---------------------------------------------------------------------------
// Shared test fixtures
// ---------------------------------------------------------------------------
const SNAPSHOTS: ExchangeRateSnapshot[] = [
  { from: 'USD', to: 'GBP', rate: 0.79, asOf: '2024-01-01', source: 'test' },
  { from: 'USD', to: 'EUR', rate: 0.92, asOf: '2024-01-01', source: 'test' },
  { from: 'GBP', to: 'EUR', rate: 1.16, asOf: '2024-01-01', source: 'test' },
  { from: 'USD', to: 'INR', rate: 83.0, asOf: '2024-01-01', source: 'test' },
];

// ---------------------------------------------------------------------------
// buildExchangeRateMap
// ---------------------------------------------------------------------------
describe('buildExchangeRateMap', () => {
  it('creates a map with identity rates for all currencies in the snapshots', () => {
    const map = buildExchangeRateMap(SNAPSHOTS);

    expect(map.get('USD:USD')).toBe(1);
    expect(map.get('GBP:GBP')).toBe(1);
    expect(map.get('EUR:EUR')).toBe(1);
    expect(map.get('INR:INR')).toBe(1);
  });

  it('stores direct rates from snapshots', () => {
    const map = buildExchangeRateMap(SNAPSHOTS);

    expect(map.get('USD:GBP')).toBe(0.79);
    expect(map.get('USD:EUR')).toBe(0.92);
    expect(map.get('GBP:EUR')).toBe(1.16);
    expect(map.get('USD:INR')).toBe(83.0);
  });

  it('returns an empty map for an empty snapshot array', () => {
    const map = buildExchangeRateMap([]);
    expect(map.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// getRate
// ---------------------------------------------------------------------------
describe('getRate', () => {
  const map = buildExchangeRateMap(SNAPSHOTS);

  it('returns the exact rate for a stored pair', () => {
    const rate = getRate(map, 'USD' as CurrencyCode, 'GBP' as CurrencyCode);
    expect(rate).toBe(0.79);
  });

  it('computes the inverse for a reverse pair (GBP -> USD)', () => {
    const rate = getRate(map, 'GBP' as CurrencyCode, 'USD' as CurrencyCode);
    expect(rate).toBeCloseTo(1 / 0.79, 6);
  });

  it('returns 1 for an identity pair (same currency)', () => {
    const rate = getRate(map, 'USD' as CurrencyCode, 'USD' as CurrencyCode);
    expect(rate).toBe(1);
  });

  it('throws for a pair not in the map and not inversible', () => {
    const sparseMap = buildExchangeRateMap([
      { from: 'USD', to: 'GBP', rate: 0.79, asOf: '2024-01-01', source: 'test' },
    ]);

    // EUR is not in the map at all
    expect(() => getRate(sparseMap, 'EUR' as CurrencyCode, 'INR' as CurrencyCode)).toThrow(
      /Exchange rate not available/,
    );
  });
});

// ---------------------------------------------------------------------------
// convert
// ---------------------------------------------------------------------------
describe('convert', () => {
  const map = buildExchangeRateMap(SNAPSHOTS);

  it('returns the same amount for an identity conversion (USD -> USD)', () => {
    const result = convert(100, 'USD' as CurrencyCode, 'USD' as CurrencyCode, map);
    expect(result).toBe(100);
  });

  it('converts 100 USD to GBP using rate 0.79', () => {
    const result = convert(100, 'USD' as CurrencyCode, 'GBP' as CurrencyCode, map);
    expect(result).toBeCloseTo(79, 2);
  });

  it('converts 100 GBP to USD using the inverse rate', () => {
    const result = convert(100, 'GBP' as CurrencyCode, 'USD' as CurrencyCode, map);
    expect(result).toBeCloseTo(100 / 0.79, 2);
  });

  it('converts zero to zero regardless of currencies', () => {
    const result = convert(0, 'USD' as CurrencyCode, 'GBP' as CurrencyCode, map);
    expect(result).toBe(0);
  });

  it('converts USD to INR correctly', () => {
    const result = convert(1_000, 'USD' as CurrencyCode, 'INR' as CurrencyCode, map);
    expect(result).toBeCloseTo(83_000, 0);
  });
});
