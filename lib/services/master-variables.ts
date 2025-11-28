import connectDB from '@/lib/db/connection';
import ContractVariable, { MasterVariableType } from '@/lib/db/models/ContractVariable';
import Contract from '@/lib/db/models/Contract';
import Notification from '@/lib/db/models/Notification';
import { sendEmailNotification } from './notification';
import User from '@/lib/db/models/User';
import mongoose from 'mongoose';

export interface MasterVariableData {
  endDate?: Date;
  startDate?: Date;
  terminationPeriod?: number; // in days
  terminationDeadline?: Date;
  contractValue?: number;
  currency?: string;
  renewalDate?: Date;
  counterparty?: string;
  contractType?: string;
}

/**
 * Calculate termination deadline based on endDate and terminationPeriod
 */
export function calculateTerminationDeadline(endDate: Date, terminationPeriod: number): Date {
  const deadline = new Date(endDate);
  deadline.setDate(deadline.getDate() - terminationPeriod);
  return deadline;
}

/**
 * Get all master variables for a contract
 */
export async function getMasterVariables(contractId: string): Promise<MasterVariableData> {
  await connectDB();
  
  // Convert contractId to ObjectId
  const contractObjectId = new mongoose.Types.ObjectId(contractId);
  
  // Find master variables - also include those with masterType even if isMaster is missing
  const masterVars = await ContractVariable.find({
    contractId: contractObjectId,
    $or: [
      { isMaster: true },
      { masterType: { $exists: true, $ne: null } },
    ],
  }).lean();

  const data: MasterVariableData = {};
  
  // Helper function to parse date safely
  const parseDate = (value: any): Date | null => {
    if (!value) return null;
    if (value instanceof Date) {
      return isNaN(value.getTime()) ? null : value;
    }
    if (typeof value === 'string') {
      const date = new Date(value);
      return isNaN(date.getTime()) ? null : date;
    }
    if (typeof value === 'number') {
      const date = new Date(value);
      return isNaN(date.getTime()) ? null : date;
    }
    return null;
  };

  for (const variable of masterVars) {
    switch (variable.masterType) {
      case 'endDate': {
        const parsed = parseDate(variable.value);
        if (parsed) data.endDate = parsed;
        break;
      }
      case 'startDate': {
        const parsed = parseDate(variable.value);
        if (parsed) data.startDate = parsed;
        break;
      }
      case 'terminationPeriod':
        data.terminationPeriod = typeof variable.value === 'number' ? variable.value : parseInt(variable.value as string, 10);
        break;
      case 'terminationDeadline': {
        const parsed = parseDate(variable.value);
        if (parsed) data.terminationDeadline = parsed;
        break;
      }
      case 'contractValue':
        data.contractValue = typeof variable.value === 'number' ? variable.value : parseFloat(variable.value as string);
        break;
      case 'currency':
        data.currency = variable.value as string;
        break;
      case 'renewalDate': {
        const parsed = parseDate(variable.value);
        if (parsed) data.renewalDate = parsed;
        break;
      }
      case 'counterparty':
        data.counterparty = variable.value as string;
        break;
      case 'contractType':
        data.contractType = variable.value as string;
        break;
    }
  }

  // Auto-calculate terminationDeadline if not set but endDate and terminationPeriod are available
  if (!data.terminationDeadline && data.endDate && data.terminationPeriod) {
    data.terminationDeadline = calculateTerminationDeadline(data.endDate, data.terminationPeriod);
  }

  return data;
}

/**
 * Set a master variable for a contract
 */
