import { randomUUID } from 'node:crypto';
import type { UserProfile } from '@copia/types';
import { ParseUserProfileInput } from '../schemas/index.js';
import { setProfile } from '../state/session-store.js';

/**
 * parse_user_profile tool handler.
 *
 * Validates the raw input against the Zod schema, constructs a
 * fully-typed UserProfile, stores it in the session, and returns
 * a confirmation summary.
 */
export async function handleParseUserProfile(args: unknown): Promise<string> {
  const input = ParseUserProfileInput.parse(args);

  const now = new Date().toISOString();
  const profile: UserProfile = {
    id: randomUUID(),
    name: input.name,
    age: input.age,
    citizenships: input.citizenships,
    residencies: input.residencies,
    assets: input.assets,
    family: input.family,
    reportingCurrency: input.reportingCurrency,
    createdAt: now,
    updatedAt: now,
  };

  setProfile(profile);

  const totalAssetValue = profile.assets.reduce((sum, a) => sum + a.value, 0);
  const jurisdictions = new Set<string>();
  for (const r of profile.residencies) jurisdictions.add(r.country);
  for (const c of profile.citizenships) jurisdictions.add(c);
  for (const a of profile.assets) jurisdictions.add(a.spikeLocation);

  return JSON.stringify({
    profileId: profile.id,
    name: profile.name,
    citizenships: profile.citizenships,
    residencyCountries: profile.residencies.map((r) => r.country),
    assetCount: profile.assets.length,
    totalAssetValue,
    reportingCurrency: profile.reportingCurrency,
    familyMemberCount: profile.family.length,
    involvedJurisdictions: [...jurisdictions],
    message: `Profile "${profile.name}" stored successfully with ${profile.assets.length} assets across ${jurisdictions.size} jurisdictions.`,
  });
}
