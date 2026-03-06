import { FlagUnknownEntityInput } from '../schemas/index.js';
import { flagUnknownEntity, getUnknownEntities } from '../state/session-store.js';

/**
 * flag_unknown_entity tool handler.
 *
 * Records an unsupported jurisdiction, asset class, treaty, or
 * rule in the session store for tracking. Returns an acknowledgment
 * with the current count of flagged entities.
 */
export async function handleFlagUnknownEntity(args: unknown): Promise<string> {
  const input = FlagUnknownEntityInput.parse(args);

  flagUnknownEntity({
    type: input.type,
    value: input.value,
    context: input.context,
  });

  const allFlagged = getUnknownEntities();

  return JSON.stringify({
    acknowledged: true,
    entity: {
      type: input.type,
      value: input.value,
      context: input.context,
    },
    totalFlaggedCount: allFlagged.length,
    message: `Flagged unknown ${input.type}: "${input.value}". Total flagged entities in session: ${allFlagged.length}.`,
  });
}
