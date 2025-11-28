import connectDB from '@/lib/db/connection';
import Integration from '@/lib/db/models/Integration';
import Contract from '@/lib/db/models/Contract';
import { createIntegrationAdapter } from './factory';

/**
 * Run compliance check for all active integrations
 */
export async function runAllIntegrationChecks(): Promise<void> {
  await connectDB();

  const integrations = await Integration.find({ isActive: true }).lean();

  for (const integration of integrations) {
    try {
      await runIntegrationCheck(integration._id.toString());
    } catch (error: any) {
      console.error(`Error running check for integration ${integration._id}:`, error);
      
      // Update integration status
      await Integration.findByIdAndUpdate(integration._id, {
        lastSyncStatus: 'error',
        lastSyncError: error.message,
      });
    }
  }
}

/**
 * Run compliance check for a specific integration
 */
export async function runIntegrationCheck(integrationId: string): Promise<void> {
  await connectDB();

  const integration = await Integration.findById(integrationId).lean();
  if (!integration || !integration.isActive) {
    throw new Error('Integration not found or not active');
  }

  // Get all contracts for this company that have compliance-tracked variables
  const contracts = await Contract.find({
    companyId: integration.companyId,
    isActive: true,
  }).lean();

  // Create adapter
  const adapter = createIntegrationAdapter(
    integration.type,
    integration.config,
    integration.mapping?.variableMappings || {},
    integration.mapping?.fieldMappings || {}
  );

  let successCount = 0;
  let errorCount = 0;
  let lastError: string | null = null;

  // Run compliance check for each contract
  for (const contract of contracts) {
    try {
      await adapter.runComplianceCheck(contract._id.toString());
      successCount++;
    } catch (error: any) {
      errorCount++;
      lastError = error.message;
      console.error(`Error checking contract ${contract._id}:`, error);
    }
  }

  // Update integration status
  await Integration.findByIdAndUpdate(integrationId, {
    lastSyncAt: new Date(),
    lastSyncStatus: errorCount === 0 ? 'success' : errorCount < contracts.length ? 'error' : 'error',
    lastSyncError: lastError || undefined,
  });
}

/**
 * Run compliance check for a specific contract using its integration
 */
export async function runContractComplianceCheck(contractId: string): Promise<void> {
  await connectDB();

  const contract = await Contract.findById(contractId).lean();
  if (!contract) {
    throw new Error('Contract not found');
  }

  // Find active integration for this company
  const integration = await Integration.findOne({
    companyId: contract.companyId,
    isActive: true,
  }).lean();

  if (!integration) {
    throw new Error('No active integration found for this contract');
  }

  // Create adapter and run check
  const adapter = createIntegrationAdapter(
    integration.type,
    integration.config,
    integration.mapping?.variableMappings || {},
    integration.mapping?.fieldMappings || {}
  );

  await adapter.runComplianceCheck(contractId);
}

