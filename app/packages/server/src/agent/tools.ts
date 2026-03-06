import { tool } from 'ai';
import { z } from 'zod';
import {
  handleParseUserProfile,
  handleGetApplicableRules,
  handleComputeEstatePlan,
  handleComputeScenarioDelta,
  handleGetJurisdictionInfo,
  handleGetTreatyInfo,
  handleListSupportedJurisdictions,
  handleFlagUnknownEntity,
  handleAnalyzeMoneyEvent,
  handleCompareRepatriationScenarios,
  handleMapPermittedActions,
  ParseUserProfileInput,
  ComputeEstatePlanInput,
  ComputeScenarioDeltaInput,
  GetJurisdictionInfoInput,
  GetTreatyInfoInput,
  FlagUnknownEntityInput,
  MoneyEventInput,
  RepatriationScenarioInput,
  PermittedActionsInput,
} from '@copia/mcp-server';

/**
 * Wraps an MCP handler (returns JSON string) into a parsed object for the AI model.
 */
function wrapHandler(handler: (args: unknown) => Promise<string>) {
  return async (args: unknown) => {
    const result = await handler(args);
    return JSON.parse(result);
  };
}

/**
 * Vercel AI SDK tool definitions that wrap the MCP tool handlers.
 * Used in the agentic loop via generateText({ tools, maxSteps }).
 */
export const agentTools = {
  parse_user_profile: tool({
    description:
      'Validate and store a user profile for estate planning analysis. ' +
      'Accepts personal details, citizenships, residencies, assets, and family members. ' +
      'The profile is stored in the session for subsequent tool calls.',
    parameters: ParseUserProfileInput,
    execute: wrapHandler(handleParseUserProfile),
  }),

  get_applicable_rules: tool({
    description:
      'Get jurisdiction rules and treaty edges applicable to the stored profile. ' +
      'Returns estate tax, gift tax, capital gains tax rules, and treaty relief ' +
      'for every jurisdiction involved. Requires a profile to be stored first.',
    parameters: z.object({}),
    execute: wrapHandler(handleGetApplicableRules),
  }),

  compute_estate_plan: tool({
    description:
      'Compute a full estate plan with liabilities, conflicts, and treaty relief. ' +
      'Runs the rule engine pipeline on the stored profile. Returns per-jurisdiction ' +
      'liabilities, conflicts, treaty applications, and filing obligations. ' +
      'Requires a profile to be stored first.',
    parameters: ComputeEstatePlanInput,
    execute: wrapHandler(handleComputeEstatePlan),
  }),

  compute_scenario_delta: tool({
    description:
      'Compare a scenario modification against the baseline plan. ' +
      'Accepts a modification (relocate, gift_asset, restructure_ownership, ' +
      'change_timing, add_jurisdiction, spousal_planning) and returns the delta ' +
      'showing changes in liabilities, new/resolved conflicts, and trade-offs. ' +
      'Requires both a stored profile and a baseline plan.',
    parameters: ComputeScenarioDeltaInput,
    execute: wrapHandler(handleComputeScenarioDelta),
  }),

  get_jurisdiction_info: tool({
    description:
      'Get detailed tax rules for a specific jurisdiction. Returns estate tax brackets, ' +
      'gift tax rules, capital gains rules, residency tests, filing obligations, and sunset provisions.',
    parameters: GetJurisdictionInfoInput,
    execute: wrapHandler(handleGetJurisdictionInfo),
  }),

  get_treaty_info: tool({
    description:
      'Get treaty details between two jurisdictions. Returns per-asset-class taxing rights, ' +
      'relief method, tie-breaker rules, special provisions, and known gaps.',
    parameters: GetTreatyInfoInput,
    execute: wrapHandler(handleGetTreatyInfo),
  }),

  list_supported_jurisdictions: tool({
    description:
      'List all supported jurisdiction codes with coverage metadata.',
    parameters: z.object({}),
    execute: wrapHandler(handleListSupportedJurisdictions),
  }),

  flag_unknown_entity: tool({
    description:
      'Flag an unsupported jurisdiction, asset class, treaty, or rule for tracking. ' +
      'Use this when the user mentions something Copia does not yet support.',
    parameters: FlagUnknownEntityInput,
    execute: wrapHandler(handleFlagUnknownEntity),
  }),

  analyze_money_event: tool({
    description:
      'Analyze a cross-border money event (inheritance, property sale, business exit, etc.) ' +
      'for capital controls, tax cost stack, repatriation channels, and permitted actions. ' +
      'Requires a stored profile.',
    parameters: MoneyEventInput,
    execute: wrapHandler(handleAnalyzeMoneyEvent),
  }),

  compare_repatriation_scenarios: tool({
    description:
      'Compare different repatriation scenarios (channel + timing combinations) against ' +
      'the baseline mobility analysis. Requires a prior analyze_money_event call.',
    parameters: RepatriationScenarioInput,
    execute: wrapHandler(handleCompareRepatriationScenarios),
  }),

  map_permitted_actions: tool({
    description:
      'Get permitted and prohibited actions for funds in a source country, including ' +
      'restrictions, tax consequences, filing obligations, and repatriability.',
    parameters: PermittedActionsInput,
    execute: wrapHandler(handleMapPermittedActions),
  }),
};
