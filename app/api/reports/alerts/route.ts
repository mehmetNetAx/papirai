import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { getAuthUser } from '@/lib/auth/middleware';
import connectDB from '@/lib/db/connection';
import Contract from '@/lib/db/models/Contract';
import ComplianceCheck from '@/lib/db/models/ComplianceCheck';
import mongoose from 'mongoose';
import { getContractsNeedingAttention } from '@/lib/services/master-variables';
import { DateStatus } from '@/lib/utils/date-status';
import { buildReportFilters } from '@/lib/utils/report-filters';

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

    // Get contracts needing attention - we need to pass companyId string, not filter
    // First get all contracts with the filter, then check their master variables
    const contracts = await Contract.find({
      ...companyFilter,
      ...workspaceFilter,
      isActive: true,
      status: { $in: ['executed', 'approved'] },
    }).lean();

    const contractsNeedingAttention: any[] = [];
    
    // Import master variables functions
    const { getMasterVariables, getContractMasterVariableStatuses } = await import('@/lib/services/master-variables');
    
    for (const contract of contracts) {
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
        const masterVarsData = await getMasterVariables(contract._id.toString());
        
        contractsNeedingAttention.push({
          ...contract,
          alerts,
          masterVariables: masterVarsData,
          statuses,
          overallStatus: statuses.overallStatus,
          endDate: masterVarsData.endDate,
          terminationDeadline: masterVarsData.terminationDeadline,
          renewalDate: masterVarsData.renewalDate,
          daysRemaining: statuses.endDate?.daysRemaining || statuses.terminationDeadline?.daysRemaining || statuses.renewalDate?.daysRemaining || null,
        });
      }
    }

    // Categorize by status
    const passed: any[] = [];
    const critical: any[] = [];
    const warning: any[] = [];

    for (const contract of contractsNeedingAttention) {
      const contractData = {
        _id: contract._id.toString(),
        title: contract.title,
        status: contract.status,
        endDate: contract.endDate,
        terminationDeadline: contract.terminationDeadline,
        renewalDate: contract.renewalDate,
        daysRemaining: contract.daysRemaining,
        alerts: contract.alerts || [],
        overallStatus: contract.overallStatus as DateStatus,
      };

      if (contract.overallStatus === 'passed') {
        passed.push(contractData);
      } else if (contract.overallStatus === 'critical') {
        critical.push(contractData);
      } else if (contract.overallStatus === 'warning') {
        warning.push(contractData);
      }
    }

    // Get compliance issues (non_compliant and warning status)
    const contractIds = contractsNeedingAttention.map((c: any) => c._id);
    const complianceIssues = await ComplianceCheck.find({
      contractId: { $in: contractIds },
      status: { $in: ['non_compliant', 'warning'] },
    })
      .populate('variableId', 'name')
      .sort({ checkedAt: -1 })
      .lean();

    const complianceIssuesList = complianceIssues.map((check: any) => ({
      _id: check._id.toString(),
      contractId: (check.contractId as any).toString(),
      contractTitle:
        contractsNeedingAttention.find(
          (c: any) => c._id.toString() === (check.contractId as any).toString()
        )?.title || 'Bilinmeyen Sözleşme',
      variableName: (check.variableId as any)?.name || 'Bilinmeyen Değişken',
      status: check.status,
      alertLevel: check.alertLevel,
      checkedAt: check.checkedAt,
    }));

    return NextResponse.json({
      summary: {
        total: passed.length + critical.length + warning.length + complianceIssuesList.length,
        passed: passed.length,
        critical: critical.length,
        warning: warning.length,
        complianceIssues: complianceIssuesList.length,
      },
      passed,
      critical,
      warning,
      complianceIssues: complianceIssuesList,
    });
  } catch (error: any) {
    console.error('Error generating alerts report:', error);
    return NextResponse.json(
      { error: 'Failed to generate alerts report', details: error.message },
      { status: 500 }
    );
  }
}

