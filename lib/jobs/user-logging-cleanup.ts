import { cleanupOldLogs } from '@/lib/services/user-logging';
import connectDB from '@/lib/db/connection';
import LoggingSettings from '@/lib/db/models/LoggingSettings';

/**
 * Scheduled job to cleanup old user activity logs
 * This should be called based on the schedule in LoggingSettings
 */
export async function runUserLoggingCleanup(): Promise<void> {
  try {
    console.log('[User Logging Cleanup Job] Starting cleanup...');
    await connectDB();
    
    // Check if auto cleanup is enabled
    const settings = await LoggingSettings.findOne().lean();
    if (!settings || !settings.autoCleanupEnabled) {
      console.log('[User Logging Cleanup Job] Auto cleanup is disabled, skipping...');
      return;
    }
    
    const result = await cleanupOldLogs();
    
    console.log('[User Logging Cleanup Job] Cleanup completed:', {
      deleted: result.deleted,
      usersAffected: result.usersAffected,
    });
  } catch (error) {
    console.error('[User Logging Cleanup Job] Error during cleanup:', error);
    throw error;
  }
}

/**
 * Schedule periodic cleanup for user activity logs
 * This can be called from your cron job scheduler or task runner
 */
export function scheduleUserLoggingCleanup() {
  // This function can be used to set up scheduled tasks
  // For example, using node-cron or a similar library:
  // 
  // import cron from 'node-cron';
  // import LoggingSettings from '@/lib/db/models/LoggingSettings';
  // 
  // // Run based on schedule from settings
  // async function runScheduledCleanup() {
  //   const settings = await LoggingSettings.findOne().lean();
  //   if (settings?.autoCleanupEnabled && settings?.autoCleanupSchedule) {
  //     cron.schedule(settings.autoCleanupSchedule, async () => {
  //       await runUserLoggingCleanup();
  //     });
  //   }
  // }
  //
  // Or use a cloud scheduler service like Vercel Cron, AWS EventBridge, etc.
  
  console.log('[User Logging Cleanup Job] Schedule setup - use your preferred cron scheduler');
  console.log('[User Logging Cleanup Job] Recommended: Run daily at 2 AM (default schedule)');
}


