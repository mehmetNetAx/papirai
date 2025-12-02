import Contract from '@/lib/db/models/Contract';
import ContractVariable from '@/lib/db/models/ContractVariable';
import { SearchResult } from './vector-search';
import { htmlToText } from './chunker';
import mongoose from 'mongoose';

export interface ContractContext {
  contractMetadata: {
    title: string;
    contractType?: string;
    counterparty?: string;
    startDate?: Date;
    endDate?: Date;
    value?: number;
    currency?: string;
    status: string;
  };
  variables: Array<{
    name: string;
    value: string | number | Date;
    type: string;
  }>;
  relevantChunks: Array<{
    text: string;
    index: number;
    score?: number;
  }>;
}

/**
 * Build context from search results and contract metadata
 */
export async function buildContractContext(
  contractId: string,
  searchResults: SearchResult[]
): Promise<ContractContext> {
  // Get contract metadata
  const contract = await Contract.findById(contractId)
    .populate('companyId', 'name')
    .populate('counterpartyId', 'name')
    .lean();

  if (!contract) {
    throw new Error('Contract not found');
  }

  // Get contract variables
  const variables = await ContractVariable.find({
    contractId: new mongoose.Types.ObjectId(contractId),
  }).lean();

  // Extract relevant chunks
  const relevantChunks = searchResults.map(result => ({
    text: result.chunk.text,
    index: result.chunk.index,
    score: result.score,
  }));

  // Build context
  const context: ContractContext = {
    contractMetadata: {
      title: contract.title,
      contractType: contract.contractType,
      counterparty: contract.counterparty || (contract.counterpartyId as any)?.name,
      startDate: contract.startDate,
      endDate: contract.endDate,
      value: contract.value,
      currency: contract.currency,
      status: contract.status,
    },
    variables: variables.map((v: any) => ({
      name: v.name,
      value: v.value,
      type: v.type,
    })),
    relevantChunks,
  };

  return context;
}

/**
 * Format context into a prompt-friendly string
 */
export function formatContextForPrompt(context: ContractContext): string {
  console.log(`[ContextBuilder] ===== START: Formatting context for prompt =====`);
  
  let prompt = `Sözleşme Bilgileri:\n`;
  prompt += `Başlık: ${context.contractMetadata.title}\n`;
  
  if (context.contractMetadata.contractType) {
    prompt += `Sözleşme Tipi: ${context.contractMetadata.contractType}\n`;
  }
  
  if (context.contractMetadata.counterparty) {
    prompt += `Karşı Taraf: ${context.contractMetadata.counterparty}\n`;
  }
  
  if (context.contractMetadata.startDate) {
    prompt += `Başlangıç Tarihi: ${new Date(context.contractMetadata.startDate).toLocaleDateString('tr-TR')}\n`;
  }
  
  if (context.contractMetadata.endDate) {
    prompt += `Bitiş Tarihi: ${new Date(context.contractMetadata.endDate).toLocaleDateString('tr-TR')}\n`;
  }
  
  if (context.contractMetadata.value) {
    prompt += `Değer: ${context.contractMetadata.value} ${context.contractMetadata.currency || 'USD'}\n`;
  }
  
  prompt += `Durum: ${context.contractMetadata.status}\n\n`;

  if (context.variables.length > 0) {
    prompt += `Önemli Değişkenler:\n`;
    context.variables.forEach(v => {
      prompt += `- ${v.name}: ${v.value} (${v.type})\n`;
    });
    prompt += `\n`;
  }

  if (context.relevantChunks.length > 0) {
    // If there's only one chunk with score 1.0, it's the full content
    if (context.relevantChunks.length === 1 && context.relevantChunks[0].score === 1.0) {
      console.log(`[ContextBuilder] Formatting full contract content (single chunk)`);
      console.log(`[ContextBuilder] Chunk text length: ${context.relevantChunks[0].text.length} characters`);
      prompt += `Sözleşme İçeriği:\n\n${context.relevantChunks[0].text}\n\n`;
    } else {
      console.log(`[ContextBuilder] Formatting ${context.relevantChunks.length} chunks`);
      prompt += `İlgili Sözleşme Bölümleri:\n\n`;
      context.relevantChunks.forEach((chunk, index) => {
        prompt += `[Bölüm ${index + 1}${chunk.score ? ` - Benzerlik: ${(chunk.score * 100).toFixed(1)}%` : ''}]\n${chunk.text}\n\n`;
      });
    }
  } else {
    console.warn(`[ContextBuilder] WARNING: No relevant chunks found in context!`);
  }

  console.log(`[ContextBuilder] ✓ Prompt formatted successfully`);
  console.log(`[ContextBuilder] Final prompt length: ${prompt.length} characters`);
  console.log(`[ContextBuilder] Final prompt preview (first 1000 chars):\n${prompt.substring(0, 1000)}...`);
  console.log(`[ContextBuilder] ===== END: Formatting context for prompt =====`);

  return prompt;
}

