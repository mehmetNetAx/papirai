import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IGlobalVariable extends Document {
  name: string;
  type: 'text' | 'number' | 'date' | 'currency' | 'percentage' | 'boolean';
  defaultValue?: string | number | Date;
  description?: string;
  category?: string; // e.g., 'payment', 'dates', 'amounts', 'general'
  metadata?: {
    unit?: string;
    format?: string;
    validationRules?: Record<string, any>;
  };
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const GlobalVariableSchema = new Schema<IGlobalVariable>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['text', 'number', 'date', 'currency', 'percentage', 'boolean'],
      required: true,
    },
    defaultValue: {
      type: Schema.Types.Mixed,
    },
    description: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      trim: true,
      index: true,
    },
    metadata: {
      unit: String,
      format: String,
      validationRules: Schema.Types.Mixed,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

GlobalVariableSchema.index({ name: 1, isActive: 1 });
GlobalVariableSchema.index({ category: 1, isActive: 1 });

const GlobalVariable: Model<IGlobalVariable> = mongoose.models.GlobalVariable || mongoose.model<IGlobalVariable>('GlobalVariable', GlobalVariableSchema);

export default GlobalVariable;

