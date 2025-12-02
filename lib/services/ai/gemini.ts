import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIProvider, ChatOptions, ChatResponse, EmbeddingOptions, EmbeddingResponse, SummaryOptions, SummaryResponse } from './base';
import { aiConfig } from '@/lib/config/ai';

const geminiApiKey = process.env.GEMINI_API_KEY?.trim();

export class GeminiProvider implements AIProvider {
  private genAI: GoogleGenerativeAI | null;
  private config: typeof aiConfig;

  constructor() {
    this.config = aiConfig;
    this.genAI = geminiApiKey ? new GoogleGenerativeAI(geminiApiKey) : null;
  }

  getName(): string {
    return 'GEMINI';
  }

  isAvailable(): boolean {
    return !!this.genAI && !!geminiApiKey;
  }

  async generateChat(options: ChatOptions): Promise<ChatResponse> {
    if (!this.genAI) {
      throw new Error('Gemini API key is not configured');
    }

    const model = this.genAI.getGenerativeModel({
      model: options.systemPrompt ? this.config.chatModel : this.config.chatModel,
      systemInstruction: options.systemPrompt || 'Sen Türk hukuk sistemi için uzman bir sözleşme uzmanısın. Sözleşme detaylarını analiz edip sorulara profesyonel ve doğru cevaplar verirsin.',
    });

    // Convert messages to Gemini format
    // Gemini expects parts to be an array of objects with 'text' property
    const history: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];
    let currentUserMessage = '';
    let lastRole: 'user' | 'assistant' | 'system' | null = null;

    for (const msg of options.messages) {
      if (msg.role === 'system') {
        // System messages are handled via systemInstruction
        continue;
      }

      if (msg.role === 'user') {
        if (lastRole === 'user') {
          // Combine consecutive user messages
          currentUserMessage += '\n\n' + msg.content;
        } else {
          if (currentUserMessage) {
            history.push({ 
              role: lastRole === 'assistant' ? 'model' : 'user', 
              parts: [{ text: currentUserMessage }] 
            });
          }
          currentUserMessage = msg.content;
        }
        lastRole = 'user';
      } else if (msg.role === 'assistant') {
        if (currentUserMessage) {
          history.push({ role: 'user', parts: [{ text: currentUserMessage }] });
          currentUserMessage = '';
        }
        history.push({ role: 'model', parts: [{ text: msg.content }] });
        lastRole = 'assistant';
      }
    }

    if (currentUserMessage) {
      history.push({ role: 'user', parts: [{ text: currentUserMessage }] });
    }

    // Get the last user message (the current query)
    const lastUserMessage = options.messages.filter(m => m.role === 'user').pop()?.content || '';
    const chatHistory = history.slice(0, -1); // All but the last message

    const chat = model.startChat({
      history: chatHistory,
      generationConfig: {
        temperature: options.temperature ?? this.config.temperature,
        maxOutputTokens: options.maxTokens ?? this.config.maxTokens,
      },
    });

    const result = await chat.sendMessage(lastUserMessage);
    const response = await result.response;
    const text = response.text();

    // Extract usage information if available
    const usage = response.usageMetadata ? {
      promptTokens: response.usageMetadata.promptTokenCount,
      completionTokens: response.usageMetadata.candidatesTokenCount,
      totalTokens: response.usageMetadata.totalTokenCount,
    } : undefined;

    return {
      content: text,
      model: this.config.chatModel,
      usage,
    };
  }

  async generateEmbedding(options: EmbeddingOptions): Promise<EmbeddingResponse> {
    if (!this.genAI) {
      throw new Error('Gemini API key is not configured');
    }

    // Gemini uses text-embedding-004 model (768 dimensions)
    const model = this.genAI.getGenerativeModel({ model: 'text-embedding-004' });

    const texts = Array.isArray(options.text) ? options.text : [options.text];
    const embeddings: number[][] = [];

    // Process texts (Gemini supports batch embedding)
    for (const text of texts) {
      try {
        const result = await model.embedContent(text);
        const embedding = result.embedding.values;
        const embeddingArray = Array.from(embedding);
        
        // Validate embedding
        if (embeddingArray.length === 0) {
          throw new Error('Empty embedding returned');
        }
        
        embeddings.push(embeddingArray);
      } catch (error: any) {
        console.error('Error generating embedding for text:', error);
        throw new Error(`Failed to generate embedding: ${error.message}`);
      }
    }

    return {
      embeddings,
      model: 'text-embedding-004',
    };
  }

  async generateSummary(options: SummaryOptions): Promise<SummaryResponse> {
    if (!this.genAI) {
      throw new Error('Gemini API key is not configured');
    }

    const model = this.genAI.getGenerativeModel({
      model: this.config.summaryModel,
      systemInstruction: 'Sen bir sözleşme özetleme uzmanısın. Sözleşme metinlerini özetlerken önemli noktaları, tarihleri, tarafları, yükümlülükleri ve kritik maddeleri vurgularsın.',
    });

    const maxLength = options.maxLength || 500;
    const focus = options.focus && options.focus.length > 0 
      ? `\nÖzellikle şu konulara odaklan: ${options.focus.join(', ')}`
      : '';

    const prompt = `Aşağıdaki sözleşme metnini ${maxLength} kelimeyi geçmeyecek şekilde özetle. Önemli tarihler, taraflar, yükümlülükler, ödeme koşulları, fesih maddeleri ve kritik hükümleri mutlaka dahil et.${focus}

Sözleşme Metni:
${options.content}

Özet:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const summary = response.text();

    const usage = response.usageMetadata ? {
      promptTokens: response.usageMetadata.promptTokenCount,
      completionTokens: response.usageMetadata.candidatesTokenCount,
      totalTokens: response.usageMetadata.totalTokenCount,
    } : undefined;

    return {
      summary,
      model: this.config.summaryModel,
      usage,
    };
  }
}

