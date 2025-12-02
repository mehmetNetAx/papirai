/**
 * MongoDB Atlas Vector Search Index Creation Script
 * 
 * This script provides instructions and a JSON definition for creating
 * a vector search index in MongoDB Atlas for the ContractEmbedding collection.
 * 
 * IMPORTANT: This script does NOT automatically create the index.
 * You need to create it manually in MongoDB Atlas UI or using the MongoDB CLI.
 * 
 * Steps to create the index:
 * 1. Go to MongoDB Atlas Dashboard
 * 2. Navigate to your cluster
 * 3. Click on "Search" tab
 * 4. Click "Create Search Index"
 * 5. Select "JSON Editor"
 * 6. Paste the index definition below
 * 7. Name the index: "vector_index"
 * 8. Select the database: your database name
 * 9. Select the collection: "contractembeddings"
 * 10. Click "Create Search Index"
 * 
 * Alternative: Use MongoDB CLI (mongosh)
 * mongosh "your-connection-string"
 * use your-database-name
 * db.contractembeddings.createSearchIndex({
 *   "definition": { ... }
 * })
 */

import connectDB from '@/lib/db/connection';
import { ragConfig } from '@/lib/config/rag';

const vectorIndexDefinition = {
  name: 'vector_index',
  definition: {
    mappings: {
      dynamic: true,
      fields: {
        embedding: {
          type: 'knnVector',
          dimensions: ragConfig.embeddingDimensions, // Default: 768 for Gemini text-embedding-004
          similarity: 'cosine',
        },
        contractId: {
          type: 'objectId',
        },
        chunkIndex: {
          type: 'number',
        },
        chunkText: {
          type: 'string',
        },
      },
    },
  },
};

console.log('MongoDB Atlas Vector Search Index Definition:');
console.log(JSON.stringify(vectorIndexDefinition, null, 2));
console.log('\n');
console.log('Embedding Dimensions:', ragConfig.embeddingDimensions);
console.log('\n');
console.log('To create this index:');
console.log('1. Go to MongoDB Atlas Dashboard');
console.log('2. Navigate to your cluster');
console.log('3. Click on "Search" tab');
console.log('4. Click "Create Search Index"');
console.log('5. Select "JSON Editor"');
console.log('6. Paste the definition above');
console.log('7. Name: "vector_index"');
console.log('8. Database: your database name');
console.log('9. Collection: "contractembeddings"');
console.log('10. Click "Create Search Index"');

// Export for programmatic use if needed
export { vectorIndexDefinition };

// If running directly, just print the definition
if (require.main === module) {
  // Script executed directly
  console.log('\nNote: This script only prints the index definition.');
  console.log('You must create the index manually in MongoDB Atlas UI.\n');
}

