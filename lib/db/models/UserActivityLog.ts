import mongoose, { Schema, Document, Model } from 'mongoose';

export type ActivityType = 
  | 'login' 
  | 'logout' 
  | 'page_view' 
  | 'navigation' 
  | 'api_call' 
  | 'error' 
  | 'warning' 
  | 'data_access' 
  | 'data_modification'
  | 'export'
  | 'search'
  | 'filter';

export type LogLevel = 'info' | 'warning' | 'error' | 'debug';

export interface IUserActivityLog extends Document {
  userId: mongoose.Types.ObjectId;
  activityType: ActivityType;
  level: LogLevel;
  action: string; // e.g., 'view_contract', 'edit_user', 'navigate_to_dashboard'
  resourceType?: string; // e.g., 'contract', 'user', 'document'
  resourceId?: mongoose.Types.ObjectId;
  resourceTitle?: string; // For easier reading
  details?: Record<string, any>; // Additional context
  url?: string; // Page/API endpoint
  method?: string; // HTTP method
  statusCode?: number; // HTTP status code
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  duration?: number; // Request duration in ms
  errorMessage?: string;
  errorStack?: string;
  timestamp: Date;
  createdAt: Date;
}

const UserActivityLogSchema = new Schema<IUserActivityLog>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    activityType: {
      type: String,
      enum: ['login', 'logout', 'page_view', 'navigation', 'api_call', 'error', 'warning', 'data_access', 'data_modification', 'export', 'search', 'filter'],
      required: true,
      index: true,
    },
    level: {
      type: String,
      enum: ['info', 'warning', 'error', 'debug'],
      default: 'info',
      index: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    resourceType: {
      type: String,
      index: true,
    },
    resourceId: {
      type: Schema.Types.ObjectId,
      index: true,
    },
    resourceTitle: {
      type: String,
    },
    details: {
      type: Schema.Types.Mixed,
      default: {},
    },
    url: {
      type: String,
      index: true,
    },
    method: {
      type: String,
    },
    statusCode: {
      type: Number,
      index: true,
    },
    ipAddress: {
      type: String,
      index: true,
    },
    userAgent: {
      type: String,
    },
    sessionId: {
      type: String,
      index: true,
    },
    duration: {
      type: Number,
    },
    errorMessage: {
      type: String,
    },
    errorStack: {
      type: String,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for common queries
UserActivityLogSchema.index({ userId: 1, timestamp: -1 });
UserActivityLogSchema.index({ userId: 1, activityType: 1, timestamp: -1 });
UserActivityLogSchema.index({ userId: 1, level: 1, timestamp: -1 });
UserActivityLogSchema.index({ resourceType: 1, resourceId: 1, timestamp: -1 });
UserActivityLogSchema.index({ timestamp: -1 }); // For cleanup queries
UserActivityLogSchema.index({ level: 1, timestamp: -1 }); // For error tracking

// TTL index for automatic cleanup (optional - can be managed manually)
// UserActivityLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 0 }); // Disabled - manual cleanup preferred

const UserActivityLog: Model<IUserActivityLog> = 
  mongoose.models.UserActivityLog || 
  mongoose.model<IUserActivityLog>('UserActivityLog', UserActivityLogSchema);

export default UserActivityLog;


