import { computeEstatePlan } from '@copia/rule-engine';
import { getJurisdiction, getTreaty, listJurisdictions } from '@copia/data-service';
import type { UserProfile, CountryCode, PlanResult, MobilityAnalysisResult } from '@copia/types';

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? `API error ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  text: string;
  toolCalls: Array<{ toolName: string; args: unknown; result: unknown }>;
  sanityIssues: string[];
  citationIssues: string[];
  confidenceIssues: string[];
}

export const api = {
  /** Agentic chat — AI orchestrates MCP tools and narrates results */
  chat: async (messages: ChatMessage[], sessionId?: string) => {
    return postJson<ChatResponse>('/api/chat', { messages, sessionId });
  },

  computePlan: (profile: UserProfile) => computeEstatePlan(profile),
  narratePlan: async (plan: PlanResult) => {
    const { narration } = await postJson<{ narration: string }>('/api/narrate-plan', { plan });
    return narration;
  },
  narrateMobility: async (result: MobilityAnalysisResult) => {
    const { narration } = await postJson<{ narration: string }>('/api/narrate-mobility', { result });
    return narration;
  },
  parseMoneyEvent: async (input: string, context?: string) => {
    return postJson('/api/parse-money-event', { input, context });
  },
  suggestScenarios: async (plan: PlanResult) => {
    const { suggestions } = await postJson<{ suggestions: unknown[] }>('/api/suggest-scenarios', { plan });
    return suggestions;
  },
  getJurisdiction: (code: CountryCode) => getJurisdiction(code),
  getTreaty: (c1: CountryCode, c2: CountryCode) => getTreaty(c1, c2),
  listJurisdictions: () => listJurisdictions(),
};
