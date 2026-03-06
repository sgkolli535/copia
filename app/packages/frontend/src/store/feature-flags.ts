/**
 * Minimal A/B testing shell with deterministic hash-based allocation.
 * Interface only for prototype — no actual experimentation backend.
 */

export interface FeatureFlag {
  id: string;
  description: string;
  /** Percentage of users who get the treatment (0-100) */
  allocationPct: number;
}

const FLAGS: FeatureFlag[] = [
  {
    id: 'show_scenario_suggestions',
    description: 'Show AI-suggested scenarios after plan computation',
    allocationPct: 100,
  },
  {
    id: 'progressive_disclosure',
    description: 'Enable L0-L3 progressive disclosure in estate plan view',
    allocationPct: 100,
  },
  {
    id: 'audit_trail_expanded',
    description: 'Show audit trail expanded by default',
    allocationPct: 0,
  },
];

/**
 * Simple deterministic hash for consistent allocation.
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Check if a flag is enabled for a given user/session.
 */
export function isFlagEnabled(flagId: string, userId: string): boolean {
  const flag = FLAGS.find((f) => f.id === flagId);
  if (!flag) return false;
  if (flag.allocationPct >= 100) return true;
  if (flag.allocationPct <= 0) return false;

  const hash = hashString(`${flagId}:${userId}`);
  return (hash % 100) < flag.allocationPct;
}

/**
 * Get all flags with their current allocation status for a user.
 */
export function getAllFlags(userId: string): Array<FeatureFlag & { enabled: boolean }> {
  return FLAGS.map((flag) => ({
    ...flag,
    enabled: isFlagEnabled(flag.id, userId),
  }));
}
