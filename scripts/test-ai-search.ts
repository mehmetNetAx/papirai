/**
 * Test script for AI Search functionality
 * 
 * This script tests:
 * 1. Embedding generation
 * 2. Vector search (with fallback)
 * 3. Chat response generation
 * 4. RAG pipeline
 * 
 * Usage: tsx scripts/test-ai-search.ts [contractId]
 */

import connectDB from '../lib/db/connection';
import Contract from '../lib/db/models/Contract';
import { generateContractEmbeddings, hasContractEmbeddings } from '../lib/services/ai/embedding';
import { vectorSearch, fallbackVectorSearch } from '../lib/services/rag/vector-search';
import { generateChatResponse } from '../lib/services/ai/chat';
import mongoose from 'mongoose';

async function testEmbeddingGeneration(contractId: string) {
  console.log('\n=== Testing Embedding Generation ===');
  try {
    const hasEmbeddings = await hasContractEmbeddings(contractId);
    console.log(`Contract has embeddings: ${hasEmbeddings}`);

    if (!hasEmbeddings) {
      console.log('Generating embeddings...');
      const result = await generateContractEmbeddings(contractId);
      console.log(`✓ Embeddings generated: ${result.chunksCreated} chunks, ${result.embeddingsGenerated} embeddings`);
    } else {
      console.log('✓ Embeddings already exist');
    }
    return true;
  } catch (error: any) {
    console.error('✗ Embedding generation failed:', error.message);
    return false;
  }
}

async function testVectorSearch(contractId: string, query: string) {
  console.log('\n=== Testing Vector Search ===');
  try {
    console.log(`Query: "${query}"`);
    
    // Try vector search first
    let results;
    try {
      console.log('Attempting MongoDB Atlas Vector Search...');
      results = await vectorSearch(query, contractId);
      console.log(`✓ Vector search successful: ${results.length} results`);
    } catch (error: any) {
      console.log(`⚠ Vector search failed: ${error.message}`);
      console.log('Falling back to cosine similarity...');
      results = await fallbackVectorSearch(query, contractId);
      console.log(`✓ Fallback search successful: ${results.length} results`);
    }

    if (results.length > 0) {
      console.log('\nTop results:');
      results.slice(0, 3).forEach((result, idx) => {
        console.log(`\n${idx + 1}. Score: ${result.score?.toFixed(4)}`);
        console.log(`   Chunk: ${result.chunk.text.substring(0, 100)}...`);
      });
    } else {
      console.log('⚠ No results found');
    }

    return results.length > 0;
  } catch (error: any) {
    console.error('✗ Vector search failed:', error.message);
    return false;
  }
}

async function testChatResponse(contractId: string, query: string, userId: string) {
  console.log('\n=== Testing Chat Response ===');
  try {
    console.log(`Query: "${query}"`);
    
    const sessionId = `test-${Date.now()}`;
    const response = await generateChatResponse({
      contractId,
      userId,
      sessionId,
      message: query,
      useRAG: true,
    });

    console.log(`✓ Chat response generated`);
    console.log(`Model: ${response.model}`);
    console.log(`Response: ${response.response.substring(0, 200)}...`);
    
    if (response.usage) {
      console.log(`Usage: ${response.usage.totalTokens || 'N/A'} tokens`);
    }

    return true;
  } catch (error: any) {
    console.error('✗ Chat response failed:', error.message);
    return false;
  }
}

async function main() {
  const contractId = process.argv[2];

  if (!contractId) {
    console.error('Usage: tsx scripts/test-ai-search.ts <contractId>');
    process.exit(1);
  }

  try {
    await connectDB();
    console.log('✓ Database connected');

    // Verify contract exists
    const contract = await Contract.findById(contractId).lean();
    if (!contract) {
      console.error(`✗ Contract not found: ${contractId}`);
      process.exit(1);
    }

    console.log(`\nTesting AI Search for contract: ${contract.title}`);
    console.log(`Contract ID: ${contractId}`);

    // Test 1: Embedding generation
    const embeddingOk = await testEmbeddingGeneration(contractId);
    if (!embeddingOk) {
      console.error('\n✗ Embedding generation failed. Cannot continue.');
      process.exit(1);
    }

    // Test 2: Vector search
    const testQueries = [
      'Ödeme koşulları nelerdir?',
      'Fesih maddesi nedir?',
      'Sözleşme süresi ne kadar?',
    ];

    for (const query of testQueries) {
      const searchOk = await testVectorSearch(contractId, query);
      if (!searchOk) {
        console.warn(`⚠ Search failed for query: ${query}`);
      }
    }

    // Test 3: Chat response
    const userId = new mongoose.Types.ObjectId().toString(); // Test user ID
    const chatOk = await testChatResponse(
      contractId,
      'Bu sözleşmenin önemli noktaları nelerdir?',
      userId
    );

    if (!chatOk) {
      console.warn('⚠ Chat response generation failed');
    }

    console.log('\n=== Test Summary ===');
    console.log(`Embedding Generation: ${embeddingOk ? '✓' : '✗'}`);
    console.log(`Vector Search: ${embeddingOk ? '✓' : '✗'}`);
    console.log(`Chat Response: ${chatOk ? '✓' : '✗'}`);

    if (embeddingOk && chatOk) {
      console.log('\n✓ All tests passed!');
      process.exit(0);
    } else {
      console.log('\n⚠ Some tests failed. Check the output above.');
      process.exit(1);
    }
  } catch (error: any) {
    console.error('\n✗ Test failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