export async function setMasterVariable(
  contractId: string,
  masterType: MasterVariableType,
  value: string | number | Date,
  name?: string
): Promise<void> {
  await connectDB();

  // Convert contractId to ObjectId
  const contractObjectId = new mongoose.Types.ObjectId(contractId);
  
  const contract = await Contract.findById(contractObjectId);
  if (!contract) {
    throw new Error('Contract not found');
  }

  // Default names for master variables
  const defaultNames: Record<MasterVariableType, string> = {
    endDate: 'Bitiş Tarihi',
    startDate: 'Başlangıç Tarihi',
    terminationPeriod: 'Fesih Süresi',
    terminationDeadline: 'Fesih İçin Son Tarih',
    contractValue: 'Sözleşme Tutarı',
    currency: 'Para Birimi',
    renewalDate: 'Yenileme Tarihi',
    counterparty: 'Karşı Taraf',
    contractType: 'Sözleşme Tipi',
    other: name || 'Diğer',
  };

  const variableName = name || defaultNames[masterType];

  // Determine variable type based on masterType
  let variableType: 'text' | 'number' | 'date' | 'currency' | 'percentage' | 'boolean' = 'text';
  
  if (masterType === 'endDate' || masterType === 'startDate' || masterType === 'terminationDeadline' || masterType === 'renewalDate') {
    variableType = 'date';
  } else if (masterType === 'contractValue' || masterType === 'terminationPeriod') {
    variableType = 'number';
  } else if (masterType === 'currency') {
    variableType = 'currency';
  }

  // Declare masterVar variable
  let masterVar: any = null;

  // First, check if variable already exists
  let existingVar = await ContractVariable.findOne({
    contractId: contractObjectId,
    name: variableName,
  });

  if (existingVar) {
    // Update existing variable
    existingVar.value = value;
    existingVar.type = variableType;
    existingVar.isMaster = true;
    existingVar.masterType = masterType;
    await existingVar.save();
    masterVar = existingVar;
  } else {
    // Create new variable - use create method which respects schema
    // Check if schema has masterType field
    const schema = ContractVariable.schema;
    const hasMasterType = schema.paths.masterType;
    console.log('Schema check:', {
      hasMasterType: !!hasMasterType,
      schemaPaths: Object.keys(schema.paths),
    });
    
    if (!hasMasterType) {
      console.error('WARNING: masterType field not found in schema!');
      console.error('Available paths:', Object.keys(schema.paths));
    }
    
    try {
      masterVar = await ContractVariable.create({
        contractId: contractObjectId,
        name: variableName,
        value: value,
        type: variableType,
        taggedText: `{{${variableName}}}`,
        isMaster: true,
        masterType: masterType,
        isComplianceTracked: false,
      });
    } catch (createError: any) {
      console.error('Error creating master variable:', createError);
      // If create fails due to strict mode, try with updateOne
      if (createError.message?.includes('not in schema') || createError.message?.includes('strict mode')) {
        console.log('Retrying with updateOne approach...');
        // Create without masterType first
        masterVar = await ContractVariable.create({
          contractId: contractObjectId,
          name: variableName,
          value: value,
          type: variableType,
          taggedText: `{{${variableName}}}`,
          isComplianceTracked: false,
        });
        // Then update with masterType
        await ContractVariable.updateOne(
          { _id: masterVar._id },
          {
            $set: {
              isMaster: true,
              masterType: masterType,
            },
          }
        );
        // Reload to get updated document
        masterVar = await ContractVariable.findById(masterVar._id);
        if (!masterVar) {
          throw new Error('Failed to create master variable');
        }
      } else {
        throw createError;
      }
    }
  }

  // Ensure masterVar is set
  if (!masterVar) {
    throw new Error('Failed to create or update master variable - masterVar is null');
  }

  // Force update to ensure fields are persisted (in case of any issues)
  await ContractVariable.updateOne(
    { _id: masterVar._id },
    {
      $set: {
        isMaster: true,
        masterType: masterType,
      },
    }
  );

  console.log('Master variable saved:', {
    _id: masterVar._id?.toString(),
    name: masterVar.name,
    isMaster: masterVar.isMaster,
    masterType: masterVar.masterType,
  });

  // Verify from database
  const verify = await ContractVariable.findById(masterVar._id).lean();
  
  if (!verify) {
    throw new Error('Failed to verify created master variable');
  }

  console.log('Verified from DB:', {
    _id: verify._id?.toString(),
    isMaster: verify.isMaster,
    masterType: verify.masterType,
  });

  // Final verification - if fields are still missing, force update
  if (verify.isMaster !== true || !verify.masterType) {
    console.warn('Fields missing after save, forcing update...');
    
    const forceUpdate = await ContractVariable.updateOne(
      { _id: masterVar._id },
      {
        $set: {
          isMaster: true,
          masterType: masterType,
        },
      }
    );
    
    console.log('Force update result:', {
      matched: forceUpdate.matchedCount,
      modified: forceUpdate.modifiedCount,
    });
    
    // Final verification
    const finalVerify = await ContractVariable.findById(masterVar._id).lean();
    if (!finalVerify || finalVerify.isMaster !== true || !finalVerify.masterType) {
      throw new Error(
        `CRITICAL: Unable to persist isMaster and masterType fields. ` +
        `This indicates a schema or database issue. ` +
        `Document: ${JSON.stringify(finalVerify || verify, null, 2)}`
      );
    }
  }

  // Sync with Contract model if applicable
  await syncMasterVariablesToContract(contractId);
}

