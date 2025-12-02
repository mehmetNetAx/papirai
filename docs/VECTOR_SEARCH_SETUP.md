# MongoDB Atlas Vector Search Setup Guide

## Overview

This guide explains how to set up MongoDB Atlas Vector Search for the AI Chat Bot and RAG system.

## Prerequisites

- MongoDB Atlas cluster (M10 or higher recommended for production)
- Vector Search enabled on your cluster
- Access to MongoDB Atlas Dashboard

## Step 1: Enable Vector Search

1. Log in to MongoDB Atlas Dashboard
2. Navigate to your cluster
3. Ensure your cluster supports Vector Search (M10+ or serverless)
4. Vector Search is automatically enabled on supported clusters

## Step 2: Create Vector Search Index

### Option A: Using MongoDB Atlas UI (Recommended)

1. Go to MongoDB Atlas Dashboard
2. Navigate to your cluster
3. Click on the **"Search"** tab
4. Click **"Create Search Index"**
5. Select **"JSON Editor"**
6. Paste the following index definition:

```json
{
  "name": "vector_index",
  "definition": {
    "mappings": {
      "dynamic": true,
      "fields": {
        "embedding": {
          "type": "knnVector",
          "dimensions": 768,
          "similarity": "cosine"
        },
        "contractId": {
          "type": "objectId"
        },
        "chunkIndex": {
          "type": "number"
        },
        "chunkText": {
          "type": "string"
        }
      }
    }
  }
}
```

7. Configure:
   - **Index Name**: `vector_index`
   - **Database**: Your database name (e.g., `papirai`)
   - **Collection**: `contractembeddings`
8. Click **"Create Search Index"**
9. Wait for the index to build (may take a few minutes)

### Option B: Using MongoDB CLI (mongosh)

```bash
mongosh "your-connection-string"
use your-database-name

db.contractembeddings.createSearchIndex({
  "name": "vector_index",
  "definition": {
    "mappings": {
      "dynamic": true,
      "fields": {
        "embedding": {
          "type": "knnVector",
          "dimensions": 768,
          "similarity": "cosine"
        },
        "contractId": {
          "type": "objectId"
        },
        "chunkIndex": {
          "type": "number"
        },
        "chunkText": {
          "type": "string"
        }
      }
    }
  }
})
```

## Step 3: Verify Index Creation

1. Go to the **"Search"** tab in MongoDB Atlas
2. You should see `vector_index` listed
3. Status should be **"Active"** (green)

## Step 4: Configure Embedding Dimensions

The embedding dimensions depend on your AI provider:

- **Gemini text-embedding-004**: 768 dimensions
- **OpenAI text-embedding-3-small**: 1536 dimensions
- **OpenAI text-embedding-3-large**: 3072 dimensions

Update the `dimensions` value in the index definition accordingly.

You can also set this via environment variable:
```env
RAG_EMBEDDING_DIMENSIONS=768
```

## Step 5: Test Vector Search

After creating the index, test it by:

1. Generating embeddings for a contract:
   ```bash
   # Via API
   POST /api/contracts/{contractId}/embeddings
   ```

2. Testing a chat query:
   ```bash
   # Via API
   POST /api/contracts/{contractId}/chat
   {
     "message": "What are the payment terms?",
     "useRAG": true
   }
   ```

## Troubleshooting

### Index Not Found Error

If you see "Index not found" errors:
- Verify the index name is exactly `vector_index`
- Check that the index status is "Active"
- Ensure you're querying the correct database and collection

### Wrong Dimensions Error

If you see dimension mismatch errors:
- Check your embedding model's dimensions
- Update the index definition with correct dimensions
- Recreate the index if needed

### Fallback to Cosine Similarity

If vector search fails, the system automatically falls back to cosine similarity calculation. This is slower but works without Atlas Vector Search.

## Notes

- Vector Search requires MongoDB Atlas (not self-hosted MongoDB)
- Index creation may take several minutes for large collections
- The index is automatically used when available
- Fallback to cosine similarity works if vector search is unavailable

## Support

For more information:
- [MongoDB Atlas Vector Search Documentation](https://www.mongodb.com/docs/atlas/atlas-vector-search/)
- [Vector Search Index Configuration](https://www.mongodb.com/docs/atlas/atlas-vector-search/vector-search-index/)

