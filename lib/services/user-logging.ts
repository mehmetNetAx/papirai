import connectDB from '@/lib/db/connection';
import UserActivityLog, { ActivityType, LogLevel, IUserActivityLog } from '@/lib/db/models/UserActivityLog';
import LoggingSettings from '@/lib/db/models/LoggingSettings';
import User from '@/lib/db/models/User';
import mongoose from 'mongoose';

export interface LogActivityParams {
  userId: string;
  activityType: ActivityType;
  level?: LogLevel;
  action: string;
  resourceType?: string;
  resourceId?: string;
  resourceTitle?: string;
  details?: Record<string, any>;
  url?: string;
  method?: string;
  statusCode?: number;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  duration?: number;
  errorMessage?: string;
  errorStack?: string;
}

/**
 * Check if logging is enabled for a user
 */
export async function isLoggingEnabledForUser(userId: string): Promise<boolean> {
  try {
    await connectDB();
    
    // Check user-specific setting first
    const user = await User.findById(userId).select('loggingEnabled').lean();
    
    // If user has explicitly enabled logging, return true (override global settings)
    if (user?.loggingEnabled === true) {
      return true;
    }
    
    // If user has explicitly disabled logging, return false
    if (user?.loggingEnabled === false) {
      return false;
    }
    
    // If user setting is null/undefined, check global settings
    const settings = await LoggingSettings.findOne().lean();
    if (!settings?.globalEnabled) {
      return false;
    }
    
    // Check user-specific settings in LoggingSettings
    // Note: .lean() converts Map to plain object, so we access it as an object
    if (settings?.userSettings) {
      const userSettingsObj = settings.userSettings as any;
      const userSetting = userSettingsObj instanceof Map 
        ? userSettingsObj.get(userId)
        : userSettingsObj[userId];
      if (userSetting && userSetting.enabled === false) {
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('[UserLogging] Error checking logging status:', error);
    return false; // Fail safe - don't log if we can't verify
  }
}

/**
 * Check if a specific activity type and level should be logged
 */
export async function shouldLogActivity(
  userId: string,
  activityType: ActivityType,
  level: LogLevel
): Promise<boolean> {
  try {
    await connectDB();
    
    // Check user-specific setting first
    const user = await User.findById(userId).select('loggingEnabled').lean();
    
    // If user has explicitly enabled logging, allow logging (bypass global settings)
    // Only check user-specific filters if they exist in LoggingSettings
    if (user?.loggingEnabled === true) {
      const settings = await LoggingSettings.findOne().lean();
      
      // Check user-specific settings in LoggingSettings (optional filters)
      // Note: .lean() converts Map to plain object, so we access it as an object
      if (settings?.userSettings) {
        const userSettingsObj = settings.userSettings as any;
        const userSetting = userSettingsObj instanceof Map 
          ? userSettingsObj.get(userId)
          : userSettingsObj[userId];
        if (userSetting) {
          // If user has specific log levels defined, check them
          if (userSetting.logLevels && userSetting.logLevels.length > 0 && !userSetting.logLevels.includes(level)) {
            console.log(`[UserLogging] User ${userId} has logging enabled but level ${level} is filtered out`);
            return false;
          }
          // If user has specific activity types defined, check them
          if (userSetting.activityTypes && userSetting.activityTypes.length > 0 && !userSetting.activityTypes.includes(activityType)) {
            console.log(`[UserLogging] User ${userId} has logging enabled but activityType ${activityType} is filtered out`);
            return false;
          }
        }
      }
      
      // User logging is explicitly enabled, allow logging (with optional user-specific filters applied above)
      console.log(`[UserLogging] User ${userId} has logging explicitly enabled, allowing log for ${activityType}/${level}`);
      return true;
    }
    
    // If user has explicitly disabled logging, return false
    if (user?.loggingEnabled === false) {
      return false;
    }
    
    // If user setting is null/undefined, check global settings
    const settings = await LoggingSettings.findOne().lean();
    if (!settings?.globalEnabled) {
      return false;
    }
    
    // Check global log levels (if empty array, allow all levels)
    if (settings.globalLogLevels && settings.globalLogLevels.length > 0 && !settings.globalLogLevels.includes(level)) {
      return false;
    }
    
    // Check global activity types (if empty array, allow all types)
    if (settings.globalActivityTypes && settings.globalActivityTypes.length > 0 && !settings.globalActivityTypes.includes(activityType)) {
      return false;
    }
    
    // Check user-specific settings in LoggingSettings
    // Note: .lean() converts Map to plain object, so we access it as an object
    if (settings.userSettings) {
      const userSettingsObj = settings.userSettings as any;
      const userSetting = userSettingsObj instanceof Map 
        ? userSettingsObj.get(userId)
        : userSettingsObj[userId];
      if (userSetting) {
        if (userSetting.enabled === false) {
          return false;
        }
        if (userSetting.logLevels && userSetting.logLevels.length > 0 && !userSetting.logLevels.includes(level)) {
          return false;
        }
        if (userSetting.activityTypes && userSetting.activityTypes.length > 0 && !userSetting.activityTypes.includes(activityType)) {
          return false;
        }
      }
    }
    
    return true;
  } catch (error) {
    console.error('[UserLogging] Error checking if should log:', error);
    return false;
  }
}

/**
 * Log user activity
 */
export async function logUserActivity(params: LogActivityParams): Promise<void> {
  try {
    const { userId, level = 'info', activityType } = params;
    
    console.log(`[UserLogging] logUserActivity called for user ${userId}, activityType: ${activityType}, level: ${level}`);
    
    // Check if we should log this activity
    const shouldLog = await shouldLogActivity(userId, activityType, level);
    console.log(`[UserLogging] shouldLogActivity returned: ${shouldLog} for user ${userId}`);
    
    if (!shouldLog) {
      console.log(`[UserLogging] Skipping log for user ${userId} - logging disabled or filtered`);
      return; // Silently skip if logging is disabled
    }
    
    await connectDB();
    
    // Get settings for privacy options
    const settings = await LoggingSettings.findOne().lean();
    
    const logData: Partial<IUserActivityLog> = {
      userId: new mongoose.Types.ObjectId(userId),
      activityType,
      level,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId ? new mongoose.Types.ObjectId(params.resourceId) : undefined,
      resourceTitle: params.resourceTitle,
      details: params.details,
      url: params.url,
      method: params.method,
      statusCode: params.statusCode,
      sessionId: params.sessionId,
      duration: params.duration,
      errorMessage: params.errorMessage,
      errorStack: params.errorStack,
      timestamp: new Date(),
    };
    
    // Apply privacy settings
    if (settings?.logIpAddress !== false) {
      logData.ipAddress = params.ipAddress;
    }
    if (settings?.logUserAgent !== false) {
      logData.userAgent = params.userAgent;
    }
    
    await UserActivityLog.create(logData);
    
    // Check if user has exceeded max logs limit
    if (settings?.maxLogsPerUser && settings.maxLogsPerUser > 0) {
      const userLogCount = await UserActivityLog.countDocuments({ userId: logData.userId });
      if (userLogCount > settings.maxLogsPerUser) {
        // Delete oldest logs
        const logsToDelete = userLogCount - settings.maxLogsPerUser;
        const oldestLogs = await UserActivityLog.find({ userId: logData.userId })
          .sort({ timestamp: 1 })
          .limit(logsToDelete)
          .select('_id')
          .lean();
        
        if (oldestLogs.length > 0) {
          await UserActivityLog.deleteMany({
            _id: { $in: oldestLogs.map(log => log._id) },
          });
        }
      }
    }
  } catch (error) {
    // Don't throw - logging should never break the main flow
    console.error('[UserLogging] Error logging user activity:', error);
  }
}

/**
 * Get user activity logs
 */
export async function getUserActivityLogs(
  userId: string,
  filters: {
    activityType?: ActivityType;
    level?: LogLevel;
    startDate?: Date;
    endDate?: Date;
    resourceType?: string;
    resourceId?: string;
    action?: string;
  } = {},
  options: {
    limit?: number;
    skip?: number;
  } = {}
) {
  await connectDB();
  
  const query: any = { userId: new mongoose.Types.ObjectId(userId) };
  
  if (filters.activityType) query.activityType = filters.activityType;
  if (filters.level) query.level = filters.level;
  if (filters.resourceType) query.resourceType = filters.resourceType;
  if (filters.resourceId) query.resourceId = new mongoose.Types.ObjectId(filters.resourceId);
  if (filters.action) query.action = { $regex: filters.action, $options: 'i' };
  
  if (filters.startDate || filters.endDate) {
    query.timestamp = {};
    if (filters.startDate) query.timestamp.$gte = filters.startDate;
    if (filters.endDate) query.timestamp.$lte = filters.endDate;
  }
  
  const limit = options.limit || 100;
  const skip = options.skip || 0;
  
  const logs = await UserActivityLog.find(query)
    .populate('userId', 'name email')
    .sort({ timestamp: -1 })
    .limit(limit)
    .skip(skip)
    .lean();
  
  const total = await UserActivityLog.countDocuments(query);
  
  return { logs, total };
}

/**
 * Delete user activity logs
 */
export async function deleteUserActivityLogs(
  userId: string,
  filters: {
    beforeDate?: Date;
    activityType?: ActivityType;
    level?: LogLevel;
  } = {}
): Promise<number> {
  await connectDB();
  
  const query: any = { userId: new mongoose.Types.ObjectId(userId) };
  
  if (filters.beforeDate) {
    query.timestamp = { $lt: filters.beforeDate };
  }
  if (filters.activityType) query.activityType = filters.activityType;
  if (filters.level) query.level = filters.level;
  
  const result = await UserActivityLog.deleteMany(query);
  return result.deletedCount || 0;
}

/**
 * Cleanup old logs based on retention settings
 */
export async function cleanupOldLogs(): Promise<{ deleted: number; usersAffected: number }> {
  try {
    await connectDB();
    
    const settings = await LoggingSettings.findOne().lean();
    if (!settings || !settings.autoCleanupEnabled || !settings.retentionDays || settings.retentionDays <= 0) {
      return { deleted: 0, usersAffected: 0 };
    }
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - settings.retentionDays);
    
    const result = await UserActivityLog.deleteMany({
      timestamp: { $lt: cutoffDate },
    });
    
    // Count affected users
    const affectedUsers = await UserActivityLog.distinct('userId', {
      timestamp: { $lt: cutoffDate },
    });
    
    return {
      deleted: result.deletedCount || 0,
      usersAffected: affectedUsers.length,
    };
  } catch (error) {
    console.error('[UserLogging] Error cleaning up old logs:', error);
    throw error;
  }
}

/**
 * Get logging statistics for a user
 */
export async function getUserLoggingStats(userId: string) {
  await connectDB();
  
  const userObjectId = new mongoose.Types.ObjectId(userId);
  
  const [
    totalLogs,
    logsByType,
    logsByLevel,
    recentErrors,
    lastActivity,
  ] = await Promise.all([
    UserActivityLog.countDocuments({ userId: userObjectId }),
    UserActivityLog.aggregate([
      { $match: { userId: userObjectId } },
      { $group: { _id: '$activityType', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    UserActivityLog.aggregate([
      { $match: { userId: userObjectId } },
      { $group: { _id: '$level', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    UserActivityLog.countDocuments({ userId: userObjectId, level: 'error' }),
    UserActivityLog.findOne({ userId: userObjectId })
      .sort({ timestamp: -1 })
      .select('timestamp')
      .lean(),
  ]);
  
  return {
    totalLogs,
    logsByType: logsByType.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {} as Record<string, number>),
    logsByLevel: logsByLevel.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {} as Record<string, number>),
    errorCount: recentErrors,
    lastActivity: lastActivity?.timestamp,
  };
}


