import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IContractUserAssignment extends Document {
  contractId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  assignedBy: mongoose.Types.ObjectId; // User who made the assignment
  assignedAt: Date;
  isActive: boolean;
  notes?: string; // Optional notes about the assignment
  createdAt: Date;
  updatedAt: Date;
}

const ContractUserAssignmentSchema = new Schema<IContractUserAssignment>(
  {
    contractId: {
      type: Schema.Types.ObjectId,
      ref: 'Contract',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    assignedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure unique active assignments
ContractUserAssignmentSchema.index({ contractId: 1, userId: 1, isActive: 1 }, { unique: true, partialFilterExpression: { isActive: true } });

// Index for querying by user
ContractUserAssignmentSchema.index({ userId: 1, isActive: 1 });

// Index for querying by contract
ContractUserAssignmentSchema.index({ contractId: 1, isActive: 1 });

const ContractUserAssignment: Model<IContractUserAssignment> =
  mongoose.models.ContractUserAssignment ||
  mongoose.model<IContractUserAssignment>('ContractUserAssignment', ContractUserAssignmentSchema);

export default ContractUserAssignment;