/**
 * Sync master variables to Contract model fields
 */
export async function syncMasterVariablesToContract(contractId: string): Promise<void> {
  await connectDB();

  // Convert contractId to ObjectId
  const contractObjectId = new mongoose.Types.ObjectId(contractId);
  
  const masterVars = await getMasterVariables(contractId);
  const contract = await Contract.findById(contractObjectId);
  
  if (!contract) {
    return;
  }

  let updated = false;

  if (masterVars.endDate && (!contract.endDate || contract.endDate.getTime() !== new Date(masterVars.endDate).getTime())) {
    contract.endDate = masterVars.endDate;
    updated = true;
  }

  if (masterVars.startDate && (!contract.startDate || contract.startDate.getTime() !== new Date(masterVars.startDate).getTime())) {
    contract.startDate = masterVars.startDate;
    updated = true;
  }

  if (masterVars.contractValue !== undefined && contract.value !== masterVars.contractValue) {
    contract.value = masterVars.contractValue;
    updated = true;
  }

  if (masterVars.currency && contract.currency !== masterVars.currency) {
    contract.currency = masterVars.currency;
    updated = true;
  }

  if (masterVars.renewalDate && (!contract.renewalDate || contract.renewalDate.getTime() !== new Date(masterVars.renewalDate).getTime())) {
    contract.renewalDate = masterVars.renewalDate;
    updated = true;
  }

  if (masterVars.counterparty && contract.counterparty !== masterVars.counterparty) {
    contract.counterparty = masterVars.counterparty;
    updated = true;
  }

  if (masterVars.contractType && contract.contractType !== masterVars.contractType) {
    contract.contractType = masterVars.contractType;
    updated = true;
  }

  if (updated) {
    await contract.save();
  }
}

/**
 * Check contracts for expiration and termination deadlines
 * This should be called periodically (e.g., daily cron job)
 */
