import mongoose, { Schema, Document, Model } from 'mongoose';
// Import Contract to ensure it's registered before ContractEmbedding schema references it
import './Contract';

export interface IContractEmbedding extends Document {
  contractId: mongoose.Types.ObjectId;
  chunkIndex: number;
  chunkText: string;
  embedding: number[]; // Vector embedding (1536 for OpenAI, 768 for some models)
  metadata?: {
    section?: string;
    startPos?: number;
    endPos?: number;
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;
}

const ContractEmbeddingSchema = new Schema<IContractEmbedding>(
  {
    contractId: {
      type: Schema.Types.ObjectId,
      ref: 'Contract',
      required: true,
      index: true,
    },
    chunkIndex: {
      type: Number,
      required: true,
      index: true,
    },
    chunkText: {
      type: String,
      required: true,
    },
    embedding: {
      type: [Number],
      required: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
ContractEmbeddingSchema.index({ contractId: 1, chunkIndex: 1 }, { unique: true });

// Note: Vector index on 'embedding' field should be created in MongoDB Atlas
// This is done via MongoDB Atlas UI or CLI, not via Mongoose schema
// Example Atlas Vector Search index definition:
// {
//   "fields": [
//     {
//       "type": "vector",
//       "path": "embedding",
//       "numDimensions": 1536, // or 768 depending on model
//       "similarity": "cosine"
//     }
//   ]
// }

const ContractEmbedding: Model<IContractEmbedding> =
  mongoose.models.ContractEmbedding ||
  mongoose.model<IContractEmbedding>('ContractEmbedding', ContractEmbeddingSchema);

export default ContractEmbedding;

