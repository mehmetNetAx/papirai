import mongoose, { Schema, Document, Model } from 'mongoose';

export type MasterVariableType = 
  | 'endDate' 
  | 'startDate'
  | 'terminationPeriod' 
  | 'terminationDeadline' 
  | 'contractValue' 
  | 'currency'
  | 'renewalDate'
  | 'counterparty'
  | 'contractType'
  | 'other';

export interface IContractVariable extends Document {
  contractId: mongoose.Types.ObjectId;
  name: string;
  value: string | number | Date;
  type: 'text' | 'number' | 'date' | 'currency' | 'percentage' | 'boolean';
  taggedText: string; // The original text that was tagged
  position?: {
    start: number;
    end: number;
  };
  metadata?: {
    unit?: string;
    format?: string;
    validationRules?: Record<string, any>;
    description?: string;
  };
  isComplianceTracked: boolean;
  isMaster: boolean; // Whether this is a master variable
  masterType?: MasterVariableType; // Type of master variable if isMaster is true
  createdAt: Date;
  updatedAt: Date;
}

const ContractVariableSchema = new Schema<IContractVariable>(
  {
    contractId: {
      type: Schema.Types.ObjectId,
      ref: 'Contract',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    value: {
      type: Schema.Types.Mixed,
      required: true,
    },
    type: {
      type: String,
      enum: ['text', 'number', 'date', 'currency', 'percentage', 'boolean'],
      required: true,
    },
    taggedText: {
      type: String,
      required: true,
    },
    position: {
      start: Number,
      end: Number,
    },
    metadata: {
      unit: String,
      format: String,
      validationRules: Schema.Types.Mixed,
      description: String,
    },
    isComplianceTracked: {
      type: Boolean,
      default: false,
      index: true,
    },
    isMaster: {
      type: Boolean,
      default: false,
      index: true,
    },
    masterType: {
      type: String,
      enum: ['endDate', 'startDate', 'terminationPeriod', 'terminationDeadline', 'contractValue', 'currency', 'renewalDate', 'counterparty', 'contractType', 'other'],
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

ContractVariableSchema.index({ contractId: 1, name: 1 });
ContractVariableSchema.index({ contractId: 1, isComplianceTracked: 1 });
ContractVariableSchema.index({ contractId: 1, isMaster: 1 });
ContractVariableSchema.index({ contractId: 1, masterType: 1 });
ContractVariableSchema.index({ isMaster: 1, masterType: 1 });

const ContractVariable: Model<IContractVariable> = mongoose.models.ContractVariable || mongoose.model<IContractVariable>('ContractVariable', ContractVariableSchema);

export default ContractVariable;

