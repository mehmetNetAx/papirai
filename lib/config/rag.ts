export interface RAGConfig {
  chunkSize: number;
  chunkOverlap: number;
  topK: number;
  similarityThreshold: number;
  embeddingDimensions: number;
}

const defaultRAGConfig: RAGConfig = {
  chunkSize: parseInt(process.env.RAG_CHUNK_SIZE || '500', 10),
  chunkOverlap: parseInt(process.env.RAG_CHUNK_OVERLAP || '100', 10),
  topK: parseInt(process.env.RAG_TOP_K || '5', 10),
  similarityThreshold: parseFloat(process.env.RAG_SIMILARITY_THRESHOLD || '0.7'),
  embeddingDimensions: parseInt(process.env.RAG_EMBEDDING_DIMENSIONS || '768', 10), // Default for Gemini text-embedding-004
};

export function getRAGConfig(): RAGConfig {
  return { ...defaultRAGConfig };
}

export const ragConfig = getRAGConfig();

