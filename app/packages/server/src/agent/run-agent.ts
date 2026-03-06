import { generateText, type CoreMessage } from 'ai';
import { getModel, sanityCheck, checkCitations, checkConfidence, buildContext } from '@copia/ai-layer';
import { getSession, clearSession } from '@copia/mcp-server';
import { loadProfileJurisdictions, loadProfileTreaties } from '@copia/rule-engine';
import { agentTools } from './tools.js';
import { AGENT_SYSTEM_PROMPT } from './system-prompt.js';

export interface AgentResponse {
  text: string;
  toolCalls: Array<{ toolName: string; args: unknown; result: unknown }>;
  sanityIssues: string[];
  citationIssues: string[];
  confidenceIssues: string[];
}

/**
 * Run the agentic loop: model plans tool calls, executes them via MCP handlers,
 * repeats until the model produces a final narration.
 */
export async function runAgent(
  messages: CoreMessage[],
  sessionId: string = 'default',
): Promise<AgentResponse> {
  const model = getModel('text');

  // Build dynamic context if a profile exists in the session
  const session = getSession(sessionId);
  let systemPrompt = AGENT_SYSTEM_PROMPT;
  if (session.profile) {
    const { jurisdictions: jMap } = loadProfileJurisdictions(session.profile);
    const jurisdictions = [...jMap.values()];
    const { treaties } = loadProfileTreaties(session.profile);
    const dynamicContext = buildContext({
      profile: session.profile,
      rules: jurisdictions,
      treaties,
      scenarioStack: [],
      conversationSummary: '',
    });
    systemPrompt = AGENT_SYSTEM_PROMPT + '\n\n---\n\n' + dynamicContext;
  }

  const result = await generateText({
    model,
    system: systemPrompt,
    messages,
    tools: agentTools,
    maxSteps: 10,
  });

  // Collect all tool calls across steps for the audit trail
  const toolCalls: AgentResponse['toolCalls'] = [];
  for (const step of result.steps) {
    for (const tc of step.toolCalls) {
      const matching = step.toolResults.find((tr) => tr.toolCallId === tc.toolCallId);
      toolCalls.push({
        toolName: tc.toolName,
        args: tc.args,
        result: matching?.result,
      });
    }
  }

  // Run all guardrails if a plan was computed
  let sanityIssues: string[] = [];
  let citationIssues: string[] = [];
  let confidenceIssues: string[] = [];
  const currentSession = getSession(sessionId);
  if (currentSession.plan) {
    sanityIssues = sanityCheck(currentSession.plan).issues;
    citationIssues = checkCitations(result.text, currentSession.plan).issues;
    confidenceIssues = checkConfidence(result.text, currentSession.plan).issues;
  }

  return {
    text: result.text,
    toolCalls,
    sanityIssues,
    citationIssues,
    confidenceIssues,
  };
}
