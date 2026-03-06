import type {
  UserProfile,
  ScenarioModification,
  CountryCode,
  Residency,
  Asset,
  RelocateParams,
  GiftAssetParams,
  RestructureOwnershipParams,
  ChangeTimingParams,
  AddJurisdictionParams,
  SpousalPlanningParams,
  RepatriateParams,
} from '@copia/types';

/**
 * Deep-clone a profile and apply the given modification.
 * Returns the modified profile.
 */
export function applyModification(
  profile: UserProfile,
  modification: ScenarioModification,
): UserProfile {
  const modified = structuredClone(profile);
  modified.updatedAt = new Date().toISOString();

  switch (modification.params.type) {
    case 'relocate':
      return applyRelocate(modified, modification.params);
    case 'gift_asset':
      return applyGiftAsset(modified, modification.params);
    case 'restructure_ownership':
      return applyRestructureOwnership(modified, modification.params);
    case 'change_timing':
      return applyChangeTiming(modified, modification.params);
    case 'add_jurisdiction':
      return applyAddJurisdiction(modified, modification.params);
    case 'spousal_planning':
      return applySpousalPlanning(modified, modification.params);
    case 'repatriate':
      return applyRepatriate(modified, modification.params);
    default: {
      // Exhaustive check: if we reach here, the type is unhandled
      const _exhaustive: never = modification.params;
      throw new Error(`Unknown modification type: ${(_exhaustive as { type: string }).type}`);
    }
  }
}

/**
 * Relocate a person to a new country.
 *
 * If personId matches the main profile ID, update profile.residencies.
 * If it matches a family member, update their residency.
 *
 * The old primary residency is kept in the residencies array (with reduced
 * daysPresent) and a new residency entry is created for the target country.
 */
function applyRelocate(profile: UserProfile, params: RelocateParams): UserProfile {
  const { personId, toCountry, daysPresent, year } = params;

  if (personId === profile.id) {
    // Find existing residency in the target country, or create one
    const existingIdx = profile.residencies.findIndex((r) => r.country === toCountry);

    if (existingIdx >= 0) {
      // Update existing residency in the target country
      const existing = profile.residencies[existingIdx]!;
      existing.daysPresent = daysPresent;
      existing.yearsResident = existing.yearsResident + 1;
      existing.isDomiciled = true;
    } else {
      // Create new residency for the target country
      const newResidency: Residency = {
        country: toCountry,
        daysPresent,
        isDomiciled: true,
        yearsResident: 0,
        status: `Relocated in ${year}`,
      };
      profile.residencies.push(newResidency);
    }

    // Reduce days present in all other residencies (person moved away)
    for (const residency of profile.residencies) {
      if (residency.country !== toCountry) {
        // They still may visit, but are no longer primarily present
        residency.daysPresent = Math.max(0, Math.min(residency.daysPresent, 365 - daysPresent));
        residency.isDomiciled = false;
      }
    }
  } else {
    // It's a family member
    const member = profile.family.find((m) => m.id === personId);
    if (!member) {
      throw new Error(`Person with ID ${personId} not found in profile or family`);
    }

    member.residency = {
      country: toCountry,
      daysPresent,
      isDomiciled: true,
      yearsResident: 0,
      status: `Relocated in ${year}`,
    };
  }

  return profile;
}

/**
 * Gift a fraction of an asset to a recipient.
 *
 * - Reduces the original asset's value and ownershipFraction by the gifted fraction.
 * - Creates a new asset entry for the recipient with the gifted portion.
 */
