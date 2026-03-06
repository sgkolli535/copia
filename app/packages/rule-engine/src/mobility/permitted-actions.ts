import type {
  MoneyEvent,
  UserProfile,
  StatusResult,
  ControlResult,
  CountryCode,
  PermittedAction,
  Jurisdiction,
} from '@copia/types';
import { getPermittedActions } from '@copia/data-service';

/**
 * Map permitted actions across three categories:
 * 1. Source country — what can you do with the money where it sits?
 * 2. Destination country — what happens when it arrives?
 * 3. Third country — can you deploy it elsewhere?
 *
 * Follows the "walls, not just doors" principle: explicitly includes
 * prohibited actions with citations for why they're not allowed.
 */
export function mapPermittedActions(
  event: MoneyEvent,
  profile: UserProfile,
  status: StatusResult,
  controls: ControlResult,
  jurisdictions: Map<CountryCode, Jurisdiction>,
): PermittedAction[] {
  const actions: PermittedAction[] = [];

  // Source country actions
  const sourceActions = getPermittedActions(event.sourceCountry);
  for (const action of sourceActions) {
    if (action.category === 'source_country') {
      actions.push(annotateAction(action, status, controls));
    }
  }

  // Destination country actions
  const destActions = getPermittedActions(event.destinationCountry);
  for (const action of destActions) {
    if (action.category === 'destination_country' || action.category === 'source_country') {
      // Re-categorize source_country actions from destination as destination_country
      actions.push({
        ...annotateAction(action, status, controls),
        category: 'destination_country',
      });
    }
  }

  // Third country actions — check other jurisdictions the user has connections to
  const connectedCountries = new Set<CountryCode>();
  for (const residency of profile.residencies) {
    connectedCountries.add(residency.country);
  }
  for (const citizenship of profile.citizenships) {
    connectedCountries.add(citizenship);
  }

  for (const country of connectedCountries) {
    if (country === event.sourceCountry || country === event.destinationCountry) continue;
    const thirdActions = getPermittedActions(country);
    for (const action of thirdActions) {
      if (action.category === 'third_country') {
        actions.push(annotateAction(action, status, controls));
      }
    }
  }

  return actions;
}

/**
 * Annotate an action with status-specific restrictions.
 * For example, US/Canada NRIs face additional mutual fund restrictions in India.
 */
function annotateAction(
  action: PermittedAction,
  status: StatusResult,
  controls: ControlResult,
): PermittedAction {
  const additionalRestrictions: string[] = [];

  // India-specific annotations
  if (action.country === 'IN' && status.status === 'nri') {
    if (action.id === 'in-mutual-funds') {
      // Check if user is US/Canada NRI (stricter rules)
      additionalRestrictions.push(
        'Note: US/Canada-based NRIs face additional restrictions — many Indian AMCs do not accept investments from US/Canada residents due to FATCA/CRS compliance burden',
      );
    }
  }

  // Add repatriation cap reminder for source country actions
  if (action.category === 'source_country' && controls.hasControls) {
    for (const limit of controls.outboundLimits) {
      if (limit.annualLimitUSD !== null) {
        additionalRestrictions.push(
          `Repatriation of proceeds subject to annual limit: USD ${limit.annualLimitUSD.toLocaleString()} (${limit.name})`,
        );
      }
    }
  }

  if (additionalRestrictions.length === 0) return action;

  return {
    ...action,
    restrictions: [...action.restrictions, ...additionalRestrictions],
  };
}
