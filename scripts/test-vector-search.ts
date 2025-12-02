/**
 * Test script to verify MongoDB Atlas Vector Search is working correctly
 * Run with: npx tsx scripts/test-vector-search.ts <contractId>
 */

import connectDB from '../lib/db/connection';
import ContractEmbedding from '../lib/db/models/ContractEmbedding';
import { vectorSearch, fallbackVectorSearch } from '../lib/services/rag/vector-search';
import mongoose from 'mongoose';

async function testVectorSearch(contractId?: string) {
  try {
    await connectDB();
    console.log('✅ Connected to MongoDB');

    // Check if embeddings exist
    const queryFilter: any = {};
    if (contractId) {
      queryFilter.contractId = new mongoose.Types.ObjectId(contractId);
      console.log(`\n📋 Testing with contract ID: ${contractId}`);
    } else {
      console.log('\n📋 Testing with all contracts');
    }

    const embeddingCount = await ContractEmbedding.countDocuments(queryFilter);
    console.log(`📊 Found ${embeddingCount} embeddings`);

    if (embeddingCount === 0) {
      console.error('❌ No embeddings found! Please generate embeddings first.');
      process.exit(1);
    }

    // Test query
    const testQuery = 'sözleşme özeti çıkar';
    console.log(`\n🔍 Testing query: "${testQuery}"`);

    // Try vector search first
    console.log('\n1️⃣ Testing MongoDB Atlas Vector Search...');
    try {
      const vectorResults = await vectorSearch(testQuery, contractId, 5);
      console.log(`✅ Vector search succeeded! Found ${vectorResults.length} results`);
      
      if (vectorResults.length > 0) {
        console.log('\n📄 Top results:');
        vectorResults.forEach((result, idx) => {
          console.log(`\n${idx + 1}. Score: ${result.score?.toFixed(4)}`);
          console.log(`   Text preview: ${result.chunk.text.substring(0, 200)}...`);
        });
      } else {
        console.log('⚠️  No results found (might be below similarity threshold)');
      }
    } catch (error: any) {
      console.error('❌ Vector search failed:', error.message);
      console.log('\n2️⃣ Falling back to cosine similarity search...');
      
      try {
        const fallbackResults = await fallbackVectorSearch(testQuery, contractId, 5);
        console.log(`✅ Fallback search succeeded! Found ${fallbackResults.length} results`);
        
        if (fallbackResults.length > 0) {
          console.log('\n📄 Top results:');
          fallbackResults.forEach((result, idx) => {
            console.log(`\n${idx + 1}. Score: ${result.score?.toFixed(4)}`);
            console.log(`   Text preview: ${result.chunk.text.substring(0, 200)}...`);
          });
        } else {
          console.log('⚠️  No results found');
        }
      } catch (fallbackError: any) {
        console.error('❌ Fallback search also failed:', fallbackError.message);
      }
    }

    // Check MongoDB Atlas Vector Search index
    console.log('\n\n3️⃣ Checking MongoDB Atlas Vector Search index...');
    try {
      // Try to run a simple aggregation to check if index exists
      const testPipeline = [
        {
          $vectorSearch: {
            index: 'vector_index',
            path: 'embedding',
            queryVector: new Array(768).fill(0), // Dummy vector for testing
            numCandidates: 1,
            limit: 1,
          },
        },
      ];

      try {
        await ContractEmbedding.aggregate(testPipeline);
        console.log('✅ Vector search index exists and is accessible');
      } catch (indexError: any) {
        if (indexError.message?.includes('index') || indexError.message?.includes('vector')) {
          console.error('❌ Vector search index not found or not configured');
          console.log('\n💡 To create the index, run:');
          console.log('   npx tsx scripts/create-vector-index.ts');
          console.log('\n   Or manually create it in MongoDB Atlas:');
          console.log('   1. Go to Atlas Search');
          console.log('   2. Create Search Index');
          console.log('   3. Use JSON Editor');
          console.log('   4. Use the configuration from scripts/create-vector-index.ts');
        } else {
          throw indexError;
        }
      }
    } catch (error: any) {
      console.error('❌ Error checking index:', error.message);
    }

    // Check embedding dimensions
    console.log('\n\n4️⃣ Checking embedding dimensions...');
    const sampleEmbedding = await ContractEmbedding.findOne(queryFilter).lean();
    if (sampleEmbedding) {
      const dimensions = (sampleEmbedding as any).embedding?.length || 0;
      console.log(`📏 Embedding dimensions: ${dimensions}`);
      
      if (dimensions === 768) {
        console.log('✅ Correct dimensions for Gemini text-embedding-004');
      } else if (dimensions === 1536) {
        console.log('✅ Correct dimensions for OpenAI text-embedding-3-small');
      } else if (dimensions === 3072) {
        console.log('✅ Correct dimensions for OpenAI text-embedding-3-large');
      } else {
        console.log(`⚠️  Unexpected dimensions: ${dimensions}`);
      }
    }

    console.log('\n✅ Test completed!');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Get contract ID from command line arguments
const contractId = process.argv[2];
testVectorSearch(contractId);

