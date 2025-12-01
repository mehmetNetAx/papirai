import { checkAllDocumentExpirations, checkContractDocumentExpirations } from '@/lib/services/document-validity';
import connectDB from '@/lib/db/connection';

/**
 * Scheduled job to check document expirations
 * This should be called daily (e.g., via cron job or scheduled task)
 */
export async function runDocumentValidityCheck(): Promise<void> {
  try {
    console.log('[Document Validity Job] Starting document expiration check...');
    await connectDB();

    // Check all documents
    const allDocumentsResult = await checkAllDocumentExpirations();
    console.log('[Document Validity Job] All documents check:', allDocumentsResult);

    // Check contract attached documents
    const contractDocumentsResult = await checkContractDocumentExpirations();
    console.log('[Document Validity Job] Contract documents check:', contractDocumentsResult);

    console.log('[Document Validity Job] Document validity check completed successfully');
  } catch (error) {
    console.error('[Document Validity Job] Error during document validity check:', error);
    throw error;
  }
}

/**
 * Schedule periodic checks for document validity
 * This can be called from your cron job scheduler or task runner
 */
export function scheduleDocumentValidityChecks() {
  // This function can be used to set up scheduled tasks
  // For example, using node-cron or a similar library:
  // 
  // import cron from 'node-cron';
  // 
  // // Run daily at 9:00 AM
  // cron.schedule('0 9 * * *', async () => {
  //   await runDocumentValidityCheck();
  // });
  //
  // Or use a cloud scheduler service like Vercel Cron, AWS EventBridge, etc.
  
  console.log('[Document Validity Job] Schedule setup - use your preferred cron scheduler');
  console.log('[Document Validity Job] Recommended: Run daily at 9:00 AM');
}

