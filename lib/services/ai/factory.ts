import { AIProvider } from './base';
import { GeminiProvider } from './gemini';
import { OpenAIProvider } from './openai';
import { AnthropicProvider } from './anthropic';
import { aiConfig } from '@/lib/config/ai';

let cachedProvider: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  // Return cached provider if available and still valid
  if (cachedProvider && cachedProvider.isAvailable()) {
    return cachedProvider;
  }

  // Create new provider based on config
  const provider = aiConfig.provider;

  switch (provider) {
    case 'GEMINI':
      cachedProvider = new GeminiProvider();
      break;
    case 'OPENAI':
      cachedProvider = new OpenAIProvider();
      break;
    case 'ANTHROPIC':
      cachedProvider = new AnthropicProvider();
      break;
    default:
      console.warn(`Unknown AI provider: ${provider}, falling back to Gemini`);
      cachedProvider = new GeminiProvider();
  }

  if (!cachedProvider.isAvailable()) {
    throw new Error(
      `AI provider ${provider} is not available. Please check your API key configuration.`
    );
  }

  return cachedProvider;
}

export function resetAIProvider(): void {
  cachedProvider = null;
}

