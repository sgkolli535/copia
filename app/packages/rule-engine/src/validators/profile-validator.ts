import type { UserProfile, CountryCode } from '@copia/types';

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: string[];
}

/** Country codes supported by the engine */
const SUPPORTED_COUNTRIES: ReadonlySet<CountryCode> = new Set<CountryCode>([
  'US', 'GB', 'IN', 'PT',
]);

/**
 * Validate a UserProfile before feeding it into the pipeline.
 *
 * Checks for:
 * - Required fields (name, citizenships, residencies)
 * - At least one asset
 * - Positive asset values
 * - Supported country codes
 * - Consistent ownership fractions
 */
export function validateProfile(profile: UserProfile): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];

  // --- Required top-level fields ---
  if (!profile.id) {
    errors.push({ field: 'id', message: 'Profile must have an id.' });
  }

  if (!profile.name || profile.name.trim().length === 0) {
    errors.push({ field: 'name', message: 'Profile must have a non-empty name.' });
  }

  if (!profile.citizenships || profile.citizenships.length === 0) {
    errors.push({
      field: 'citizenships',
      message: 'Profile must list at least one citizenship.',
    });
  }

  if (!profile.residencies || profile.residencies.length === 0) {
    errors.push({
      field: 'residencies',
      message: 'Profile must list at least one residency.',
    });
  }

  // --- Assets ---
  if (!profile.assets || profile.assets.length === 0) {
    errors.push({
      field: 'assets',
      message: 'Profile must contain at least one asset.',
    });
  }

  if (profile.assets) {
    for (let i = 0; i < profile.assets.length; i++) {
      const asset = profile.assets[i];
      const prefix = `assets[${i}]`;

      if (!asset.id) {
        errors.push({ field: `${prefix}.id`, message: 'Asset must have an id.' });
      }

      if (asset.value <= 0) {
        errors.push({
          field: `${prefix}.value`,
          message: `Asset "${asset.name || asset.id}" must have a positive value, got ${asset.value}.`,
        });
      }

      if (asset.ownershipFraction <= 0 || asset.ownershipFraction > 1) {
        errors.push({
          field: `${prefix}.ownershipFraction`,
          message: `Asset "${asset.name || asset.id}" ownershipFraction must be in (0, 1], got ${asset.ownershipFraction}.`,
        });
      }

      if (!SUPPORTED_COUNTRIES.has(asset.spikeLocation)) {
        warnings.push(
          `Asset "${asset.name || asset.id}" is located in unsupported jurisdiction "${asset.spikeLocation}". It will be included in calculations but jurisdiction-specific rules may not apply.`,
        );
      }
    }
  }

  // --- Country code validation ---
  if (profile.citizenships) {
    for (const cc of profile.citizenships) {
      if (!SUPPORTED_COUNTRIES.has(cc)) {
        warnings.push(
          `Citizenship "${cc}" is not a fully supported jurisdiction. Results may be less precise.`,
        );
      }
    }
  }

  if (profile.residencies) {
    for (let i = 0; i < profile.residencies.length; i++) {
      const res = profile.residencies[i];
      if (!SUPPORTED_COUNTRIES.has(res.country)) {
        warnings.push(
          `Residency country "${res.country}" is not fully supported. Results may be less precise.`,
        );
      }
      if (res.daysPresent < 0 || res.daysPresent > 366) {
        errors.push({
          field: `residencies[${i}].daysPresent`,
          message: `Days present must be between 0 and 366, got ${res.daysPresent}.`,
        });
      }
    }
  }

  // --- Family member validation ---
  if (profile.family) {
    for (let i = 0; i < profile.family.length; i++) {
      const member = profile.family[i];
      const prefix = `family[${i}]`;

      if (!member.id) {
        errors.push({ field: `${prefix}.id`, message: 'Family member must have an id.' });
      }
      if (!member.name || member.name.trim().length === 0) {
        errors.push({
          field: `${prefix}.name`,
          message: 'Family member must have a non-empty name.',
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
