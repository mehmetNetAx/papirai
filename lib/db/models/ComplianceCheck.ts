import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IComplianceCheck extends Document {
  contractId: mongoose.Types.ObjectId;
  variableId?: mongoose.Types.ObjectId;
  expectedValue: string | number | Date;
  actualValue: string | number | Date;
  status: 'compliant' | 'non_compliant' | 'warning' | 'pending';
  alertLevel: 'low' | 'medium' | 'high' | 'critical';
  deviation?: {
    type: 'price' | 'delivery_date' | 'quantity' | 'quality' | 'other';
    amount?: number;
    percentage?: number;
    description?: string;
  };
  source: 'manual' | 'sap' | 'other_integration';
  sourceData?: Record<string, any>;
  resolvedAt?: Date;
  resolvedBy?: mongoose.Types.ObjectId;
  resolutionNotes?: string;
  checkedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ComplianceCheckSchema = new Schema<IComplianceCheck>(
  {
    contractId: {
      type: Schema.Types.ObjectId,
      ref: 'Contract',
      required: true,
      index: true,
    },
    variableId: {
      type: Schema.Types.ObjectId,
      ref: 'ContractVariable',
      index: true,
    },
    expectedValue: {
      type: Schema.Types.Mixed,
      required: true,
    },
    actualValue: {
      type: Schema.Types.Mixed,
      required: true,
    },
    status: {
      type: String,
      enum: ['compliant', 'non_compliant', 'warning', 'pending'],
      default: 'pending',
      required: true,
      index: true,
    },
    alertLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
      required: true,
      index: true,
    },
    deviation: {
      type: {
        type: String,
        enum: ['price', 'delivery_date', 'quantity', 'quality', 'other'],
      },
      amount: Number,
      percentage: Number,
      description: String,
    },
    source: {
      type: String,
      enum: ['manual', 'sap', 'nebim', 'logo', 'netsis', 'other_integration'],
      required: true,
    },
    sourceData: {
      type: Schema.Types.Mixed,
      default: {},
    },
    resolvedAt: {
      type: Date,
    },
    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    resolutionNotes: {
      type: String,
      trim: true,
    },
    checkedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

ComplianceCheckSchema.index({ contractId: 1, status: 1, alertLevel: 1 });
ComplianceCheckSchema.index({ checkedAt: -1 });
ComplianceCheckSchema.index({ status: 1, alertLevel: 1 });

const ComplianceCheck: Model<IComplianceCheck> = mongoose.models.ComplianceCheck || mongoose.model<IComplianceCheck>('ComplianceCheck', ComplianceCheckSchema);

export default ComplianceCheck;

