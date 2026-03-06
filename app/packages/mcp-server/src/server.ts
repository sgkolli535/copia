import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';

import {
  ParseUserProfileInput,
  ComputeEstatePlanInput,
  ComputeScenarioDeltaInput,
  GetJurisdictionInfoInput,
  GetTreatyInfoInput,
  FlagUnknownEntityInput,
  MoneyEventInput,
  RepatriationScenarioInput,
  PermittedActionsInput,
} from './schemas/index.js';

import { handleParseUserProfile } from './tools/parse-user-profile.js';
import { handleGetApplicableRules } from './tools/get-applicable-rules.js';
import { handleComputeEstatePlan } from './tools/compute-estate-plan.js';
import { handleComputeScenarioDelta } from './tools/compute-scenario-delta.js';
import { handleGetJurisdictionInfo } from './tools/get-jurisdiction-info.js';
import { handleGetTreatyInfo } from './tools/get-treaty-info.js';
import { handleListSupportedJurisdictions } from './tools/list-supported-jurisdictions.js';
import { handleFlagUnknownEntity } from './tools/flag-unknown-entity.js';
import { handleAnalyzeMoneyEvent } from './tools/analyze-money-event.js';
import { handleCompareRepatriationScenarios } from './tools/compare-repatriation-scenarios.js';
import { handleMapPermittedActions } from './tools/map-permitted-actions.js';

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

const TOOLS = [
  {
    name: 'parse_user_profile',
    description:
      'Validate and store a user profile for estate planning analysis. ' +
      'Accepts personal details, citizenships, residencies, assets, and family members. ' +
      'The profile is stored in the session for subsequent tool calls.',
    inputSchema: zodToJsonSchema(ParseUserProfileInput),
  },
  {
    name: 'get_applicable_rules',
    description:
      'Get jurisdiction rules and treaty edges applicable to the stored profile. ' +
      'Returns a summary of estate tax, gift tax, capital gains tax rules, and treaty ' +
      'relief for every jurisdiction involved in the profile. Requires a profile to be stored first.',
    inputSchema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'compute_estate_plan',
    description:
      'Compute a full estate plan with liabilities, conflicts, and treaty relief. ' +
      'Runs the rule engine pipeline on the stored profile and returns a detailed PlanResult ' +
      'including per-jurisdiction liabilities, identified conflicts, treaty applications, ' +
      'and filing obligations. Requires a profile to be stored first.',
    inputSchema: zodToJsonSchema(ComputeEstatePlanInput),
  },
  {
    name: 'compute_scenario_delta',
    description:
      'Compare a scenario modification against the baseline plan. ' +
      'Accepts a modification (relocate, gift_asset, restructure_ownership, change_timing, ' +
      'add_jurisdiction, spousal_planning) and returns the delta analysis showing changes ' +
      'in liabilities, new/resolved conflicts, and trade-offs. Requires both a stored profile ' +
      'and a baseline plan.',
    inputSchema: zodToJsonSchema(ComputeScenarioDeltaInput),
  },
  {
    name: 'get_jurisdiction_info',
    description:
      'Get detailed tax rules for a specific jurisdiction. ' +
      'Returns estate tax brackets, gift tax rules, capital gains tax rules, ' +
      'residency tests, filing obligations, and sunset provisions for the given country code.',
    inputSchema: zodToJsonSchema(GetJurisdictionInfoInput),
  },
  {
    name: 'get_treaty_info',
    description:
      'Get treaty details between two jurisdictions. ' +
      'Returns the full treaty edge including per-asset-class taxing rights, relief method, ' +
      'tie-breaker rules, special provisions, and known gaps in coverage.',
    inputSchema: zodToJsonSchema(GetTreatyInfoInput),
  },
  {
    name: 'list_supported_jurisdictions',
    description:
      'List all supported jurisdiction codes with coverage metadata. ' +
      'Returns the set of country codes supported by Copia along with a summary of ' +
      'tax coverage, treaty counts, and data freshness for each.',
    inputSchema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'flag_unknown_entity',
    description:
      'Flag an unsupported jurisdiction, asset class, treaty, or rule for tracking. ' +
      'Use this when the user mentions a jurisdiction, asset class, treaty, or rule ' +
      'that Copia does not yet support. The entity is recorded in the session for review.',
    inputSchema: zodToJsonSchema(FlagUnknownEntityInput),
  },
  {
    name: 'analyze_money_event',
    description:
      'Analyze a cross-border money event (inheritance, property sale, business exit, etc.) ' +
      'for capital controls, tax cost stack, repatriation channels, and permitted actions. ' +
      'Requires a stored profile. Returns status determination, 5-layer cost stack, ' +
      'repatriation channel options, and permitted/prohibited actions with citations.',
    inputSchema: zodToJsonSchema(MoneyEventInput),
  },
  {
    name: 'compare_repatriation_scenarios',
    description:
      'Compare different repatriation scenarios (channel + timing combinations) against ' +
      'the baseline mobility analysis. Requires a prior analyze_money_event call. ' +
      'Returns side-by-side comparison of costs and timelines for each scenario.',
    inputSchema: zodToJsonSchema(RepatriationScenarioInput),
  },
  {
    name: 'map_permitted_actions',
    description:
      'Get permitted and prohibited actions for funds in a source country, including ' +
      'what can be done in the source country, destination country, and third countries. ' +
      'Shows restrictions, tax consequences, filing obligations, and repatriability for each action.',
    inputSchema: zodToJsonSchema(PermittedActionsInput),
  },
] as const;

// ---------------------------------------------------------------------------
// Handler dispatch
// ---------------------------------------------------------------------------

type ToolName = (typeof TOOLS)[number]['name'];

const handlers: Record<ToolName, (args: unknown) => Promise<string>> = {
  parse_user_profile: handleParseUserProfile,
  get_applicable_rules: handleGetApplicableRules,
  compute_estate_plan: handleComputeEstatePlan,
  compute_scenario_delta: handleComputeScenarioDelta,
  get_jurisdiction_info: handleGetJurisdictionInfo,
  get_treaty_info: handleGetTreatyInfo,
  list_supported_jurisdictions: handleListSupportedJurisdictions,
  flag_unknown_entity: handleFlagUnknownEntity,
  analyze_money_event: handleAnalyzeMoneyEvent,
  compare_repatriation_scenarios: handleCompareRepatriationScenarios,
  map_permitted_actions: handleMapPermittedActions,
};

// ---------------------------------------------------------------------------
// Server setup
// ---------------------------------------------------------------------------

const server = new Server(
  {
    name: 'copia-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// List tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: TOOLS.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    })),
  };
});

// Call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  const handler = handlers[name as ToolName];
  if (!handler) {
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            error: `Unknown tool: ${name}`,
            availableTools: TOOLS.map((t) => t.name),
          }),
        },
      ],
      isError: true,
    };
  }

  try {
    const result = await handler(args);
    return {
      content: [
        {
          type: 'text' as const,
          text: result,
        },
      ],
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ error: message }),
        },
      ],
      isError: true,
    };
  }
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Copia MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error starting Copia MCP server:', error);
  process.exit(1);
});
