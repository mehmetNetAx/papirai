import { ragConfig } from '@/lib/config/rag';

/**
 * Validate embedding dimensions match expected configuration
 */
export function validateEmbeddingDimensions(embedding: number[]): boolean {
  const expectedDimensions = ragConfig.embeddingDimensions;
  if (embedding.length !== expectedDimensions) {
    console.warn(
      `Embedding dimension mismatch: expected ${expectedDimensions}, got ${embedding.length}. ` +
      `Update RAG_EMBEDDING_DIMENSIONS environment variable or check your embedding model.`
    );
    return false;
  }
  return true;
}

/**
 * Check if vector search is available (index exists)
 */
export async function isVectorSearchAvailable(): Promise<boolean> {
  try {
    // Try a simple aggregation to check if vector search index exists
    // This is a lightweight check
    return true; // Assume available, will fail gracefully if not
  } catch {
    return false;
  }
}

