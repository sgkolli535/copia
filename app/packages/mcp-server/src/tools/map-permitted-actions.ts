import { randomUUID } from 'node:crypto';
import type { MoneyEvent, CountryCode, Jurisdiction } from '@copia/types';
import {
  determineSourceCountryStatus,
  analyzeCapitalControls,
  mapPermittedActions,
} from '@copia/rule-engine';
import { getJurisdiction } from '@copia/data-service';
import { PermittedActionsInput } from '../schemas/index.js';
import { getProfile } from '../state/session-store.js';

export async function handleMapPermittedActions(args: unknown): Promise<string> {
  const input = PermittedActionsInput.parse(args);

  const profile = getProfile();
  if (!profile) {
    throw new Error(
      'No profile stored. Call parse_user_profile first.',
    );
  }

  // Build a synthetic event for context
  const event: MoneyEvent = {
    id: randomUUID(),
    type: input.eventType ?? 'inheritance',
    sourceCountry: input.sourceCountry,
    destinationCountry: input.destinationCountry,
    amount: 0,
    currency: 'USD',
    date: new Date().toISOString(),
    relatedAsset: '',
    relationship: '',
    userStatusInSource: 'non_resident',
    description: 'Permitted actions lookup',
  };

  const sourceJurisdiction = getJurisdiction(input.sourceCountry).jurisdiction;
  const destJurisdiction = getJurisdiction(input.destinationCountry).jurisdiction;

  const jurisdictions = new Map<CountryCode, Jurisdiction>();
  jurisdictions.set(input.sourceCountry, sourceJurisdiction);
  jurisdictions.set(input.destinationCountry, destJurisdiction);

  const status = determineSourceCountryStatus(profile, input.sourceCountry);
  const controls = analyzeCapitalControls(event, status, sourceJurisdiction);
  const actions = mapPermittedActions(event, profile, status, controls, jurisdictions);

  return JSON.stringify({
    sourceCountry: input.sourceCountry,
    destinationCountry: input.destinationCountry,
    userStatus: {
      status: status.status,
      description: status.description,
      confidence: status.confidence,
    },
    actions: actions.map((a) => ({
      id: a.id,
      name: a.name,
      category: a.category,
      country: a.country,
      permitted: a.permitted,
      restrictions: a.restrictions,
      taxConsequences: a.taxConsequences,
      filingObligations: a.filingObligations,
      repatriability: a.repatriability,
      confidence: a.confidence,
    })),
    summary: {
      total: actions.length,
      permitted: actions.filter((a) => a.permitted).length,
      prohibited: actions.filter((a) => !a.permitted).length,
      byCategory: {
        source_country: actions.filter((a) => a.category === 'source_country').length,
        destination_country: actions.filter((a) => a.category === 'destination_country').length,
        third_country: actions.filter((a) => a.category === 'third_country').length,
      },
    },
  });
}
