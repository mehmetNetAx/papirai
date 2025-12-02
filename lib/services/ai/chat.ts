import { getAIProvider } from './factory';
import { buildContractContextWithContent, formatContextForPrompt } from '@/lib/services/rag/context-builder';
import { ChatMessage, ChatOptions } from './base';
import { aiConfig } from '@/lib/config/ai';
import ContractChat from '@/lib/db/models/ContractChat';
import mongoose from 'mongoose';

export interface ChatRequest {
  contractId?: string;
  userId: string;
  sessionId: string;
  message: string;
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
 * Generate chat response with contract content
 */
export async function generateChatResponse(request: ChatRequest): Promise<ChatResponse> {
  console.log(`\n\n[Chat] ==========================================`);
  console.log(`[Chat] ===== GENERATE CHAT RESPONSE START =====`);
  console.log(`[Chat] ContractId: ${request.contractId || 'NOT PROVIDED'}`);
  console.log(`[Chat] UserId: ${request.userId}`);
  console.log(`[Chat] SessionId: ${request.sessionId}`);
  console.log(`[Chat] Message: ${request.message.substring(0, 100)}...`);
  console.log(`[Chat] ==========================================\n\n`);
  
  const provider = getAIProvider();

  let systemPrompt = 'Sen Türk hukuk sistemi için uzman bir sözleşme uzmanısın. Sözleşme detaylarını analiz edip sorulara profesyonel ve doğru cevaplar verirsin.';
  let contextText = '';

  // If contractId is provided, load contract content directly
  if (request.contractId) {
    try {
      console.log(`[Chat] ===== START: Loading contract content for contractId: ${request.contractId} =====`);
      const Contract = (await import('@/lib/db/models/Contract')).default;
      const contract = await Contract.findById(request.contractId).lean();
      
      if (!contract) {
        console.error(`[Chat] ERROR: Contract ${request.contractId} not found in database`);
      } else if (!contract.content) {
        console.error(`[Chat] ERROR: Contract ${request.contractId} found but has no content field`);
        console.log(`[Chat] Contract fields:`, Object.keys(contract));
      } else {
        console.log(`[Chat] ✓ Contract found: ${contract.title || 'No title'}`);
        console.log(`[Chat] ✓ Contract content length: ${contract.content.length} characters`);
        console.log(`[Chat] ✓ Contract content preview (first 500 chars): ${contract.content.substring(0, 500)}...`);
        console.log(`[Chat] ✓ Contract content is JSON: ${contract.content.trim().startsWith('{') || contract.content.trim().startsWith('[')}`);
        
        // Build context from contract content
        console.log(`[Chat] Building context from contract content...`);
        try {
          const context = await buildContractContextWithContent(request.contractId, contract.content);
          console.log(`[Chat] ✓ Context built successfully`);
          console.log(`[Chat] Context metadata:`, {
            title: context.contractMetadata.title,
            contractType: context.contractMetadata.contractType,
            chunksCount: context.relevantChunks.length,
            firstChunkLength: context.relevantChunks[0]?.text?.length || 0,
            firstChunkPreview: context.relevantChunks[0]?.text?.substring(0, 200) || 'NO TEXT',
          });
          
          contextText = formatContextForPrompt(context);
          console.log(`[Chat] ✓✓✓ Context formatted for prompt ✓✓✓`);
          console.log(`[Chat] ✓ Formatted context length: ${contextText.length} characters`);
          if (contextText.length === 0) {
            console.error(`[Chat] ⚠⚠⚠ ERROR: Formatted context is EMPTY! ⚠⚠⚠`);
          } else {
            console.log(`[Chat] ✓ Formatted context preview (first 1000 chars):\n${contextText.substring(0, 1000)}...`);
          }
          
          systemPrompt += '\n\nAşağıdaki sözleşme bilgileri ve tam içeriği sana sağlanmıştır. Soruları bu bilgilere dayanarak cevapla. Eğer sorunun cevabı sağlanan bilgilerde yoksa, bunu açıkça belirt.';
          console.log(`[Chat] ✓ System prompt updated with context instruction`);
        } catch (contextError: any) {
          console.error(`[Chat] ⚠⚠⚠ ERROR building context: ${contextError.message} ⚠⚠⚠`);
          console.error(`[Chat] Stack:`, contextError.stack);
          throw contextError; // Re-throw to be caught by outer catch
        }
      }
      console.log(`[Chat] ===== END: Loading contract content =====`);
    } catch (error: any) {
      console.error(`\n\n[Chat] ⚠⚠⚠ CRITICAL ERROR: Exception while loading contract content ⚠⚠⚠`);
      console.error(`[Chat] Error message: ${error.message || error}`);
      console.error(`[Chat] Error stack:`, error.stack);
      console.error(`[Chat] ContractId was: ${request.contractId}`);
      console.error(`[Chat] ⚠⚠⚠ Continuing WITHOUT contract context - THIS WILL CAUSE GENERIC RESPONSES ⚠⚠⚠\n\n`);
      // Continue without context if loading fails
      contextText = ''; // Ensure it's empty
    }
  } else {
    console.error(`\n\n[Chat] ⚠⚠⚠ WARNING: No contractId provided, chat will proceed without contract context ⚠⚠⚠\n\n`);
  }
  
  console.log(`[Chat] ===== AFTER CONTENT LOADING =====`);
  console.log(`[Chat] ContextText length: ${contextText?.length || 0}`);
  console.log(`[Chat] ContextText is empty: ${!contextText || contextText.length === 0}`);
  console.log(`[Chat] =================================\n\n`);

  // Get chat history
  const chatHistory = await getChatHistory(request.sessionId);
  const messages: ChatMessage[] = [];

  // Add system prompt (keep it short and focused)
  const isFirstMessage = chatHistory.length === 0;
  
  // Don't add system message to messages array - it will be passed via systemPrompt in ChatOptions
  // This is important for Gemini which uses systemInstruction
  if (contextText && contextText.length > 0) {
    console.log(`[Chat] ✓✓✓ Contract context available, will be passed via systemPrompt ✓✓✓`);
    console.log(`[Chat] Contract context length: ${contextText.length} characters`);
  } else {
    console.error(`[Chat] ⚠⚠⚠ CRITICAL WARNING: No contract context available ⚠⚠⚠`);
    console.error(`[Chat] Context text is empty or undefined!`);
    console.error(`[Chat] ContractId was: ${request.contractId}`);
  }

  // Add chat history
  console.log(`[Chat] Chat history length: ${chatHistory.length} messages`);
  chatHistory.forEach((msg, index) => {
    console.log(`[Chat] History message ${index + 1}: ${msg.role} - ${msg.content.substring(0, 100)}...`);
    messages.push({
      role: msg.role,
      content: msg.content,
    });
  });

  // Add current message
  console.log(`[Chat] User message: ${request.message}`);
  messages.push({
    role: 'user',
    content: request.message,
  });

  // Log final messages array
  console.log(`[Chat] ===== FINAL MESSAGES ARRAY =====`);
  console.log(`[Chat] Total messages: ${messages.length}`);
  messages.forEach((msg, index) => {
    const preview = msg.content.substring(0, 200);
    console.log(`[Chat] Message ${index + 1} [${msg.role}]: ${preview}${msg.content.length > 200 ? '...' : ''} (${msg.content.length} chars)`);
  });
  console.log(`[Chat] ===== END FINAL MESSAGES ARRAY =====`);

  // Generate response
  // For Gemini: pass contract content as systemPrompt so it goes to systemInstruction
  const chatOptions: ChatOptions = {
    messages,
    systemPrompt: contextText && contextText.length > 0 
      ? `${systemPrompt}\n\nÖNEMLİ: Aşağıdaki sözleşme içeriği sana sağlanmıştır. TÜM sorulara SADECE bu sözleşmeye göre cevap ver:\n\n${contextText}`
      : systemPrompt,
    temperature: 0.7,
    maxTokens: aiConfig.maxTokens,
  };

  console.log(`[Chat] Calling AI provider with ${messages.length} messages...`);
  if (contextText && contextText.length > 0) {
    console.log(`[Chat] ✓✓✓ SystemPrompt includes contract content (${chatOptions.systemPrompt!.length} chars) ✓✓✓`);
  }
  const response = await provider.generateChat(chatOptions);
  console.log(`[Chat] ✓ AI response received (${response.content.length} characters)`);
  console.log(`[Chat] AI response preview: ${response.content.substring(0, 200)}...`);

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