function applyGiftAsset(profile: UserProfile, params: GiftAssetParams): UserProfile {
  const { assetId, recipientId, fraction } = params;

  const assetIdx = profile.assets.findIndex((a) => a.id === assetId);
  if (assetIdx < 0) {
    throw new Error(`Asset with ID ${assetId} not found in profile`);
  }

  const asset = profile.assets[assetIdx]!;

  if (fraction <= 0 || fraction > 1) {
    throw new Error(`Gift fraction must be between 0 (exclusive) and 1 (inclusive), got ${fraction}`);
  }

  // Calculate gifted values
  const giftedValue = asset.value * fraction;
  const giftedOwnershipFraction = asset.ownershipFraction * fraction;

  // Reduce the original asset
  asset.value -= giftedValue;
  asset.ownershipFraction -= giftedOwnershipFraction;

  // If the entire asset is gifted, remove it
  if (asset.ownershipFraction <= 0 || asset.value <= 0) {
    profile.assets.splice(assetIdx, 1);
  }

  // Create a new asset entry for the recipient
  const recipient = profile.family.find((m) => m.id === recipientId);
  const recipientName = recipient?.name ?? recipientId;

  const newAsset: Asset = {
    id: crypto.randomUUID(),
    name: `${asset.name} (gifted to ${recipientName})`,
    assetClass: asset.assetClass,
    spikeLocation: asset.spikeLocation,
    value: giftedValue,
    currency: asset.currency,
    costBasis: asset.costBasis * fraction,
    ownershipType: 'sole',
    ownershipFraction: 1,
    dateAcquired: new Date().toISOString(),
    notes: `Gifted ${(fraction * 100).toFixed(1)}% from ${asset.name} to ${recipientName}`,
  };

  profile.assets.push(newAsset);

  return profile;
}

/**
 * Change the ownership type and fraction of an asset.
 */
function applyRestructureOwnership(
  profile: UserProfile,
  params: RestructureOwnershipParams,
): UserProfile {
  const { assetId, newOwnershipType, newOwnershipFraction } = params;

  const asset = profile.assets.find((a) => a.id === assetId);
  if (!asset) {
    throw new Error(`Asset with ID ${assetId} not found in profile`);
  }

  // Validate ownership type against known types
  const validTypes = ['sole', 'joint_tenancy', 'tenancy_in_common', 'community_property', 'trust'];
  if (!validTypes.includes(newOwnershipType)) {
    throw new Error(
      `Invalid ownership type: ${newOwnershipType}. Valid types: ${validTypes.join(', ')}`,
    );
  }

  asset.ownershipType = newOwnershipType as Asset['ownershipType'];
  asset.ownershipFraction = newOwnershipFraction;
  asset.notes = asset.notes
    ? `${asset.notes}; Restructured to ${newOwnershipType} (${(newOwnershipFraction * 100).toFixed(1)}%)`
    : `Restructured to ${newOwnershipType} (${(newOwnershipFraction * 100).toFixed(1)}%)`;

  return profile;
}

/**
 * Change timing of an event. This is abstract -- for now we record the
 * timing change in the profile's updatedAt and add a note.
 * In a full implementation, this would adjust dates, trigger conditions,
 * or deferred-event schedules on the profile.
 */
function applyChangeTiming(
  profile: UserProfile,
  params: ChangeTimingParams,
): UserProfile {
  const { event, year } = params;

  // Record the timing change. The updatedAt is already set by the caller.
  // We annotate all assets with a note if the event implies a time shift.
  // For example, "death" event with a different year might affect
  // holding periods and step-up basis calculations.
  for (const asset of profile.assets) {
    if (event === 'death' || event === 'transfer') {
      // Adjust the date acquired if the event implies an earlier/later transfer
      // This is a simplification: in production, timing changes would feed into
      // a more sophisticated event-driven model.
      asset.notes = asset.notes
        ? `${asset.notes}; Timing adjusted: ${event} moved to ${year}`
        : `Timing adjusted: ${event} moved to ${year}`;
    }
  }

  return profile;
}

/**
 * Add a new residency entry for the profile owner.
 * This represents establishing presence in an additional jurisdiction
 * without necessarily relocating (e.g., acquiring a second home).
 */
function applyAddJurisdiction(
  profile: UserProfile,
  params: AddJurisdictionParams,
): UserProfile {
  const { country, daysPresent } = params;

  // Check if a residency already exists for this country
  const existing = profile.residencies.find((r) => r.country === country);

  if (existing) {
    // Update days present
    existing.daysPresent = daysPresent;
  } else {
    // Validate that total days don't exceed 365
    const totalDays = profile.residencies.reduce((sum, r) => sum + r.daysPresent, 0);
    const adjustedDays = Math.min(daysPresent, 365 - totalDays);

    const newResidency: Residency = {
      country,
      daysPresent: Math.max(0, adjustedDays),
      isDomiciled: false,
      yearsResident: 0,
      status: 'New jurisdiction added via scenario',
    };
    profile.residencies.push(newResidency);
  }

  return profile;
}

