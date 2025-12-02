import connectDB from '@/lib/db/connection';
import Contract from '@/lib/db/models/Contract';
import ContractSummary from '@/lib/db/models/ContractSummary';
import { getAIProvider } from '@/lib/services/ai/factory';
import { htmlToText } from '@/lib/services/rag/chunker';
import mongoose from 'mongoose';

/**
 * Generate automatic summary for a contract
 */
export async function generateAutoSummary(contractId: string): Promise<void> {
  await connectDB();

  const contract = await Contract.findById(contractId).lean();
  if (!contract) {
    throw new Error('Contract not found');
  }

  // Check if auto summary already exists and is recent (within 24 hours)
  const existingSummary = await ContractSummary.findOne({
    contractId: new mongoose.Types.ObjectId(contractId),
    summaryType: 'auto',
  })
    .sort({ createdAt: -1 })
    .lean();

  // Skip if summary exists and contract hasn't been updated recently
  if (existingSummary) {
    const summaryAge = Date.now() - new Date(existingSummary.createdAt).getTime();
    const contractAge = contract.updatedAt ? Date.now() - new Date(contract.updatedAt).getTime() : Infinity;
    
    // If summary is less than 24 hours old and contract hasn't been updated, skip
    if (summaryAge < 24 * 60 * 60 * 1000 && contractAge > summaryAge) {
      return;
    }
  }

  // Convert HTML to text
  const plainText = htmlToText(contract.content);

  if (!plainText || plainText.trim().length === 0) {
    return; // Skip empty contracts
  }

  try {
    // Generate summary using AI
    const provider = getAIProvider();
    const summaryResponse = await provider.generateSummary({
      content: plainText,
      maxLength: 500,
    });

    // Save summary to database
    await ContractSummary.findOneAndUpdate(
      {
        contractId: new mongoose.Types.ObjectId(contractId),
        summaryType: 'auto',
      },
      {
        contractId: new mongoose.Types.ObjectId(contractId),
        summaryType: 'auto',
        summary: summaryResponse.summary,
        generatedBy: 'system',
        model: summaryResponse.model,
        metadata: {
          tokenCount: summaryResponse.usage?.totalTokens,
          maxLength: 500,
        },
      },
      { upsert: true, new: true }
    );
  } catch (error) {
    console.error(`Error generating auto summary for contract ${contractId}:`, error);
    // Don't throw - this is a background job, failures shouldn't break the system
  }
}

/**
 * Generate auto summaries for all contracts that need them
 */
export async function generateAutoSummariesForAll(): Promise<void> {
  await connectDB();

  // Get all active contracts
  const contracts = await Contract.find({ isActive: true })
    .select('_id updatedAt')
    .lean();

  console.log(`Generating auto summaries for ${contracts.length} contracts...`);

  for (const contract of contracts) {
    try {
      await generateAutoSummary(contract._id.toString());
    } catch (error) {
      console.error(`Error processing contract ${contract._id}:`, error);
    }
  }

  console.log('Auto summary generation completed');
}

