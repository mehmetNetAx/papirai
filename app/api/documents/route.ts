import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import connectDB from '@/lib/db/connection';
import CompanyDocument from '@/lib/db/models/CompanyDocument';
import Company from '@/lib/db/models/Company';
import mongoose from 'mongoose';

// GET - List all documents (with access control)
export async function GET(req: NextRequest) {
  return requireAuth(async (req: NextRequest, user) => {
    try {
      await connectDB();

      // Get query parameters
      const searchParams = req.nextUrl.searchParams;
      const companyId = searchParams.get('companyId');
      const counterpartyCompanyId = searchParams.get('counterpartyCompanyId');
      const documentType = searchParams.get('documentType') as any;
      const validityStatus = searchParams.get('validityStatus') as 'valid' | 'expiring_soon' | 'expired' | null;
      const search = searchParams.get('search');
      const tagsParam = searchParams.get('tags');
      const tags = tagsParam ? tagsParam.split(',').map(t => t.trim()).filter(t => t) : undefined;
      const page = parseInt(searchParams.get('page') || '1', 10);
      const limit = parseInt(searchParams.get('limit') || '20', 10);
      const skip = (page - 1) * limit;

      // Build company filter based on user role
      let companyFilter: any = {};
      
      if (user.role === 'system_admin') {
        // System admin sees all companies
        if (companyId) {
          companyFilter.companyId = new mongoose.Types.ObjectId(companyId);
        }
      } else if (user.role === 'group_admin') {
        // Group admin sees all companies in their group
        const userCompanyObjectId = new mongoose.Types.ObjectId(user.companyId);
        const userCompany = await Company.findById(userCompanyObjectId).lean();
        
        if (userCompany && (userCompany as any).type === 'group') {
          // Get all subsidiaries in the group
          const subsidiaries = await Company.find({
            parentCompanyId: userCompanyObjectId,
            isActive: true,
          }).select('_id').lean();
          const companyIds = [userCompanyObjectId, ...subsidiaries.map((s: any) => s._id)];
          companyFilter.companyId = { $in: companyIds };
        } else {
          companyFilter.companyId = userCompanyObjectId;
        }
        
        // If specific company requested, verify it's in the group
        if (companyId) {
          const requestedCompanyId = new mongoose.Types.ObjectId(companyId);
          if (companyFilter.companyId.$in) {
            const hasAccess = companyFilter.companyId.$in.some((id: any) => id.toString() === companyId);
            if (!hasAccess) {
              return NextResponse.json({ error: 'Access denied' }, { status: 403 });
            }
          } else {
            if (companyFilter.companyId.toString() !== companyId) {
              return NextResponse.json({ error: 'Access denied' }, { status: 403 });
            }
          }
          companyFilter.companyId = requestedCompanyId;
        }
      } else {
        // Regular users see only their company's documents
        companyFilter.companyId = new mongoose.Types.ObjectId(user.companyId);
        
        // If specific company requested, verify it's their company
        if (companyId && companyId !== user.companyId) {
          return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }
      }

      // Build query
      const query: any = {
        ...companyFilter,
        isActive: true,
      };

      // Counterparty filter
      if (counterpartyCompanyId) {
        query.counterpartyCompanyId = new mongoose.Types.ObjectId(counterpartyCompanyId);
      }

      // Document type filter
      if (documentType) {
        query.documentType = documentType;
      }

      // Tags filter
      if (tags && tags.length > 0) {
        query.tags = { $in: tags };
      }

      // Search filter (search in fileName, originalFileName, description)
      if (search) {
        query.$or = [
          { fileName: { $regex: search, $options: 'i' } },
          { originalFileName: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
        ];
      }

      // Validity status filter
      const now = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(now.getDate() + 30);

      if (validityStatus === 'expired') {
        query.validityEndDate = { $lt: now };
      } else if (validityStatus === 'expiring_soon') {
        query.validityEndDate = { $gte: now, $lte: thirtyDaysFromNow };
      } else if (validityStatus === 'valid') {
        query.validityEndDate = { $gt: thirtyDaysFromNow };
      }

      // Get documents with pagination
      const [documents, total] = await Promise.all([
        CompanyDocument.find(query)
          .populate('companyId', 'name')
          .populate('counterpartyCompanyId', 'name')
          .populate('uploadedBy', 'name email')
          .sort({ validityEndDate: 1, createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        CompanyDocument.countDocuments(query),
      ]);

      // Calculate validity status for each document
      const documentsWithStatus = documents.map((doc: any) => {
        const endDate = new Date(doc.validityEndDate);
        let validityStatus: 'valid' | 'expiring_soon' | 'expired' = 'valid';
        
        if (endDate < now) {
          validityStatus = 'expired';
        } else if (endDate <= thirtyDaysFromNow) {
          validityStatus = 'expiring_soon';
        }

        return {
          ...doc,
          _id: doc._id.toString(),
          companyId: {
            _id: doc.companyId._id.toString(),
            name: doc.companyId.name,
          },
          counterpartyCompanyId: doc.counterpartyCompanyId ? {
            _id: doc.counterpartyCompanyId._id.toString(),
            name: doc.counterpartyCompanyId.name,
          } : null,
          uploadedBy: doc.uploadedBy ? {
            _id: doc.uploadedBy._id.toString(),
            name: doc.uploadedBy.name,
            email: doc.uploadedBy.email,
          } : null,
          validityStatus,
        };
      });

      return NextResponse.json({
        documents: documentsWithStatus,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      }, { status: 200 });
    } catch (error: any) {
      console.error('Error listing documents:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to list documents' },
        { status: 500 }
      );
    }
  })(req);
}

