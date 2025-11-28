import { checkContractDeadlines } from '@/lib/services/master-variables';
import connectDB from '@/lib/db/connection';

/**
 * Scheduled job to check contract deadlines based on master variables
 * This should be called daily (e.g., via cron job or scheduled task)
 */
export async function runMasterVariablesDeadlineCheck(): Promise<void> {
  try {
    console.log('[Master Variables Job] Starting deadline check...');
    await connectDB();
    await checkContractDeadlines();
    console.log('[Master Variables Job] Deadline check completed successfully');
  } catch (error) {
    console.error('[Master Variables Job] Error during deadline check:', error);
    throw error;
  }
}

/**
 * Schedule periodic checks for master variables
 * This can be called from your cron job scheduler or task runner
 */
export function scheduleMasterVariablesChecks() {
  // This function can be used to set up scheduled tasks
  // For example, using node-cron or a similar library:
  // 
  // import cron from 'node-cron';
  // 
  // // Run daily at 9:00 AM
  // cron.schedule('0 9 * * *', async () => {
  //   await runMasterVariablesDeadlineCheck();
  // });
  //
  // Or use a cloud scheduler service like Vercel Cron, AWS EventBridge, etc.
  
  console.log('[Master Variables Job] Schedule setup - use your preferred cron scheduler');
  console.log('[Master Variables Job] Recommended: Run daily at 9:00 AM');
}

