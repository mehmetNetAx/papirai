import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IContractVersion extends Document {
  contractId: mongoose.Types.ObjectId;
  versionNumber: number;
  content: string; // Full content snapshot
  createdBy: mongoose.Types.ObjectId;
  changeSummary?: string;
  changes?: Array<{
    type: 'addition' | 'deletion' | 'modification';
    position: number;
    text: string;
    userId: mongoose.Types.ObjectId;
    timestamp: Date;
  }>;
  createdAt: Date;
}

const ContractVersionSchema = new Schema<IContractVersion>(
  {
    contractId: {
      type: Schema.Types.ObjectId,
      ref: 'Contract',
      required: true,
      index: true,
    },
    versionNumber: {
      type: Number,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    changeSummary: {
      type: String,
      trim: true,
    },
    changes: [{
      type: {
        type: String,
        enum: ['addition', 'deletion', 'modification'],
      },
      position: Number,
      text: String,
      userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
      timestamp: Date,
    }],
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

ContractVersionSchema.index({ contractId: 1, versionNumber: -1 });

const ContractVersion: Model<IContractVersion> = mongoose.models.ContractVersion || mongoose.model<IContractVersion>('ContractVersion', ContractVersionSchema);

export default ContractVersion;

