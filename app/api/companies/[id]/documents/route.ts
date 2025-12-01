import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import connectDB from '@/lib/db/connection';
import CompanyDocument from '@/lib/db/models/CompanyDocument';
import Company from '@/lib/db/models/Company';
import { uploadCompanyDocument, getCompanyDocuments } from '@/lib/services/company-document';
import mongoose from 'mongoose';

// GET - List company documents
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return requireAuth(async (req: NextRequest, user) => {
    try {
      const { id: companyId } = await params;
      await connectDB();

      // Verify company access
      const companyObjectId = new mongoose.Types.ObjectId(companyId);
      const company = await Company.findById(companyObjectId).lean();

      if (!company) {
        return NextResponse.json({ error: 'Company not found' }, { status: 404 });
      }

      // Check access (user must belong to the company or be system admin)
      if (user.role !== 'system_admin' && user.companyId !== companyId) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      // Get query parameters
      const searchParams = req.nextUrl.searchParams;
      const counterpartyCompanyId = searchParams.get('counterpartyCompanyId');
      const documentType = searchParams.get('documentType') as any;
      const validityStatus = searchParams.get('validityStatus') as 'valid' | 'expiring_soon' | 'expired' | null;
      const search = searchParams.get('search');
      const tagsParam = searchParams.get('tags');
      const tags = tagsParam ? tagsParam.split(',') : undefined;

      const documents = await getCompanyDocuments({
        companyId,
        counterpartyCompanyId: counterpartyCompanyId || undefined,
        documentType,
        validityStatus: validityStatus || undefined,
        search: search || undefined,
        tags,
      });

      return NextResponse.json({ documents }, { status: 200 });
    } catch (error: any) {
      console.error('Error listing company documents:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to list documents' },
        { status: 500 }
      );
    }
  })(req);
}

// POST - Upload a document to company archive
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return requireAuth(async (req: NextRequest, user) => {
    try {
      const { id: companyId } = await params;
      await connectDB();

      // Verify company access
      const companyObjectId = new mongoose.Types.ObjectId(companyId);
      const company = await Company.findById(companyObjectId).lean();

      if (!company) {
        return NextResponse.json({ error: 'Company not found' }, { status: 404 });
      }

      // Check access (user must belong to the company or be system admin)
      if (user.role !== 'system_admin' && user.companyId !== companyId) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      const formData = await req.formData();
      const file = formData.get('file') as File;
      const documentType = formData.get('documentType') as string;
      const counterpartyCompanyId = formData.get('counterpartyCompanyId') as string | null;
      const validityStartDate = formData.get('validityStartDate') as string;
      const validityEndDate = formData.get('validityEndDate') as string;
      const description = formData.get('description') as string | null;
      const tagsParam = formData.get('tags') as string | null;
      const tags = tagsParam ? tagsParam.split(',').map(t => t.trim()).filter(t => t) : undefined;

      if (!file) {
        return NextResponse.json({ error: 'File is required' }, { status: 400 });
      }

      if (!documentType) {
        return NextResponse.json({ error: 'Document type is required' }, { status: 400 });
      }

      if (!validityStartDate || !validityEndDate) {
        return NextResponse.json({ error: 'Validity dates are required' }, { status: 400 });
      }

      const fileBuffer = Buffer.from(await file.arrayBuffer());

      const documentId = await uploadCompanyDocument({
        companyId,
        counterpartyCompanyId: counterpartyCompanyId || undefined,
        documentType: documentType as any,
        fileName: file.name,
        originalFileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        fileBuffer,
        validityStartDate: new Date(validityStartDate),
        validityEndDate: new Date(validityEndDate),
        uploadedBy: user.id,
        description: description || undefined,
        tags,
      });

      return NextResponse.json({ documentId }, { status: 201 });
    } catch (error: any) {
      console.error('Error uploading company document:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to upload document' },
        { status: 500 }
      );
    }
  })(req);
}

