import mongoose, { Schema, Document, Model } from 'mongoose';
import './Company'; // Ensure Company model is registered
import './User'; // Ensure User model is registered

export interface IIntegration extends Document {
  name: string;
  type: 'sap' | 'nebim' | 'logo' | 'netsis' | 'custom';
  companyId: mongoose.Types.ObjectId;
  isActive: boolean;
  config: {
    apiEndpoint?: string;
    apiKey?: string;
    username?: string;
    password?: string;
    database?: string;
    port?: number;
    customFields?: Record<string, any>;
  };
  mapping: {
    // Variable name mapping: contract variable name -> ERP field name
    variableMappings?: Record<string, string>;
    // Field mappings for data extraction
    fieldMappings?: Record<string, string>;
  };
  schedule: {
    enabled: boolean;
    frequency: 'hourly' | 'daily' | 'weekly' | 'monthly';
    time?: string; // HH:mm format
    dayOfWeek?: number; // 0-6 for weekly
    dayOfMonth?: number; // 1-31 for monthly
  };
  lastSyncAt?: Date;
  lastSyncStatus?: 'success' | 'error' | 'pending';
  lastSyncError?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const IntegrationSchema = new Schema<IIntegration>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['sap', 'nebim', 'logo', 'netsis', 'custom'],
      required: true,
      index: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    config: {
      apiEndpoint: String,
      apiKey: String,
      username: String,
      password: String, // Should be encrypted in production
      database: String,
      port: Number,
      customFields: Schema.Types.Mixed,
    },
    mapping: {
      variableMappings: Schema.Types.Mixed,
      fieldMappings: Schema.Types.Mixed,
    },
    schedule: {
      enabled: {
        type: Boolean,
        default: false,
      },
      frequency: {
        type: String,
        enum: ['hourly', 'daily', 'weekly', 'monthly'],
        default: 'daily',
      },
      time: String,
      dayOfWeek: Number,
      dayOfMonth: Number,
    },
    lastSyncAt: Date,
    lastSyncStatus: {
      type: String,
      enum: ['success', 'error', 'pending'],
    },
    lastSyncError: String,
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

IntegrationSchema.index({ companyId: 1, isActive: 1 });
IntegrationSchema.index({ type: 1, isActive: 1 });

const Integration: Model<IIntegration> =
  mongoose.models.Integration || mongoose.model<IIntegration>('Integration', IntegrationSchema);

export default Integration;

