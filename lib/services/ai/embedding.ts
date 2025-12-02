import connectDB from '@/lib/db/connection';
import ContractEmbedding from '@/lib/db/models/ContractEmbedding';
import Contract from '@/lib/db/models/Contract';
import { getAIProvider } from './factory';
import { chunkContractContent } from '@/lib/services/rag/chunker';
import mongoose from 'mongoose';
import { ragConfig } from '@/lib/config/rag';

export interface EmbeddingResult {
  contractId: string;
  chunksCreated: number;
  embeddingsGenerated: number;
}

/**
 * Generate embeddings for a contract and save to database
 */
export async function generateContractEmbeddings(contractId: string): Promise<EmbeddingResult> {
  await connectDB();

  const contract = await Contract.findById(contractId).lean();
  if (!contract) {
    throw new Error('Contract not found');
  }

  // Delete existing embeddings for this contract
  await ContractEmbedding.deleteMany({ contractId: new mongoose.Types.ObjectId(contractId) });

  // Chunk the contract content
  const chunks = chunkContractContent(contract.content);

  if (chunks.length === 0) {
    return {
      contractId,
      chunksCreated: 0,
      embeddingsGenerated: 0,
    };
  }

  // Get AI provider
  const provider = getAIProvider();

  // Generate embeddings for all chunks
  // Process in batches to avoid API limits
  const batchSize = 100; // Process 100 chunks at a time
  const embeddingsToSave: any[] = [];

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const chunkTexts = batch.map(chunk => chunk.text);
    
    const embeddingResponse = await provider.generateEmbedding({
      text: chunkTexts,
    });

    // Validate embedding dimensions
    const expectedDimensions = ragConfig.embeddingDimensions;
    embeddingResponse.embeddings.forEach((embedding, idx) => {
      if (embedding.length !== expectedDimensions) {
        console.warn(
          `Warning: Embedding dimension mismatch for chunk ${i + idx}. ` +
          `Expected ${expectedDimensions}, got ${embedding.length}. ` +
          `Update RAG_EMBEDDING_DIMENSIONS environment variable.`
        );
      }
    });

    // Map embeddings to chunks
    batch.forEach((chunk, idx) => {
      embeddingsToSave.push({
        contractId: new mongoose.Types.ObjectId(contractId),
        chunkIndex: chunk.index,
        chunkText: chunk.text,
        embedding: embeddingResponse.embeddings[idx],
        metadata: chunk.metadata,
      });
    });
  }

  // Save all embeddings to database
  if (embeddingsToSave.length > 0) {
    await ContractEmbedding.insertMany(embeddingsToSave);
  }

  return {
    contractId,
    chunksCreated: chunks.length,
    embeddingsGenerated: embeddingsToSave.length,
  };
}

/**
 * Check if embeddings exist for a contract
 */
export async function hasContractEmbeddings(contractId: string): Promise<boolean> {
  await connectDB();
  const count = await ContractEmbedding.countDocuments({
    contractId: new mongoose.Types.ObjectId(contractId),
  });
  return count > 0;
}

/**
 * Get embedding count for a contract
 */
export async function getContractEmbeddingCount(contractId: string): Promise<number> {
  await connectDB();
  return await ContractEmbedding.countDocuments({
    contractId: new mongoose.Types.ObjectId(contractId),
  });
}

