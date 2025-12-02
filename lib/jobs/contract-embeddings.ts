import connectDB from '@/lib/db/connection';
import Contract from '@/lib/db/models/Contract';
import ContractEmbedding from '@/lib/db/models/ContractEmbedding';
import { generateContractEmbeddings } from '@/lib/services/ai/embedding';
import mongoose from 'mongoose';

/**
 * Update embeddings for a contract
 */
export async function updateContractEmbeddings(contractId: string): Promise<void> {
  await connectDB();

  const contract = await Contract.findById(contractId).lean();
  if (!contract) {
    throw new Error('Contract not found');
  }

  // Check if embeddings exist and if contract has been updated
  const existingEmbeddings = await ContractEmbedding.findOne({
    contractId: new mongoose.Types.ObjectId(contractId),
  }).lean();

  if (existingEmbeddings) {
    const embeddingAge = new Date(existingEmbeddings.updatedAt || existingEmbeddings.createdAt).getTime();
    const contractAge = contract.updatedAt ? new Date(contract.updatedAt).getTime() : 0;

    // If contract hasn't been updated since embeddings were created, skip
    if (contractAge <= embeddingAge) {
      return;
    }
  }

  try {
    await generateContractEmbeddings(contractId);
  } catch (error) {
    console.error(`Error updating embeddings for contract ${contractId}:`, error);
    throw error;
  }
}

/**
 * Update embeddings for all contracts that need them
 */
export async function updateEmbeddingsForAll(): Promise<void> {
  await connectDB();

  // Get all active contracts
  const contracts = await Contract.find({ isActive: true })
    .select('_id updatedAt')
    .lean();

  console.log(`Updating embeddings for ${contracts.length} contracts...`);

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const contract of contracts) {
    try {
      const contractId = contract._id.toString();
      
      // Check if update is needed
      const existingEmbeddings = await ContractEmbedding.findOne({
        contractId: new mongoose.Types.ObjectId(contractId),
      }).lean();

      if (existingEmbeddings) {
        const embeddingAge = new Date(existingEmbeddings.updatedAt || existingEmbeddings.createdAt).getTime();
        const contractAge = contract.updatedAt ? new Date(contract.updatedAt).getTime() : 0;

        if (contractAge <= embeddingAge) {
          skipped++;
          continue;
        }
      }

      await generateContractEmbeddings(contractId);
      updated++;
    } catch (error) {
      console.error(`Error processing contract ${contract._id}:`, error);
      errors++;
    }
  }

  console.log(`Embedding update completed: ${updated} updated, ${skipped} skipped, ${errors} errors`);
}

