export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  messages: ChatMessage[];
}

export interface ChatResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

export interface EmbeddingOptions {
  text: string | string[];
  model?: string;
}

export interface EmbeddingResponse {
  embeddings: number[][];
  model: string;
  usage?: {
    totalTokens?: number;
  };
}

export interface SummaryOptions {
  content: string;
  maxLength?: number;
  focus?: string[];
}

export interface SummaryResponse {
  summary: string;
  model: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

export interface AIProvider {
  /**
   * Generate a chat response
   */
  generateChat(options: ChatOptions): Promise<ChatResponse>;

  /**
   * Generate embeddings for text
   */
  generateEmbedding(options: EmbeddingOptions): Promise<EmbeddingResponse>;

  /**
   * Generate a summary of content
   */
  generateSummary(options: SummaryOptions): Promise<SummaryResponse>;

  /**
   * Get the provider name
   */
  getName(): string;

  /**
   * Check if the provider is available (API key configured)
   */
  isAvailable(): boolean;
}