export async function checkContractDeadlines(): Promise<void> {
  await connectDB();

  const now = new Date();
  const warningDays = 30; // Warn 30 days before deadline
  const criticalDays = 7; // Critical warning 7 days before deadline

  // Get all contracts with master variables
  const contracts = await Contract.find({
    isActive: true,
    status: { $in: ['executed', 'approved'] },
  }).populate('createdBy').lean();

  for (const contract of contracts) {
    try {
      const masterVars = await getMasterVariables(contract._id.toString());

      // Check end date
      if (masterVars.endDate) {
        const endDate = new Date(masterVars.endDate);
        const daysUntilEnd = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (daysUntilEnd <= 0 && contract.status !== 'expired') {
          // Contract expired
          await createExpirationNotification(contract, masterVars);
        } else if (daysUntilEnd <= criticalDays && daysUntilEnd > 0) {
          // Critical: expires within 7 days
          await createDeadlineNotification(contract, masterVars, 'critical', daysUntilEnd);
        } else if (daysUntilEnd <= warningDays && daysUntilEnd > 0) {
          // Warning: expires within 30 days
          await createDeadlineNotification(contract, masterVars, 'warning', daysUntilEnd);
        }
      }

      // Check termination deadline
      if (masterVars.terminationDeadline) {
        const terminationDeadline = new Date(masterVars.terminationDeadline);
        const daysUntilTermination = Math.ceil((terminationDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (daysUntilTermination <= 0) {
          // Termination deadline passed
          await createTerminationDeadlineNotification(contract, masterVars, 'passed');
        } else if (daysUntilTermination <= criticalDays) {
          // Critical: termination deadline within 7 days
          await createTerminationDeadlineNotification(contract, masterVars, 'critical', daysUntilTermination);
        } else if (daysUntilTermination <= warningDays) {
          // Warning: termination deadline within 30 days
          await createTerminationDeadlineNotification(contract, masterVars, 'warning', daysUntilTermination);
        }
      }
    } catch (error) {
      console.error(`Error checking deadlines for contract ${contract._id}:`, error);
    }
  }
}

async function createExpirationNotification(contract: any, masterVars: MasterVariableData): Promise<void> {
  const mongoose = await import('mongoose');
  const ContractUserAssignment = (await import('@/lib/db/models/ContractUserAssignment')).default;
  
  // Get all users to notify: createdBy + assignedUsers
  const userIdsToNotify = new Set<string>();
  
  // Add contract creator
  const createdBy = contract.createdBy?._id || contract.createdBy;
  if (createdBy) {
    userIdsToNotify.add(createdBy.toString());
  }

  // Get assigned users from ContractUserAssignment table
  const assignments = await ContractUserAssignment.find({
    contractId: contract._id,
    isActive: true,
  }).select('userId').lean();

  assignments.forEach((assignment: any) => {
    userIdsToNotify.add(assignment.userId.toString());
  });

  if (userIdsToNotify.size === 0) return;

  const message = `Sözleşme "${contract.title}" süresi doldu. Bitiş tarihi: ${masterVars.endDate?.toLocaleDateString('tr-TR')}`;

  // Create notifications for all users
  for (const userId of userIdsToNotify) {
    await Notification.create({
      userId: new mongoose.default.Types.ObjectId(userId),
      type: 'contract_expired',
      message,
      relatedResourceType: 'contract',
      relatedResourceId: contract._id,
      metadata: {
        endDate: masterVars.endDate,
      },
    });

    // Send email
    const user = await User.findById(userId).lean();
    if (user && (user as any).email) {
      await sendEmailNotification(
        userId,
        (user as any).email,
        `Sözleşme Süresi Doldu: ${contract.title}`,
        `<p>${message}</p>`
      );
    }
  }
}

async function createDeadlineNotification(
  contract: any,
  masterVars: MasterVariableData,
  level: 'warning' | 'critical',
  daysRemaining: number
): Promise<void> {
  const mongoose = await import('mongoose');
  const ContractUserAssignment = (await import('@/lib/db/models/ContractUserAssignment')).default;
  
  // Get all users to notify: createdBy + assignedUsers
  const userIdsToNotify = new Set<string>();
  
  // Add contract creator
  const createdBy = contract.createdBy?._id || contract.createdBy;
  if (createdBy) {
    userIdsToNotify.add(createdBy.toString());
  }

  // Get assigned users from ContractUserAssignment table
  const assignments = await ContractUserAssignment.find({
    contractId: contract._id,
    isActive: true,
  }).select('userId').lean();

  assignments.forEach((assignment: any) => {
    userIdsToNotify.add(assignment.userId.toString());
  });

  if (userIdsToNotify.size === 0) return;

  const levelText = level === 'critical' ? 'Kritik' : 'Uyarı';
  const message = `${levelText}: Sözleşme "${contract.title}" ${daysRemaining} gün içinde sona erecek. Bitiş tarihi: ${masterVars.endDate?.toLocaleDateString('tr-TR')}`;

  // Create notifications for all users
  for (const userId of userIdsToNotify) {
    await Notification.create({
      userId: new mongoose.default.Types.ObjectId(userId),
      type: 'contract_expiring',
      message,
      relatedResourceType: 'contract',
      relatedResourceId: contract._id,
      metadata: {
        level,
        daysRemaining,
        endDate: masterVars.endDate,
      },
    });

    // Send email
    const user = await User.findById(userId).lean();
    if (user && (user as any).email) {
      await sendEmailNotification(
        userId,
        (user as any).email,
        `${levelText}: Sözleşme Süresi Yaklaşıyor - ${contract.title}`,
        `<p>${message}</p>`
      );
    }
  }
}

async function createTerminationDeadlineNotification(
  contract: any,
  masterVars: MasterVariableData,
  status: 'passed' | 'warning' | 'critical',
  daysRemaining?: number
): Promise<void> {
  const mongoose = await import('mongoose');
  const ContractUserAssignment = (await import('@/lib/db/models/ContractUserAssignment')).default;
  
  // Get all users to notify: createdBy + assignedUsers
  const userIdsToNotify = new Set<string>();
  
  // Add contract creator
  const createdBy = contract.createdBy?._id || contract.createdBy;
  if (createdBy) {
    userIdsToNotify.add(createdBy.toString());
  }

  // Get assigned users from ContractUserAssignment table
  const assignments = await ContractUserAssignment.find({
    contractId: contract._id,
    isActive: true,
  }).select('userId').lean();

  assignments.forEach((assignment: any) => {
    userIdsToNotify.add(assignment.userId.toString());
  });

  if (userIdsToNotify.size === 0) return;

  let message = '';
  let notificationType: 'deadline_approaching' | 'deadline_missed' = 'deadline_approaching';

  if (status === 'passed') {
    message = `Sözleşme "${contract.title}" için fesih son tarihi geçti. Fesih için son tarih: ${masterVars.terminationDeadline?.toLocaleDateString('tr-TR')}`;
    notificationType = 'deadline_missed';
  } else {
    const levelText = status === 'critical' ? 'Kritik' : 'Uyarı';
    message = `${levelText}: Sözleşme "${contract.title}" için fesih son tarihi ${daysRemaining} gün içinde. Fesih için son tarih: ${masterVars.terminationDeadline?.toLocaleDateString('tr-TR')}`;
  }

  // Create notifications for all users
  for (const userId of userIdsToNotify) {
    await Notification.create({
      userId: new mongoose.default.Types.ObjectId(userId),
      type: notificationType,
      message,
      relatedResourceType: 'contract',
      relatedResourceId: contract._id,
      metadata: {
        status,
        daysRemaining,
        terminationDeadline: masterVars.terminationDeadline,
      },
    });

    // Send email
    const user = await User.findById(userId).lean();
    if (user && (user as any).email) {
      const subject = status === 'passed' 
        ? `Fesih Son Tarihi Geçti - ${contract.title}`
        : `Fesih Son Tarihi Yaklaşıyor - ${contract.title}`;
      
      await sendEmailNotification(
        userId,
        (user as any).email,
        subject,
        `<p>${message}</p>`
      );
    }
  }
}

/**
 * Status types for master variable checks
 */
export type MasterVariableStatus = 'passed' | 'critical' | 'warning' | 'normal';

/**
 * Status information for a master variable check
 */
export interface MasterVariableStatusInfo {
  status: MasterVariableStatus;
  daysRemaining: number | null;
  message: string;
  color: 'red' | 'orange' | 'yellow' | 'green' | 'gray';
  bgColor: string;
  textColor: string;
  borderColor: string;
}

/**
 * Check status of a date-based master variable
 */
export function checkDateStatus(
  date: Date | string | null | undefined,
  variableName: string,
  warningDays: number = 30,
  criticalDays: number = 7
): MasterVariableStatusInfo | null {
  if (!date) return null;

  const targetDate = date instanceof Date ? date : new Date(date);
  
  // Check if date is valid
  if (isNaN(targetDate.getTime())) {
    console.warn(`Invalid date for ${variableName}:`, date);
    return null;
  }

  const now = new Date();
  // Reset time to midnight for accurate day calculation
  const targetDateMidnight = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const daysRemaining = Math.ceil((targetDateMidnight.getTime() - nowMidnight.getTime()) / (1000 * 60 * 60 * 24));

  let status: MasterVariableStatus;
  let message: string;
  let color: 'red' | 'orange' | 'yellow' | 'green' | 'gray';

  if (daysRemaining < 0) {
    status = 'passed';
    message = `${variableName} geçti (${Math.abs(daysRemaining)} gün önce)`;
    color = 'red';
  } else if (daysRemaining <= criticalDays) {
    status = 'critical';
    message = `Kritik: ${variableName} ${daysRemaining} gün içinde`;
    color = 'orange';
  } else if (daysRemaining <= warningDays) {
    status = 'warning';
    message = `Uyarı: ${variableName} ${daysRemaining} gün içinde`;
    color = 'yellow';
  } else {
    status = 'normal';
    message = `${variableName} ${daysRemaining} gün sonra`;
    color = 'green';
  }

  const colorMap = {
    red: {
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      textColor: 'text-red-700 dark:text-red-400',
      borderColor: 'border-red-200 dark:border-red-800',
    },
    orange: {
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      textColor: 'text-orange-700 dark:text-orange-400',
      borderColor: 'border-orange-200 dark:border-orange-800',
    },
    yellow: {
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
      textColor: 'text-yellow-700 dark:text-yellow-400',
      borderColor: 'border-yellow-200 dark:border-yellow-800',
    },
    green: {
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      textColor: 'text-green-700 dark:text-green-400',
      borderColor: 'border-green-200 dark:border-green-800',
    },
    gray: {
      bgColor: 'bg-gray-50 dark:bg-gray-900/20',
      textColor: 'text-gray-700 dark:text-gray-400',
      borderColor: 'border-gray-200 dark:border-gray-800',
    },
  };

  return {
    status,
    daysRemaining,
    message,
    color,
    ...colorMap[color],
  };
}

/**
 * Get detailed status information for all master variables of a contract
 */
export async function getContractMasterVariableStatuses(contractId: string): Promise<{
  endDate?: MasterVariableStatusInfo;
  terminationDeadline?: MasterVariableStatusInfo;
  renewalDate?: MasterVariableStatusInfo;
  overallStatus: MasterVariableStatus;
  hasAlerts: boolean;
}> {
  const masterVars = await getMasterVariables(contractId);

  const endDateStatus = checkDateStatus(masterVars.endDate, 'Bitiş Tarihi');
  const terminationDeadlineStatus = checkDateStatus(masterVars.terminationDeadline, 'Fesih Son Tarihi');
  const renewalDateStatus = checkDateStatus(masterVars.renewalDate, 'Yenileme Tarihi');

  const statuses = [endDateStatus, terminationDeadlineStatus, renewalDateStatus].filter(Boolean) as MasterVariableStatusInfo[];
  
  let overallStatus: MasterVariableStatus = 'normal';
  if (statuses.some(s => s.status === 'passed')) {
    overallStatus = 'passed';
  } else if (statuses.some(s => s.status === 'critical')) {
    overallStatus = 'critical';
  } else if (statuses.some(s => s.status === 'warning')) {
    overallStatus = 'warning';
  }

  return {
    endDate: endDateStatus || undefined,
    terminationDeadline: terminationDeadlineStatus || undefined,
    renewalDate: renewalDateStatus || undefined,
    overallStatus,
    hasAlerts: statuses.some(s => s.status !== 'normal'),
  };
}

/**
 * Get contracts that need attention based on master variables
 */
export async function getContractsNeedingAttention(companyId?: string): Promise<any[]> {
  await connectDB();

  const now = new Date();
  const warningDays = 30;
  const criticalDays = 7;

  const filter: any = {
    isActive: true,
    status: { $in: ['executed', 'approved'] },
  };

  if (companyId) {
    filter.companyId = companyId;
  }

  const contracts = await Contract.find(filter).lean();
  const contractsNeedingAttention: any[] = [];

  for (const contract of contracts) {
    const masterVars = await getMasterVariables(contract._id.toString());
    const statuses = await getContractMasterVariableStatuses(contract._id.toString());
    const alerts: string[] = [];

    if (statuses.endDate && statuses.endDate.status !== 'normal') {
      alerts.push(statuses.endDate.message);
    }

    if (statuses.terminationDeadline && statuses.terminationDeadline.status !== 'normal') {
      alerts.push(statuses.terminationDeadline.message);
    }

    if (statuses.renewalDate && statuses.renewalDate.status !== 'normal') {
      alerts.push(statuses.renewalDate.message);
    }

    if (alerts.length > 0) {
      contractsNeedingAttention.push({
        ...contract,
        alerts,
        masterVariables: masterVars,
        statuses,
        overallStatus: statuses.overallStatus,
      });
    }
  }

  return contractsNeedingAttention;
}

/**
 * Get contracts by status (passed, critical, warning, normal)
 */
export async function getContractsByMasterVariableStatus(
  status: MasterVariableStatus,
  companyId?: string
): Promise<any[]> {
  await connectDB();

  const filter: any = {
    isActive: true,
    status: { $in: ['executed', 'approved'] },
  };

  if (companyId) {
    filter.companyId = companyId;
  }

  const contracts = await Contract.find(filter).lean();
  const filteredContracts: any[] = [];

  for (const contract of contracts) {
    const statuses = await getContractMasterVariableStatuses(contract._id.toString());
    
    if (statuses.overallStatus === status) {
      const masterVars = await getMasterVariables(contract._id.toString());
      filteredContracts.push({
        ...contract,
        masterVariables: masterVars,
        statuses,
      });
    }
  }

  return filteredContracts;
}

