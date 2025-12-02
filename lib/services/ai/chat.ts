import { getAIProvider } from './factory';
import { vectorSearch, fallbackVectorSearch } from '@/lib/services/rag/vector-search';
import { buildContractContext, buildContractContextWithContent, formatContextForPrompt } from '@/lib/services/rag/context-builder';
import { ChatMessage, ChatOptions } from './base';
import { aiConfig } from '@/lib/config/ai';
import ContractChat from '@/lib/db/models/ContractChat';
import mongoose from 'mongoose';

export interface ChatRequest {
  contractId?: string;
  userId: string;
  sessionId: string;
  message: string;
  useRAG?: boolean;
}

export interface ChatResponse {
  response: string;
  sessionId: string;
  model: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

/**
 * Generate chat response with RAG
 */
export async function generateChatResponse(request: ChatRequest): Promise<ChatResponse> {
  const provider = getAIProvider();
  const useRAG = request.useRAG !== false; // Default to true

  let systemPrompt = 'Sen Türk hukuk sistemi için uzman bir sözleşme uzmanısın. Sözleşme detaylarını analiz edip sorulara profesyonel ve doğru cevaplar verirsin.';
  let contextText = '';

  // If RAG is enabled and contractId is provided, retrieve relevant context
  if (useRAG && request.contractId) {
    try {
      // First, try to get contract content directly (primary fallback)
      const Contract = (await import('@/lib/db/models/Contract')).default;
      const contract = await Contract.findById(request.contractId).lean();
      
      if (!contract || !contract.content) {
        console.warn(`[RAG] Contract ${request.contractId} not found or has no content`);
      }

      // Perform vector search
      let searchResults: any[] = [];
      let searchMethod = 'none';
      
      try {
        console.log(`[RAG] Attempting vector search for contract ${request.contractId} with query: "${request.message}"`);
        searchResults = await vectorSearch(request.message, request.contractId);
        searchMethod = 'vector';
        console.log(`[RAG] Vector search succeeded, found ${searchResults.length} results`);
      } catch (error: any) {
        // Fallback to cosine similarity if vector search is not available
        console.warn('[RAG] Vector search failed, using fallback:', error.message || error);
        try {
          searchResults = await fallbackVectorSearch(request.message, request.contractId);
          searchMethod = 'fallback';
          console.log(`[RAG] Fallback search succeeded, found ${searchResults.length} results`);
        } catch (fallbackError: any) {
          console.error('[RAG] Both vector search and fallback failed:', fallbackError.message || fallbackError);
          searchResults = [];
        }
      }

      // Build context - use search results if available, otherwise use full contract content
      if (searchResults.length > 0) {
        // Build context from search results
        console.log(`[RAG] Building context from ${searchResults.length} search results`);
        const context = await buildContractContext(request.contractId, searchResults);
        contextText = formatContextForPrompt(context);
        
        console.log(`[RAG] Context built successfully (${contextText.length} characters)`);
        systemPrompt += '\n\nAşağıdaki sözleşme bilgileri ve ilgili bölümler sana sağlanmıştır. Soruları bu bilgilere dayanarak cevapla. Eğer sorunun cevabı sağlanan bilgilerde yoksa, bunu açıkça belirt.';
      } else {
        // Don't load contract content here - it will be loaded on first message if needed
        console.log(`[RAG] No search results found, contract content will be loaded on first message if needed`);
        console.log(`[RAG] Search method used: ${searchMethod}`);
      }
    } catch (error: any) {
      console.error('[RAG] Error retrieving context for RAG:', error.message || error);
      console.error('[RAG] Stack:', error.stack);
      // Continue without context if RAG fails
    }
  }

  // Get chat history
  const chatHistory = await getChatHistory(request.sessionId);
  const isFirstMessage = chatHistory.length === 0;
  const messages: ChatMessage[] = [];

  // If this is the first message and we have contract content but no search results,
  // load contract content into the system prompt (like summary does)
  if (isFirstMessage && useRAG && request.contractId) {
    try {
      const Contract = (await import('@/lib/db/models/Contract')).default;
      const contract = await Contract.findById(request.contractId).lean();
      
      if (contract && contract.content) {
        // If we have search results, use them; otherwise use full content
        if (!contextText) {
          console.log(`[RAG] First message - loading full contract content (${contract.content.length} characters)`);
          const context = await buildContractContextWithContent(request.contractId, contract.content);
          contextText = formatContextForPrompt(context);
          
          console.log(`[RAG] Contract content loaded into system prompt (${contextText.length} characters)`);
          systemPrompt += '\n\nAşağıdaki sözleşme bilgileri ve tam içeriği sana sağlanmıştır. Soruları bu bilgilere dayanarak cevapla. Eğer sorunun cevabı sağlanan bilgilerde yoksa, bunu açıkça belirt.';
        } else {
          console.log(`[RAG] First message - using search results context`);
        }
      } else {
        console.warn(`[RAG] Contract ${request.contractId} has no content`);
      }
    } catch (error: any) {
      console.error('[RAG] Error loading contract content for first message:', error.message || error);
    }
  }

  // Add system prompt only if context is available (to avoid duplicate system prompts)
  // If no context, system prompt will be handled by the provider
  if (contextText) {
    messages.push({
      role: 'system',
      content: systemPrompt + '\n\n' + contextText,
    });
  }

  // Add chat history
  chatHistory.forEach(msg => {
    messages.push({
      role: msg.role,
      content: msg.content,
    });
  });

  // Add current message
  messages.push({
    role: 'user',
    content: request.message,
  });

  // Generate response
  const chatOptions: ChatOptions = {
    messages,
    systemPrompt: contextText ? undefined : systemPrompt, // Pass system prompt if no context
    temperature: 0.7,
    maxTokens: aiConfig.maxTokens,
  };

  const response = await provider.generateChat(chatOptions);

  // Save messages to chat history
  await saveChatMessage(request.sessionId, request.contractId, request.userId, {
    role: 'user',
    content: request.message,
  });

  await saveChatMessage(request.sessionId, request.contractId, request.userId, {
    role: 'assistant',
    content: response.content,
  });

  return {
    response: response.content,
    sessionId: request.sessionId,
    model: response.model,
    usage: response.usage,
  };
}

/**
 * Get chat history for a session
 */
export async function getChatHistory(sessionId: string): Promise<Array<{ role: 'user' | 'assistant'; content: string }>> {
  const chat = await ContractChat.findOne({ sessionId }).lean();
  
  if (!chat || !chat.messages) {
    return [];
  }

  // Return last 20 messages to avoid context overflow
  return chat.messages.slice(-20).map(msg => ({
    role: msg.role,
    content: msg.content,
  }));
}

/**
 * Save a message to chat history
 */
export async function saveChatMessage(
  sessionId: string,
  contractId: string | undefined,
  userId: string,
  message: { role: 'user' | 'assistant'; content: string }
): Promise<void> {
  await ContractChat.findOneAndUpdate(
    { sessionId },
    {
      $set: {
        userId: new mongoose.Types.ObjectId(userId),
        contractId: contractId ? new mongoose.Types.ObjectId(contractId) : undefined,
      },
      $push: {
        messages: {
          role: message.role,
          content: message.content,
          timestamp: new Date(),
        },
      },
    },
    { upsert: true, new: true }
  );
}

/**
 * Delete chat history for a session
 */
export async function deleteChatHistory(sessionId: string): Promise<void> {
  await ContractChat.deleteOne({ sessionId });
}

