import mongoose, { Schema, Document, Model } from 'mongoose';
// Import Workspace to ensure it's registered before Contract schema references it
import './Workspace';
// Import CompanyDocument to ensure it's registered before Contract schema references it
import './CompanyDocument';

export interface IContract extends Document {
  title: string;
  content: string; // Rich text content (HTML/JSON from TipTap)
  status: 'draft' | 'in_review' | 'pending_approval' | 'approved' | 'pending_signature' | 'executed' | 'expired' | 'terminated';
  workspaceId: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  currentVersionId?: mongoose.Types.ObjectId;
  contractType?: string;
  counterparty?: string; // String olarak karşı taraf (geriye dönük uyumluluk için)
  counterpartyId?: mongoose.Types.ObjectId; // Company referansı olarak karşı taraf
  attachedDocumentIds?: mongoose.Types.ObjectId[]; // Şirket arşivinden eklenen dokümanlar
  startDate: Date;
  endDate: Date;
  renewalDate?: Date;
  value?: number;
  currency?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  allowedEditors?: mongoose.Types.ObjectId[]; // Users who have edit permission for this specific contract
  assignedUsers?: mongoose.Types.ObjectId[]; // Users who have view-only access (especially external/counterparty users)
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ContractSchema = new Schema<IContract>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['draft', 'in_review', 'pending_approval', 'approved', 'pending_signature', 'executed', 'expired', 'terminated'],
      default: 'draft',
      required: true,
      index: true,
    },
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    currentVersionId: {
      type: Schema.Types.ObjectId,
      ref: 'ContractVersion',
    },
    contractType: {
      type: String,
      trim: true,
      index: true,
    },
    counterparty: {
      type: String,
      trim: true,
    },
    counterpartyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      index: true,
    },
    attachedDocumentIds: [{
      type: Schema.Types.ObjectId,
      ref: 'CompanyDocument',
      index: true,
    }],
    startDate: {
      type: Date,
      required: false, // Made optional for existing contracts, but should be set for new ones
      index: true,
    },
    endDate: {
      type: Date,
      required: false, // Made optional for existing contracts, but should be set for new ones
      index: true,
    },
    renewalDate: {
      type: Date,
      index: true,
    },
    value: {
      type: Number,
    },
    currency: {
      type: String,
      default: 'USD',
    },
    tags: [{
      type: String,
      trim: true,
    }],
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    allowedEditors: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
    }],
    assignedUsers: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
    }],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Full-text search index
ContractSchema.index({ title: 'text', content: 'text', tags: 'text' });
ContractSchema.index({ companyId: 1, workspaceId: 1, status: 1 });
ContractSchema.index({ endDate: 1, renewalDate: 1 });
ContractSchema.index({ assignedUsers: 1 });
ContractSchema.index({ counterpartyId: 1 });
ContractSchema.index({ attachedDocumentIds: 1 });

const Contract: Model<IContract> = mongoose.models.Contract || mongoose.model<IContract>('Contract', ContractSchema);

export default Contract;

