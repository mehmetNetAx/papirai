import OpenAI from 'openai';
import { AIProvider, ChatOptions, ChatResponse, EmbeddingOptions, EmbeddingResponse, SummaryOptions, SummaryResponse } from './base';
import { aiConfig } from '@/lib/config/ai';

const openaiApiKey = process.env.OPENAI_API_KEY?.trim();

export class OpenAIProvider implements AIProvider {
  private client: OpenAI | null;
  private config: typeof aiConfig;

  constructor() {
    this.config = aiConfig;
    this.client = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;
  }

  getName(): string {
    return 'OPENAI';
  }

  isAvailable(): boolean {
    return !!this.client && !!openaiApiKey;
  }

  async generateChat(options: ChatOptions): Promise<ChatResponse> {
    if (!this.client) {
      throw new Error('OpenAI API key is not configured');
    }

    // Convert messages to OpenAI format
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];

    if (options.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }

    for (const msg of options.messages) {
      if (msg.role === 'system' && !options.systemPrompt) {
        messages.push({ role: 'system', content: msg.content });
      } else if (msg.role === 'user' || msg.role === 'assistant') {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    const completion = await this.client.chat.completions.create({
      model: this.config.chatModel,
      messages: messages as any,
      temperature: options.temperature ?? this.config.temperature,
      max_tokens: options.maxTokens ?? this.config.maxTokens,
    });

    const message = completion.choices[0]?.message?.content || '';
    const usage = completion.usage ? {
      promptTokens: completion.usage.prompt_tokens,
      completionTokens: completion.usage.completion_tokens,
      totalTokens: completion.usage.total_tokens,
    } : undefined;

    return {
      content: message,
      model: this.config.chatModel,
      usage,
    };
  }

  async generateEmbedding(options: EmbeddingOptions): Promise<EmbeddingResponse> {
    if (!this.client) {
      throw new Error('OpenAI API key is not configured');
    }

    const texts = Array.isArray(options.text) ? options.text : [options.text];
    const model = options.model || this.config.embeddingModel;

    const response = await this.client.embeddings.create({
      model,
      input: texts,
    });

    const embeddings = response.data.map(item => item.embedding);
    const usage = response.usage ? {
      totalTokens: response.usage.total_tokens,
    } : undefined;

    return {
      embeddings,
      model,
      usage,
    };
  }

  async generateSummary(options: SummaryOptions): Promise<SummaryResponse> {
    if (!this.client) {
      throw new Error('OpenAI API key is not configured');
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

    const completion = await this.client.chat.completions.create({
      model: this.config.summaryModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: Math.min(maxLength * 2, 2000), // Estimate tokens
    });

    const summary = completion.choices[0]?.message?.content || '';
    const usage = completion.usage ? {
      promptTokens: completion.usage.prompt_tokens,
      completionTokens: completion.usage.completion_tokens,
      totalTokens: completion.usage.total_tokens,
    } : undefined;

    return {
      summary,
      model: this.config.summaryModel,
      usage,
    };
  }
}

