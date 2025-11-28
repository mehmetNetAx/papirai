import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { getAuthUser } from '@/lib/auth/middleware';
import connectDB from '@/lib/db/connection';
import Contract from '@/lib/db/models/Contract';
import ContractVariable from '@/lib/db/models/ContractVariable';
import ComplianceCheck from '@/lib/db/models/ComplianceCheck';
import mongoose from 'mongoose';
import { buildReportFilters } from '@/lib/utils/report-filters';

type ComplianceStatus = 'compliant' | 'non_compliant' | 'warning' | 'pending';
type AlertLevel = 'low' | 'medium' | 'high' | 'critical';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Build filters based on user context
    const { companyFilter, workspaceFilter } = await buildReportFilters(user);

    // Get all active contracts
    const contracts = await Contract.find({
      ...companyFilter,
      ...workspaceFilter,
      isActive: true,
    })
      .select('_id title')
      .lean();

    const contractIds = contracts.map((c: any) => c._id);

    // Get all compliance tracked variables
    const trackedVariables = await ContractVariable.find({
      contractId: { $in: contractIds },
      isComplianceTracked: true,
    })
      .select('_id contractId name type value')
      .lean();

    // Get all compliance checks
    const complianceChecks = await ComplianceCheck.find({
      contractId: { $in: contractIds },
    })
      .populate('variableId', 'name type')
      .sort({ checkedAt: -1 })
      .lean();

    // Create contract lookup
    const contractLookup: Record<string, string> = {};
    for (const contract of contracts) {
      contractLookup[contract._id.toString()] = contract.title;
    }

    // Categorize by status
    const byStatus: Record<ComplianceStatus, any[]> = {
      compliant: [],
      non_compliant: [],
      warning: [],
      pending: [],
    };

    // Count by alert level
    const byAlertLevel: Record<AlertLevel, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    for (const check of complianceChecks) {
      const contractId = (check.contractId as any).toString();
      const variable = check.variableId as any;

      const checkData = {
        _id: check._id.toString(),
        contractId,
        contractTitle: contractLookup[contractId] || 'Bilinmeyen Sözleşme',
        variableName: variable?.name || 'Bilinmeyen Değişken',
        expectedValue: check.expectedValue,
        actualValue: check.actualValue,
        status: check.status as ComplianceStatus,
        alertLevel: check.alertLevel as AlertLevel,
        checkedAt: check.checkedAt,
        deviation: check.deviation,
      };

      byStatus[check.status as ComplianceStatus].push(checkData);
      byAlertLevel[check.alertLevel as AlertLevel]++;
    }

    // Build tracked variables list
    const trackedVariablesList = trackedVariables.map((v: any) => ({
      _id: v._id.toString(),
      contractId: (v.contractId as any).toString(),
      contractTitle: contractLookup[(v.contractId as any).toString()] || 'Bilinmeyen Sözleşme',
      variableName: v.name,
      variableType: v.type,
      value: v.value,
    }));

    // Get unique contracts with tracked variables
    const contractsWithTracked = new Set(
      trackedVariables.map((v: any) => (v.contractId as any).toString())
    );

    return NextResponse.json({
      summary: {
        totalChecks: complianceChecks.length,
        compliant: byStatus.compliant.length,
        nonCompliant: byStatus.non_compliant.length,
        warning: byStatus.warning.length,
        pending: byStatus.pending.length,
        totalTrackedVariables: trackedVariables.length,
        totalContracts: contractsWithTracked.size,
      },
      byStatus,
      byAlertLevel,
      trackedVariables: trackedVariablesList,
    });
  } catch (error: any) {
    console.error('Error generating compliance report:', error);
    return NextResponse.json(
      { error: 'Failed to generate compliance report', details: error.message },
      { status: 500 }
    );
  }
}

