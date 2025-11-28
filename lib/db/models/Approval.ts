import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IApproval extends Document {
  contractId: mongoose.Types.ObjectId;
  approverId: mongoose.Types.ObjectId;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  comments?: string;
  workflowStep: number;
  workflowType: 'sequential' | 'parallel';
  requiredApprovals?: number;
  createdAt: Date;
  approvedAt?: Date;
  rejectedAt?: Date;
}

const ApprovalSchema = new Schema<IApproval>(
  {
    contractId: {
      type: Schema.Types.ObjectId,
      ref: 'Contract',
      required: true,
      index: true,
    },
    approverId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'cancelled'],
      default: 'pending',
      required: true,
      index: true,
    },
    comments: {
      type: String,
      trim: true,
    },
    workflowStep: {
      type: Number,
      required: true,
    },
    workflowType: {
      type: String,
      enum: ['sequential', 'parallel'],
      required: true,
    },
    requiredApprovals: {
      type: Number,
    },
    approvedAt: {
      type: Date,
    },
    rejectedAt: {
      type: Date,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

ApprovalSchema.index({ contractId: 1, status: 1 });
ApprovalSchema.index({ approverId: 1, status: 1 });

const Approval: Model<IApproval> = mongoose.models.Approval || mongoose.model<IApproval>('Approval', ApprovalSchema);

export default Approval;