/**
 * Apply spousal planning strategies.
 *
 * - 'qdot': Mark specified assets as held in a Qualified Domestic Trust (QDOT).
 *   Changes ownershipType to 'trust' and annotates assets.
 * - 'marital_deduction': Similar treatment, marking assets for marital deduction
 *   planning. Changes ownershipType to 'trust' for structuring purposes.
 */
function applySpousalPlanning(
  profile: UserProfile,
  params: SpousalPlanningParams,
): UserProfile {
  const { strategy, assetIds } = params;

  const spouse = profile.family.find((m) => m.relationship === 'spouse');
  const spouseName = spouse?.name ?? 'spouse';

  for (const assetId of assetIds) {
    const asset = profile.assets.find((a) => a.id === assetId);
    if (!asset) {
      throw new Error(`Asset with ID ${assetId} not found in profile for spousal planning`);
    }

    switch (strategy) {
      case 'qdot': {
        // QDOT: Qualified Domestic Trust for non-citizen spouse
        // Assets pass to the trust, deferring estate tax until distributions
        asset.ownershipType = 'trust';
        asset.notes = asset.notes
          ? `${asset.notes}; Held in QDOT for ${spouseName} -- IRC section 2056A`
          : `Held in QDOT for ${spouseName} -- IRC section 2056A`;
        break;
      }
      case 'marital_deduction': {
        // Marital deduction trust (e.g., QTIP, general power of appointment trust)
        // Qualifies for the unlimited marital deduction under IRC section 2056
        asset.ownershipType = 'trust';
        asset.notes = asset.notes
          ? `${asset.notes}; Marital deduction trust for ${spouseName} -- IRC section 2056`
          : `Marital deduction trust for ${spouseName} -- IRC section 2056`;
        break;
      }
      default: {
        // Generic spousal planning strategy
        asset.ownershipType = 'trust';
        asset.notes = asset.notes
          ? `${asset.notes}; Spousal planning (${strategy}) for ${spouseName}`
          : `Spousal planning (${strategy}) for ${spouseName}`;
        break;
      }
    }
  }

  return profile;
}

/**
 * Apply a repatriation scenario.
 *
 * Models moving funds from a source country to the user's primary jurisdiction.
 * Reduces asset value in the source country and creates a new asset in the
 * destination (user's primary residency country).
 */
function applyRepatriate(
  profile: UserProfile,
  params: RepatriateParams,
): UserProfile {
  const { sourceCountry, amount, channel, year } = params;

  // Find assets in the source country to repatriate from
  const sourceAssets = profile.assets.filter((a) => a.spikeLocation === sourceCountry);
  if (sourceAssets.length === 0) {
    throw new Error(`No assets found in ${sourceCountry} to repatriate`);
  }

  // Reduce value from source assets proportionally
  let remaining = amount;
  for (const asset of sourceAssets) {
    if (remaining <= 0) break;
    const reduction = Math.min(asset.value, remaining);
    asset.value -= reduction;
    remaining -= reduction;
    asset.notes = asset.notes
      ? `${asset.notes}; Repatriated ${reduction.toFixed(0)} via ${channel} in ${year}`
      : `Repatriated ${reduction.toFixed(0)} via ${channel} in ${year}`;
  }

  // Remove zeroed-out assets
  profile.assets = profile.assets.filter((a) => a.value > 0);

  // Create a new cash asset in the destination (primary residency)
  const destCountry = profile.residencies[0]?.country ?? sourceCountry;
  const newAsset: Asset = {
    id: crypto.randomUUID(),
    name: `Repatriated funds from ${sourceCountry} (${channel})`,
    assetClass: 'bank_deposits',
    spikeLocation: destCountry,
    value: amount, // Pre-tax; actual net would be adjusted by mobility engine
    currency: profile.reportingCurrency,
    costBasis: amount,
    ownershipType: 'sole',
    ownershipFraction: 1,
    dateAcquired: `${year}-01-01`,
    notes: `Repatriated from ${sourceCountry} via ${channel} in ${year}`,
  };
  profile.assets.push(newAsset);

  return profile;
}
