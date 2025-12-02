export type AIProvider = 'GEMINI' | 'OPENAI' | 'ANTHROPIC';

export interface AIConfig {
  provider: AIProvider;
  chatModel: string;
  embeddingModel: string;
  summaryModel: string;
  temperature: number;
  maxTokens: number;
  maxContextTokens: number;
}

// Default configuration
const defaultConfig: AIConfig = {
  provider: (process.env.AI_PROVIDER as AIProvider) || 'GEMINI',
  chatModel: process.env.AI_CHAT_MODEL || 'gemini-2.5-pro',
  embeddingModel: process.env.AI_EMBEDDING_MODEL || 'text-embedding-004', // Gemini embedding model
  summaryModel: process.env.AI_SUMMARY_MODEL || 'gemini-2.5-pro',
  temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
  maxTokens: parseInt(process.env.AI_MAX_TOKENS || '8192', 10),
  maxContextTokens: parseInt(process.env.AI_MAX_CONTEXT_TOKENS || '100000', 10),
};

// Provider-specific model defaults
export const providerModels: Record<AIProvider, Partial<AIConfig>> = {
  GEMINI: {
    chatModel: 'gemini-2.5-pro',
    embeddingModel: 'text-embedding-004',
    summaryModel: 'gemini-2.5-pro',
    maxTokens: 8192,
    maxContextTokens: 2000000, // Gemini 2.5 Pro has 2M context window
  },
  OPENAI: {
    chatModel: 'gpt-4-turbo-preview',
    embeddingModel: 'text-embedding-3-large',
    summaryModel: 'gpt-4-turbo-preview',
    maxTokens: 4096,
    maxContextTokens: 128000, // GPT-4 Turbo has 128K context window
  },
  ANTHROPIC: {
    chatModel: 'claude-3-opus-20240229',
    embeddingModel: 'text-embedding-3-large', // Anthropic doesn't have embedding model, use OpenAI
    summaryModel: 'claude-3-opus-20240229',
    maxTokens: 4096,
    maxContextTokens: 200000, // Claude 3 Opus has 200K context window
  },
};

export function getAIConfig(): AIConfig {
  const provider = (process.env.AI_PROVIDER as AIProvider) || 'GEMINI';
  const providerDefaults = providerModels[provider] || {};

  return {
    ...defaultConfig,
    ...providerDefaults,
    provider,
    chatModel: process.env.AI_CHAT_MODEL || providerDefaults.chatModel || defaultConfig.chatModel,
    embeddingModel: process.env.AI_EMBEDDING_MODEL || providerDefaults.embeddingModel || defaultConfig.embeddingModel,
    summaryModel: process.env.AI_SUMMARY_MODEL || providerDefaults.summaryModel || defaultConfig.summaryModel,
    temperature: parseFloat(process.env.AI_TEMPERATURE || String(providerDefaults.temperature || defaultConfig.temperature)),
    maxTokens: parseInt(process.env.AI_MAX_TOKENS || String(providerDefaults.maxTokens || defaultConfig.maxTokens), 10),
    maxContextTokens: parseInt(process.env.AI_MAX_CONTEXT_TOKENS || String(providerDefaults.maxContextTokens || defaultConfig.maxContextTokens), 10),
  };
}

export const aiConfig = getAIConfig();

