import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import Contract from '@/lib/db/models/Contract';
import Approval from '@/lib/db/models/Approval';
import ComplianceCheck from '@/lib/db/models/ComplianceCheck';
import { requireAuth } from '@/lib/auth/middleware';

// GET - Get analytics
export async function GET(req: NextRequest) {
  return requireAuth(async (req: NextRequest, user) => {
    try {
      await connectDB();

      const { searchParams } = new URL(req.url);
      const companyId = searchParams.get('companyId') || user.companyId;
      const startDate = searchParams.get('startDate');
      const endDate = searchParams.get('endDate');

      const dateFilter: any = {};
      if (startDate || endDate) {
        dateFilter.createdAt = {};
        if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
        if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
      }

      // Contract statistics
      const contractQuery = { companyId, isActive: true, ...dateFilter };
      const [
        totalContracts,
        contractsByStatus,
        contractsByType,
        expiringContracts,
      ] = await Promise.all([
        Contract.countDocuments(contractQuery),
        Contract.aggregate([
          { $match: contractQuery },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
        Contract.aggregate([
          { $match: contractQuery },
          { $group: { _id: '$contractType', count: { $sum: 1 } } },
        ]),
        Contract.countDocuments({
          ...contractQuery,
          endDate: {
            $gte: new Date(),
            $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Next 30 days
          },
        }),
      ]);

      // Approval statistics
      const approvalQuery = { ...dateFilter };
      const [pendingApprovals, approvalTimeStats] = await Promise.all([
        Approval.countDocuments({ ...approvalQuery, status: 'pending' }),
        Approval.aggregate([
          {
            $match: {
              ...approvalQuery,
              status: 'approved',
              approvedAt: { $exists: true },
            },
          },
          {
            $project: {
              duration: {
                $subtract: ['$approvedAt', '$createdAt'],
              },
            },
          },
          {
            $group: {
              _id: null,
              avgDuration: { $avg: '$duration' },
              minDuration: { $min: '$duration' },
              maxDuration: { $max: '$duration' },
            },
          },
        ]),
      ]);

      // Compliance statistics
      const complianceQuery = { ...dateFilter };
      const [
        totalComplianceChecks,
        complianceByStatus,
        complianceByLevel,
      ] = await Promise.all([
        ComplianceCheck.countDocuments(complianceQuery),
        ComplianceCheck.aggregate([
          { $match: complianceQuery },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
        ComplianceCheck.aggregate([
          { $match: complianceQuery },
          { $group: { _id: '$alertLevel', count: { $sum: 1 } } },
        ]),
      ]);

      return NextResponse.json({
        contracts: {
          total: totalContracts,
          byStatus: contractsByStatus,
          byType: contractsByType,
          expiring: expiringContracts,
        },
        approvals: {
          pending: pendingApprovals,
          timeStats: approvalTimeStats[0] || null,
        },
        compliance: {
          total: totalComplianceChecks,
          byStatus: complianceByStatus,
          byLevel: complianceByLevel,
        },
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      return NextResponse.json(
        { error: 'Failed to fetch analytics' },
        { status: 500 }
      );
    }
  })(req);
}

