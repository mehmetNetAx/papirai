import connectDB from '@/lib/db/connection';
import ContractEmbedding from '@/lib/db/models/ContractEmbedding';
import { getAIProvider } from '@/lib/services/ai/factory';
import mongoose from 'mongoose';
import { ragConfig } from '@/lib/config/rag';
import { validateEmbeddingDimensions } from './vector-search-utils';

export interface SearchResult {
  chunk: {
    text: string;
    index: number;
    metadata: any;
  };
  contractId: string;
  score?: number;
}

/**
 * Search for similar chunks using vector search
 * Note: This requires MongoDB Atlas Vector Search index to be created
 */
export async function vectorSearch(
  query: string,
  contractId?: string,
  topK: number = ragConfig.topK,
  similarityThreshold: number = ragConfig.similarityThreshold
): Promise<SearchResult[]> {
  await connectDB();

  // Generate embedding for the query
  const provider = getAIProvider();
  const embeddingResponse = await provider.generateEmbedding({ text: query });
  const queryEmbedding = embeddingResponse.embeddings[0];

  // Build the aggregation pipeline for vector search
  // IMPORTANT: $vectorSearch must be the first stage in the pipeline
  const vectorSearchStage: any = {
    $vectorSearch: {
      index: 'vector_index', // This should match your Atlas Vector Search index name
      path: 'embedding',
      queryVector: queryEmbedding,
      numCandidates: topK * 10, // Search more candidates for better results
      limit: topK,
    },
  };

  // Add filter to vector search if contractId is provided
  if (contractId) {
    vectorSearchStage.$vectorSearch.filter = {
      contractId: new mongoose.Types.ObjectId(contractId),
    };
  }

  const pipeline: any[] = [
    vectorSearchStage,
    {
      $project: {
        contractId: 1,
        chunkIndex: 1,
        chunkText: 1,
        metadata: 1,
        score: { $meta: 'vectorSearchScore' },
      },
    },
  ];

  // Execute the search
  let results: any[] = [];
  try {
    console.log('[VectorSearch] Executing vector search pipeline...');
    results = await ContractEmbedding.aggregate(pipeline);
    console.log(`[VectorSearch] Pipeline executed successfully, got ${results.length} results`);
  } catch (error: any) {
    console.error('[VectorSearch] Pipeline execution failed:', error.message || error);
    console.error('[VectorSearch] Error details:', {
      name: error.name,
      code: error.code,
      message: error.message,
    });
    // If vector search fails (e.g., index not found), throw error to trigger fallback
    if (error.message?.includes('index') || error.message?.includes('vector') || error.code === 17106) {
      throw new Error('Vector search index not available');
    }
    throw error;
  }

  // Filter by similarity threshold and format results
  const searchResults: SearchResult[] = results
    .filter((result: any) => {
      const score = result.score || 0;
      return !similarityThreshold || score >= similarityThreshold;
    })
    .map((result: any) => ({
      chunk: {
        text: result.chunkText,
        index: result.chunkIndex,
        metadata: result.metadata || {},
      },
      contractId: result.contractId.toString(),
      score: result.score,
    }));

  return searchResults;
}

/**
 * Fallback search using cosine similarity (if vector search is not available)
 */
export async function fallbackVectorSearch(
  query: string,
  contractId?: string,
  topK: number = ragConfig.topK
): Promise<SearchResult[]> {
  await connectDB();

  // Generate embedding for the query
  const provider = getAIProvider();
  const embeddingResponse = await provider.generateEmbedding({ text: query });
  const queryEmbedding = embeddingResponse.embeddings[0];

  // Build query
  const queryFilter: any = {};
  if (contractId) {
    queryFilter.contractId = new mongoose.Types.ObjectId(contractId);
  }

  console.log(`[FallbackSearch] Searching embeddings with filter:`, queryFilter);

  // Get all embeddings for the contract(s)
  // Limit to reasonable number for performance
  const maxEmbeddings = 1000; // Limit for fallback performance
  const embeddings = await ContractEmbedding.find(queryFilter)
    .limit(maxEmbeddings)
    .lean();

  console.log(`[FallbackSearch] Found ${embeddings.length} embeddings`);

  if (embeddings.length === 0) {
    console.warn(`[FallbackSearch] No embeddings found for contract ${contractId}`);
    return [];
  }

  // Calculate cosine similarity
  const similarities = embeddings
    .map((embedding: any) => {
      // Skip if dimensions don't match
      if (embedding.embedding.length !== queryEmbedding.length) {
        return null;
      }
      
      const score = cosineSimilarity(queryEmbedding, embedding.embedding);
      return {
        chunk: {
          text: embedding.chunkText,
          index: embedding.chunkIndex,
          metadata: embedding.metadata || {},
        },
        contractId: embedding.contractId.toString(),
        score,
      };
    })
    .filter((result): result is SearchResult & { score: number } => result !== null && typeof result.score === 'number');

  // Sort by score and return top K
  similarities.sort((a, b) => (b.score || 0) - (a.score || 0));
  return similarities
    .slice(0, topK)
    .filter(result => (result.score || 0) >= ragConfig.similarityThreshold);
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) {
    return 0;
  }

  return dotProduct / denominator;
}

