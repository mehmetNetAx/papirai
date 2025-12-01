import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import connectDB from '@/lib/db/connection';
import CompanyDocument from '@/lib/db/models/CompanyDocument';
import Company from '@/lib/db/models/Company';
import mongoose from 'mongoose';

// GET - Get document statistics and reports
export async function GET(req: NextRequest) {
  return requireAuth(async (req: NextRequest, user) => {
    try {
      await connectDB();

      // Build company filter based on user role
      let companyFilter: any = {};
      
      if (user.role === 'system_admin') {
        // System admin sees all companies
        companyFilter = {};
      } else if (user.role === 'group_admin') {
        // Group admin sees all companies in their group
        const userCompanyObjectId = new mongoose.Types.ObjectId(user.companyId);
        const userCompany = await Company.findById(userCompanyObjectId).lean();
        
        if (userCompany && (userCompany as any).type === 'group') {
          const subsidiaries = await Company.find({
            parentCompanyId: userCompanyObjectId,
            isActive: true,
          }).select('_id').lean();
          const companyIds = [userCompanyObjectId, ...subsidiaries.map((s: any) => s._id)];
          companyFilter.companyId = { $in: companyIds };
        } else {
          companyFilter.companyId = userCompanyObjectId;
        }
      } else {
        // Regular users see only their company's documents
        companyFilter.companyId = new mongoose.Types.ObjectId(user.companyId);
      }

      // Get all documents
      const allDocuments = await CompanyDocument.find({
        ...companyFilter,
        isActive: true,
      })
        .populate('companyId', 'name')
        .lean();

      // Calculate dates
      const now = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(now.getDate() + 30);

      // Calculate statistics
      let valid = 0;
      let expiringSoon = 0;
      let expired = 0;

      const byTypeMap = new Map<string, { count: number; valid: number; expiringSoon: number; expired: number }>();
      const byCompanyMap = new Map<string, { companyName: string; count: number; valid: number; expiringSoon: number; expired: number }>();

      const expiringIn30Days: Array<{
        _id: string;
        originalFileName: string;
        companyName: string;
        validityEndDate: string;
        daysUntilExpiry: number;
      }> = [];

      const expiredDocuments: Array<{
        _id: string;
        originalFileName: string;
        companyName: string;
        validityEndDate: string;
        daysSinceExpiry: number;
      }> = [];

      for (const doc of allDocuments) {
        const endDate = new Date(doc.validityEndDate);
        const companyName = (doc.companyId as any).name;
        const companyId = (doc.companyId as any)._id.toString();

        let status: 'valid' | 'expiring_soon' | 'expired' = 'valid';
        if (endDate < now) {
          status = 'expired';
          expired++;
          
          const daysSince = Math.floor((now.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24));
          expiredDocuments.push({
            _id: doc._id.toString(),
            originalFileName: doc.originalFileName,
            companyName,
            validityEndDate: doc.validityEndDate.toISOString(),
            daysSinceExpiry: daysSince,
          });
        } else if (endDate <= thirtyDaysFromNow) {
          status = 'expiring_soon';
          expiringSoon++;
          
          const daysUntil = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          expiringIn30Days.push({
            _id: doc._id.toString(),
            originalFileName: doc.originalFileName,
            companyName,
            validityEndDate: doc.validityEndDate.toISOString(),
            daysUntilExpiry: daysUntil,
          });
        } else {
          valid++;
        }

        // By type
        if (!byTypeMap.has(doc.documentType)) {
          byTypeMap.set(doc.documentType, { count: 0, valid: 0, expiringSoon: 0, expired: 0 });
        }
        const typeStats = byTypeMap.get(doc.documentType)!;
        typeStats.count++;
        if (status === 'valid') typeStats.valid++;
        else if (status === 'expiring_soon') typeStats.expiringSoon++;
        else typeStats.expired++;

        // By company
        if (!byCompanyMap.has(companyId)) {
          byCompanyMap.set(companyId, { companyName, count: 0, valid: 0, expiringSoon: 0, expired: 0 });
        }
        const companyStats = byCompanyMap.get(companyId)!;
        companyStats.count++;
        if (status === 'valid') companyStats.valid++;
        else if (status === 'expiring_soon') companyStats.expiringSoon++;
        else companyStats.expired++;
      }

      // Sort expiring documents by days until expiry
      expiringIn30Days.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);

      // Sort expired documents by days since expiry (most recent first)
      expiredDocuments.sort((a, b) => b.daysSinceExpiry - a.daysSinceExpiry);

      // Convert maps to arrays
      const byType = Array.from(byTypeMap.entries()).map(([type, stats]) => ({
        type,
        ...stats,
      }));

      const byCompany = Array.from(byCompanyMap.entries()).map(([companyId, stats]) => ({
        companyId,
        ...stats,
      }));

      return NextResponse.json({
        total: allDocuments.length,
        valid,
        expiringSoon,
        expired,
        byType,
        byCompany,
        expiringIn30Days,
        expiredDocuments,
      }, { status: 200 });
    } catch (error: any) {
      console.error('Error generating document report:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to generate report' },
        { status: 500 }
      );
    }
  })(req);
}

