import mongoose, { Schema, Document, Model } from 'mongoose';
// Import Contract to ensure it's registered before ContractSummary schema references it
import './Contract';
// Import User to ensure it's registered before ContractSummary schema references it
import './User';

export interface IContractSummary extends Document {
  contractId: mongoose.Types.ObjectId;
  summaryType: 'auto' | 'manual';
  summary: string;
  generatedBy: mongoose.Types.ObjectId | 'system';
  aiModel: string; // AI model used (e.g., 'gemini-2.5-pro', 'gpt-4')
  metadata?: {
    tokenCount?: number;
    processingTime?: number;
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;
}

const ContractSummarySchema = new Schema<IContractSummary>(
  {
    contractId: {
      type: Schema.Types.ObjectId,
      ref: 'Contract',
      required: true,
      index: true,
    },
    summaryType: {
      type: String,
      enum: ['auto', 'manual'],
      required: true,
      index: true,
    },
    summary: {
      type: String,
      required: true,
    },
    generatedBy: {
      type: Schema.Types.Mixed,
      required: true,
      // Can be ObjectId (User) or 'system'
    },
    aiModel: {
      type: String,
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
ContractSummarySchema.index({ contractId: 1, summaryType: 1, createdAt: -1 });
ContractSummarySchema.index({ contractId: 1, createdAt: -1 });

const ContractSummary: Model<IContractSummary> =
  mongoose.models.ContractSummary ||
  mongoose.model<IContractSummary>('ContractSummary', ContractSummarySchema);

export default ContractSummary;

