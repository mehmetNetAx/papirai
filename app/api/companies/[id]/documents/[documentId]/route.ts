import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import connectDB from '@/lib/db/connection';
import CompanyDocument from '@/lib/db/models/CompanyDocument';
import Company from '@/lib/db/models/Company';
import { getCompanyDocument, updateCompanyDocument, deleteCompanyDocument } from '@/lib/services/company-document';
import { getSignedUrlForS3 } from '@/lib/aws/s3';
import mongoose from 'mongoose';

// GET - Get document details and download URL
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  return requireAuth(async (req: NextRequest, user) => {
    try {
      const { id: companyId, documentId } = await params;
      await connectDB();

      // Verify company access
      const companyObjectId = new mongoose.Types.ObjectId(companyId);
      const company = await Company.findById(companyObjectId).lean();

      if (!company) {
        return NextResponse.json({ error: 'Company not found' }, { status: 404 });
      }

      // Check access
      if (user.role !== 'system_admin' && user.companyId !== companyId) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      const document = await getCompanyDocument(documentId);

      // Verify document belongs to company
      if (document.companyId !== companyId) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 });
      }

      // Get signed URL for download
      const downloadUrl = await getSignedUrlForS3(document.s3Key);

      return NextResponse.json({
        document: {
          ...document,
          downloadUrl,
        },
      }, { status: 200 });
    } catch (error: any) {
      console.error('Error getting document:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to get document' },
        { status: 500 }
      );
    }
  })(req);
}

// PATCH - Update document
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  return requireAuth(async (req: NextRequest, user) => {
    try {
      const { id: companyId, documentId } = await params;
      await connectDB();

      // Verify company access
      const companyObjectId = new mongoose.Types.ObjectId(companyId);
      const company = await Company.findById(companyObjectId).lean();

      if (!company) {
        return NextResponse.json({ error: 'Company not found' }, { status: 404 });
      }

      // Check access
      if (user.role !== 'system_admin' && user.companyId !== companyId) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      const document = await getCompanyDocument(documentId);

      // Verify document belongs to company
      if (document.companyId !== companyId) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 });
      }

      const body = await req.json();
      const updates: {
        validityStartDate?: Date;
        validityEndDate?: Date;
        description?: string;
        tags?: string[];
      } = {};

      if (body.validityStartDate) {
        updates.validityStartDate = new Date(body.validityStartDate);
      }

      if (body.validityEndDate) {
        updates.validityEndDate = new Date(body.validityEndDate);
      }

      if (body.description !== undefined) {
        updates.description = body.description;
      }

      if (body.tags !== undefined) {
        updates.tags = body.tags;
      }

      await updateCompanyDocument(documentId, updates);

      return NextResponse.json({ message: 'Document updated successfully' }, { status: 200 });
    } catch (error: any) {
      console.error('Error updating document:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to update document' },
        { status: 500 }
      );
    }
  })(req);
}

// DELETE - Delete document
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  return requireAuth(async (req: NextRequest, user) => {
    try {
      const { id: companyId, documentId } = await params;
      await connectDB();

      // Verify company access
      const companyObjectId = new mongoose.Types.ObjectId(companyId);
      const company = await Company.findById(companyObjectId).lean();

      if (!company) {
        return NextResponse.json({ error: 'Company not found' }, { status: 404 });
      }

      // Check access
      if (user.role !== 'system_admin' && user.companyId !== companyId) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      const document = await getCompanyDocument(documentId);

      // Verify document belongs to company
      if (document.companyId !== companyId) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 });
      }

      await deleteCompanyDocument(documentId);

      return NextResponse.json({ message: 'Document deleted successfully' }, { status: 200 });
    } catch (error: any) {
      console.error('Error deleting document:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to delete document' },
        { status: 500 }
      );
    }
  })(req);
}

