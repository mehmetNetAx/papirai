import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ILoggingSettings extends Document {
  // System-wide settings
  globalEnabled: boolean;
  globalLogLevels: ('info' | 'warning' | 'error' | 'debug')[];
  globalActivityTypes: string[]; // Which activity types to log globally
  
  // User-specific settings (stored as Map)
  userSettings: Map<string, {
    enabled: boolean;
    logLevels: ('info' | 'warning' | 'error' | 'debug')[];
    activityTypes: string[];
  }>;
  
  // Retention settings
  retentionDays: number; // How many days to keep logs (0 = keep forever)
  autoCleanupEnabled: boolean;
  autoCleanupSchedule: string; // Cron expression for cleanup job
  
  // Storage settings
  maxLogsPerUser: number; // Maximum logs per user (0 = unlimited)
  
  // Privacy settings
  logIpAddress: boolean;
  logUserAgent: boolean;
  logRequestDetails: boolean;
  
  // Updated by
  updatedBy: mongoose.Types.ObjectId;
  updatedAt: Date;
  createdAt: Date;
}

const LoggingSettingsSchema = new Schema<ILoggingSettings>(
  {
    globalEnabled: {
      type: Boolean,
      default: false,
    },
    globalLogLevels: {
      type: [String],
      enum: ['info', 'warning', 'error', 'debug'],
      default: ['info', 'warning', 'error'],
    },
    globalActivityTypes: {
      type: [String],
      default: ['login', 'logout', 'error', 'data_modification'],
    },
    userSettings: {
      type: Map,
      of: {
        enabled: { type: Boolean, default: true },
        logLevels: { type: [String], enum: ['info', 'warning', 'error', 'debug'] },
        activityTypes: { type: [String] },
      },
      default: new Map(),
    },
    retentionDays: {
      type: Number,
      default: 90, // Keep logs for 90 days by default
      min: 0,
    },
    autoCleanupEnabled: {
      type: Boolean,
      default: false,
    },
    autoCleanupSchedule: {
      type: String,
      default: '0 2 * * *', // Daily at 2 AM
    },
    maxLogsPerUser: {
      type: Number,
      default: 10000, // Max 10k logs per user
      min: 0,
    },
    logIpAddress: {
      type: Boolean,
      default: true,
    },
    logUserAgent: {
      type: Boolean,
      default: true,
    },
    logRequestDetails: {
      type: Boolean,
      default: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Ensure only one settings document exists
LoggingSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

const LoggingSettings: Model<ILoggingSettings> = 
  mongoose.models.LoggingSettings || 
  mongoose.model<ILoggingSettings>('LoggingSettings', LoggingSettingsSchema);

export default LoggingSettings;


