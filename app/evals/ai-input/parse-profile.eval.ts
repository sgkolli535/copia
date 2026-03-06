import { describe, it, expect } from 'vitest';
import { parseProfile } from '@copia/ai-layer';

const HAS_API_KEY = !!(
  process.env.ANTHROPIC_API_KEY ||
  process.env.OPENAI_API_KEY ||
  process.env.GOOGLE_GENERATIVE_AI_API_KEY
);

describe.skipIf(!HAS_API_KEY)('parseProfile AI eval', () => {
  it('extracts US citizen living in London', async () => {
    const result = await parseProfile(
      'I am a US citizen living in London. I have a flat worth 1.1 million GBP and a US brokerage account worth 2.5 million USD.',
    );

    expect(result.profile.citizenships).toContain('US');
    expect(result.profile.residencies.some((r) => r.country === 'GB')).toBe(true);
    expect(result.profile.assets.length).toBeGreaterThanOrEqual(2);
  }, 60_000);

  it('extracts Indian citizen with multiple residencies', async () => {
    const result = await parseProfile(
      'I am an Indian citizen. I have been living in Portugal for 5 years under the NHR regime. I own a house in Lisbon worth 500,000 EUR and have bank deposits in India worth 20 million INR.',
    );

    expect(result.profile.citizenships).toContain('IN');
    expect(result.profile.residencies.some((r) => r.country === 'PT')).toBe(true);
    expect(result.profile.assets.length).toBeGreaterThanOrEqual(2);
  }, 60_000);

  it('identifies spouse and family members', async () => {
    const result = await parseProfile(
      'My name is John, age 55, US citizen living in the UK for 12 years. My wife Sarah is British, age 50. We have two children: Emma (25) and James (22). Our main asset is a London home worth 2M GBP.',
    );

    expect(result.profile.family.length).toBeGreaterThanOrEqual(1);
    const spouse = result.profile.family.find((f) => f.relationship === 'spouse');
    expect(spouse).toBeDefined();
  }, 60_000);

  it('flags unsupported jurisdictions', async () => {
    const result = await parseProfile(
      'I am a French citizen living in Germany with assets in Japan worth 50 million JPY.',
    );

    expect(result.flaggedEntities.length).toBeGreaterThan(0);
  }, 60_000);

  it('reports ambiguities for missing data', async () => {
    const result = await parseProfile(
      'I live in London and have some investments.',
    );

    expect(result.ambiguities.length).toBeGreaterThan(0);
  }, 60_000);
});
