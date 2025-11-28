import connectDB from '@/lib/db/connection';
import ComplianceCheck from '@/lib/db/models/ComplianceCheck';
import ContractVariable from '@/lib/db/models/ContractVariable';
import Contract from '@/lib/db/models/Contract';
import Notification from '@/lib/db/models/Notification';

export interface ComplianceData {
  contractId: string;
  variableId?: string;
  expectedValue: string | number | Date;
  actualValue: string | number | Date;
  source: 'manual' | 'sap' | 'nebim' | 'logo' | 'netsis' | 'other_integration';
  sourceData?: Record<string, any>;
}

export async function checkCompliance(data: ComplianceData): Promise<string> {
  await connectDB();

  const { contractId, variableId, expectedValue, actualValue, source, sourceData } = data;

  // Determine compliance status
  let status: 'compliant' | 'non_compliant' | 'warning' = 'compliant';
  let alertLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
  let deviation: any = null;

  // Compare values based on type
  if (typeof expectedValue === 'number' && typeof actualValue === 'number') {
    const diff = actualValue - expectedValue;
    const percentage = (diff / expectedValue) * 100;

    if (Math.abs(percentage) > 10) {
      status = 'non_compliant';
      alertLevel = percentage > 20 ? 'critical' : 'high';
      deviation = {
        type: 'price',
        amount: diff,
        percentage: Math.abs(percentage),
      };
    } else if (Math.abs(percentage) > 5) {
      status = 'warning';
      alertLevel = 'medium';
      deviation = {
        type: 'price',
        amount: diff,
        percentage: Math.abs(percentage),
      };
    }
  } else if (expectedValue instanceof Date && actualValue instanceof Date) {
    const diffDays = Math.abs((actualValue.getTime() - expectedValue.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays > 7) {
      status = 'non_compliant';
      alertLevel = diffDays > 30 ? 'critical' : 'high';
      deviation = {
        type: 'delivery_date',
        amount: diffDays,
        description: `${diffDays} days difference`,
      };
    } else if (diffDays > 3) {
      status = 'warning';
      alertLevel = 'medium';
      deviation = {
        type: 'delivery_date',
        amount: diffDays,
        description: `${diffDays} days difference`,
      };
    }
  } else {
    // String comparison
    if (expectedValue.toString() !== actualValue.toString()) {
      status = 'warning';
      alertLevel = 'low';
    }
  }

  // Create compliance check record
  const complianceCheck = await ComplianceCheck.create({
    contractId,
    variableId,
    expectedValue,
    actualValue,
    status,
    alertLevel,
    deviation,
    source,
    sourceData,
    checkedAt: new Date(),
  });

  // Create notification if non-compliant or warning
  if (status !== 'compliant') {
    const contract = await Contract.findById(contractId).populate('createdBy');
    if (contract) {
      await Notification.create({
        userId: (contract.createdBy as any)._id,
        type: 'compliance_alert',
        message: `Compliance alert for contract "${contract.title}": ${status === 'non_compliant' ? 'Non-compliant' : 'Warning'}`,
        relatedResourceType: 'compliance',
        relatedResourceId: complianceCheck._id,
        metadata: {
          alertLevel,
          deviation,
        },
      });
    }
  }

  return complianceCheck._id.toString();
}

export async function getComplianceChecks(contractId: string) {
  await connectDB();

  const checks = await ComplianceCheck.find({ contractId })
    .populate('variableId', 'name type')
    .sort({ checkedAt: -1 })
    .lean();

  return checks;
}

export async function resolveComplianceCheck(
  checkId: string,
  userId: string,
  resolutionNotes?: string
) {
  await connectDB();

  const check = await ComplianceCheck.findById(checkId);
  if (!check) {
    throw new Error('Compliance check not found');
  }

  check.status = 'compliant';
  check.resolvedAt = new Date();
  check.resolvedBy = userId as any;
  check.resolutionNotes = resolutionNotes;

  await check.save();

  return check;
}

