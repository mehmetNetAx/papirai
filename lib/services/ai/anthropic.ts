import Anthropic from '@anthropic-ai/sdk';
import { AIProvider, ChatOptions, ChatResponse, EmbeddingOptions, EmbeddingResponse, SummaryOptions, SummaryResponse } from './base';
import { aiConfig } from '@/lib/config/ai';

const anthropicApiKey = process.env.ANTHROPIC_API_KEY?.trim();

export class AnthropicProvider implements AIProvider {
  private client: Anthropic | null;
  private config: typeof aiConfig;

  constructor() {
    this.config = aiConfig;
    this.client = anthropicApiKey ? new Anthropic({ apiKey: anthropicApiKey }) : null;
  }

  getName(): string {
    return 'ANTHROPIC';
  }

  isAvailable(): boolean {
    return !!this.client && !!anthropicApiKey;
  }

  async generateChat(options: ChatOptions): Promise<ChatResponse> {
    if (!this.client) {
      throw new Error('Anthropic API key is not configured');
    }

    // Convert messages to Anthropic format
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
    let systemPrompt = options.systemPrompt || 'Sen Türk hukuk sistemi için uzman bir sözleşme uzmanısın. Sözleşme detaylarını analiz edip sorulara profesyonel ve doğru cevaplar verirsin.';

    for (const msg of options.messages) {
      if (msg.role === 'system') {
        systemPrompt = msg.content;
      } else if (msg.role === 'user' || msg.role === 'assistant') {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    const response = await this.client.messages.create({
      model: this.config.chatModel,
      max_tokens: options.maxTokens ?? this.config.maxTokens,
      temperature: options.temperature ?? this.config.temperature,
      system: systemPrompt,
      messages: messages as any,
    });

    const content = response.content[0];
    const text = content.type === 'text' ? content.text : '';

    const usage = response.usage ? {
      promptTokens: response.usage.input_tokens,
      completionTokens: response.usage.output_tokens,
      totalTokens: response.usage.input_tokens + response.usage.output_tokens,
    } : undefined;

    return {
      content: text,
      model: this.config.chatModel,
      usage,
    };
  }

  async generateEmbedding(options: EmbeddingOptions): Promise<EmbeddingResponse> {
    // Anthropic doesn't have an embedding model, so we'll use OpenAI's embedding model
    // This is a fallback - in production, you might want to use a different provider for embeddings
    throw new Error('Anthropic does not provide embedding models. Please use OpenAI or Gemini for embeddings.');
  }

  async generateSummary(options: SummaryOptions): Promise<SummaryResponse> {
    if (!this.client) {
      throw new Error('Anthropic API key is not configured');
    }

    const maxLength = options.maxLength || 500;
    const focus = options.focus && options.focus.length > 0 
      ? `\nÖzellikle şu konulara odaklan: ${options.focus.join(', ')}`
      : '';

    const systemPrompt = 'Sen bir sözleşme özetleme uzmanısın. Sözleşme metinlerini özetlerken önemli noktaları, tarihleri, tarafları, yükümlülükleri ve kritik maddeleri vurgularsın.';

    const prompt = `Aşağıdaki sözleşme metnini ${maxLength} kelimeyi geçmeyecek şekilde özetle. Önemli tarihler, taraflar, yükümlülükler, ödeme koşulları, fesih maddeleri ve kritik hükümleri mutlaka dahil et.${focus}

Sözleşme Metni:
${options.content}

Özet:`;

    const response = await this.client.messages.create({
      model: this.config.summaryModel,
      max_tokens: Math.min(maxLength * 2, 2000),
      temperature: 0.7,
      system: systemPrompt,
      messages: [
        { role: 'user', content: prompt },
      ],
    });

    const content = response.content[0];
    const summary = content.type === 'text' ? content.text : '';

    const usage = response.usage ? {
      promptTokens: response.usage.input_tokens,
      completionTokens: response.usage.output_tokens,
      totalTokens: response.usage.input_tokens + response.usage.output_tokens,
    } : undefined;

    return {
      summary,
      model: this.config.summaryModel,
      usage,
    };
  }
}

