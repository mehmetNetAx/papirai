import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IContractChange extends Document {
  contractId: mongoose.Types.ObjectId;
  versionId?: mongoose.Types.ObjectId; // Optional: link to version if change is part of a version
  userId: mongoose.Types.ObjectId;
  type: 'insertion' | 'deletion' | 'formatting';
  position: number; // Character position in the document
  length: number; // Length of the change
  content: string; // The changed content
  originalContent?: string; // Original content (for deletions)
  authorName: string; // User's name for display
  authorColor: string; // Color for highlighting this user's changes
  timestamp: Date;
  accepted?: boolean; // Whether the change has been accepted
  acceptedBy?: mongoose.Types.ObjectId;
  acceptedAt?: Date;
  rejected?: boolean; // Whether the change has been rejected
  rejectedBy?: mongoose.Types.ObjectId;
  rejectedAt?: Date;
  comment?: string; // Optional comment on the change
}

const ContractChangeSchema = new Schema<IContractChange>(
  {
    contractId: {
      type: Schema.Types.ObjectId,
      ref: 'Contract',
      required: true,
      index: true,
    },
    versionId: {
      type: Schema.Types.ObjectId,
      ref: 'ContractVersion',
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['insertion', 'deletion', 'formatting'],
      required: true,
    },
    position: {
      type: Number,
      required: true,
    },
    length: {
      type: Number,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    originalContent: {
      type: String,
    },
    authorName: {
      type: String,
      required: true,
    },
    authorColor: {
      type: String,
      required: true,
      default: '#3b82f6', // Default blue
    },
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
    },
    accepted: {
      type: Boolean,
      default: false,
    },
    acceptedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    acceptedAt: {
      type: Date,
    },
    rejected: {
      type: Boolean,
      default: false,
    },
    rejectedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    rejectedAt: {
      type: Date,
    },
    comment: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

ContractChangeSchema.index({ contractId: 1, timestamp: -1 });
ContractChangeSchema.index({ contractId: 1, accepted: 1, rejected: 1 });
ContractChangeSchema.index({ versionId: 1 });

const ContractChange: Model<IContractChange> =
  mongoose.models.ContractChange || mongoose.model<IContractChange>('ContractChange', ContractChangeSchema);

export default ContractChange;

