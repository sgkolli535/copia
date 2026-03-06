import type {
  MoneyEvent,
  StatusResult,
  Jurisdiction,
  ControlResult,
  SourceCitation,
} from '@copia/types';

/**
 * Analyze capital controls applicable to a money event based on source jurisdiction
 * and the user's status in that jurisdiction.
 */
export function analyzeCapitalControls(
  event: MoneyEvent,
  status: StatusResult,
  sourceJurisdiction: Jurisdiction,
): ControlResult {
  const controls = sourceJurisdiction.capitalControls;

  if (!controls || !controls.hasControls) {
    return {
      hasControls: false,
      outboundLimits: [],
      accountRequirements: [],
      approvalRequired: false,
      approvalThresholds: [],
      documentationRequired: controls?.documentationRequired ?? [],
      exemptions: controls?.exemptions ?? [],
      citations: makeCitations(sourceJurisdiction),
    };
  }

  // Determine if approval is required based on event amount
  const amountUSD = event.amount; // Assumed to be in USD for threshold comparison
  const applicableThresholds = controls.approvalThresholds.filter(
    (t) => amountUSD > t.thresholdUSD,
  );
  const approvalRequired = applicableThresholds.length > 0;

  // Filter account requirements based on status
  const relevantAccounts = filterAccountsByStatus(controls.accountRequirements, status);

  return {
    hasControls: true,
    outboundLimits: controls.outboundLimits,
    accountRequirements: relevantAccounts,
    approvalRequired,
    approvalThresholds: applicableThresholds,
    documentationRequired: controls.documentationRequired,
    exemptions: controls.exemptions,
    citations: makeCitations(sourceJurisdiction),
  };
}

function filterAccountsByStatus(
  accounts: Jurisdiction['capitalControls'] extends infer T
    ? T extends { accountRequirements: infer A }
      ? A
      : never
    : never,
  status: StatusResult,
): typeof accounts {
  // For India: NRI/OCI/PIO should see NRO/NRE/FCNR accounts
  // For other jurisdictions: return all accounts (no filtering needed)
  if (status.sourceCountry === 'IN') {
    const nriStatuses = ['nri', 'oci', 'pio', 'former_citizen'];
    if (nriStatuses.includes(status.status)) {
      return accounts; // NRO/NRE/FCNR all relevant for NRIs
    }
    // Resident Indians use standard accounts
    return accounts.filter((a) => a.accountType === 'standard' || a.accountType === 'other');
  }
  return accounts;
}

function makeCitations(jurisdiction: Jurisdiction): SourceCitation[] {
  return [
    {
      id: `capital-controls-${jurisdiction.code}`,
      sourceType: 'regulation',
      title: `Capital Control Rules — ${jurisdiction.name}`,
      reference: jurisdiction.capitalControls?.source ?? jurisdiction.source,
      url: null,
      confidence: 'statutory',
      asOfDate: jurisdiction.lastUpdated,
      jurisdiction: jurisdiction.code,
    },
  ];
}