/**
 * Build context from contract content directly (when embeddings are not available)
 */
export async function buildContractContextWithContent(
  contractId: string,
  contractContent: string
): Promise<ContractContext> {
  console.log(`[ContextBuilder] ===== START: Building context for contract ${contractId} =====`);
  console.log(`[ContextBuilder] Input content length: ${contractContent.length} characters`);
  console.log(`[ContextBuilder] Input content preview (first 300 chars): ${contractContent.substring(0, 300)}...`);
  
  // Get contract metadata
  console.log(`[ContextBuilder] Fetching contract metadata...`);
  const contract = await Contract.findById(contractId)
    .populate('companyId', 'name')
    .populate('counterpartyId', 'name')
    .lean();

  if (!contract) {
    console.error(`[ContextBuilder] ERROR: Contract ${contractId} not found`);
    throw new Error('Contract not found');
  }
  console.log(`[ContextBuilder] ✓ Contract metadata fetched: ${contract.title}`);

  // Get contract variables
  console.log(`[ContextBuilder] Fetching contract variables...`);
  const variables = await ContractVariable.find({
    contractId: new mongoose.Types.ObjectId(contractId),
  }).lean();
  console.log(`[ContextBuilder] ✓ Found ${variables.length} contract variables`);

  // Convert HTML to plain text
  console.log(`[ContextBuilder] Converting HTML to plain text...`);
  console.log(`[ContextBuilder] Input content type check:`, {
    startsWithBrace: contractContent.trim().startsWith('{'),
    startsWithBracket: contractContent.trim().startsWith('['),
    startsWithLessThan: contractContent.trim().startsWith('<'),
    firstChar: contractContent.trim().charAt(0),
  });
  
  const plainText = htmlToText(contractContent);
  console.log(`[ContextBuilder] ✓ HTML converted to plain text`);
  console.log(`[ContextBuilder] Plain text length: ${plainText.length} characters`);
  
  if (plainText.length === 0) {
    console.error(`\n\n[ContextBuilder] ⚠⚠⚠ CRITICAL ERROR: Plain text is EMPTY after conversion! ⚠⚠⚠`);
    console.error(`[ContextBuilder] Input content length: ${contractContent.length}`);
    console.error(`[ContextBuilder] Input content preview: ${contractContent.substring(0, 500)}...`);
    console.error(`[ContextBuilder] This means contract content will NOT be sent to AI!`);
    console.error(`[ContextBuilder] ⚠⚠⚠ ============================================== ⚠⚠⚠\n\n`);
  } else {
    console.log(`[ContextBuilder] ✓ Plain text preview (first 500 chars):\n${plainText.substring(0, 500)}...`);
  }

  // Build context with full content as a single chunk
  const context: ContractContext = {
    contractMetadata: {
      title: contract.title,
      contractType: contract.contractType,
      counterparty: contract.counterparty || (contract.counterpartyId as any)?.name,
      startDate: contract.startDate,
      endDate: contract.endDate,
      value: contract.value,
      currency: contract.currency,
      status: contract.status,
    },
    variables: variables.map((v: any) => ({
      name: v.name,
      value: v.value,
      type: v.type,
    })),
    relevantChunks: [{
      text: plainText,
      index: 0,
      score: 1.0, // Full content gets max score
    }],
  };

  console.log(`[ContextBuilder] ✓ Context built successfully`);
  console.log(`[ContextBuilder] Context summary:`, {
    metadataTitle: context.contractMetadata.title,
    variablesCount: context.variables.length,
    chunksCount: context.relevantChunks.length,
    firstChunkLength: context.relevantChunks[0]?.text?.length || 0,
  });
  console.log(`[ContextBuilder] ===== END: Building context =====`);

  return context;
}

