import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

export type AIProvider = 'anthropic' | 'openai' | 'google';

const PROVIDER_MODELS: Record<AIProvider, { structured: string; text: string }> = {
  anthropic: { structured: 'claude-sonnet-4-20250514', text: 'claude-sonnet-4-20250514' },
  openai: { structured: 'gpt-4o', text: 'gpt-4o' },
  google: { structured: 'gemini-1.5-pro', text: 'gemini-1.5-pro' },
};

const VALID_PROVIDERS: AIProvider[] = ['anthropic', 'openai', 'google'];

/**
 * Read AI_PROVIDER env var, default to 'anthropic'.
 */
export function getProvider(): AIProvider {
  const envValue = process.env.AI_PROVIDER?.toLowerCase() ?? 'anthropic';
  if (VALID_PROVIDERS.includes(envValue as AIProvider)) {
    return envValue as AIProvider;
  }
  return 'anthropic';
}

/**
 * Return the appropriate Vercel AI SDK model instance for the given purpose.
 */
export function getModel(purpose: 'structured' | 'text') {
  const provider = getProvider();
  const modelId = PROVIDER_MODELS[provider][purpose];

  switch (provider) {
    case 'anthropic': {
      const anthropic = createAnthropic();
      return anthropic(modelId);
    }
    case 'openai': {
      const openai = createOpenAI();
      return openai(modelId);
    }
    case 'google': {
      const google = createGoogleGenerativeAI();
      return google(modelId);
    }
  }
}
