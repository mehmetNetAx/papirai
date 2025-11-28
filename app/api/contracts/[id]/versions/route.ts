import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import Contract from '@/lib/db/models/Contract';
import { requireAuth } from '@/lib/auth/middleware';
import { getVersions, createVersion } from '@/lib/services/version';
import { canEditContract } from '@/lib/utils/permissions';

// GET - List versions
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return requireAuth(async (req: NextRequest, user) => {
    try {
      const { id } = await params;
      await connectDB();

      const contract = await Contract.findById(id);
      if (!contract) {
        return NextResponse.json(
          { error: 'Contract not found' },
          { status: 404 }
        );
      }

      // Check access based on role
      if (!canEditContract(user, contract.companyId, contract.createdBy?.toString(), contract.allowedEditors)) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        );
      }

      const versions = await getVersions(id);
      return NextResponse.json({ versions });
    } catch (error) {
      console.error('Error fetching versions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch versions' },
        { status: 500 }
      );
    }
  })(req);
}

// POST - Create new version
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return requireAuth(async (req: NextRequest, user) => {
    try {
      const { id } = await params;
      await connectDB();

      const contract = await Contract.findById(id);
      if (!contract) {
        return NextResponse.json(
          { error: 'Contract not found' },
          { status: 404 }
        );
      }

      // Check access based on role
      if (!canEditContract(user, contract.companyId, contract.createdBy?.toString(), contract.allowedEditors)) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        );
      }

      const body = await req.json();
      const { content, changeSummary } = body;

      if (!content) {
        return NextResponse.json(
          { error: 'Content is required' },
          { status: 400 }
        );
      }

      const versionId = await createVersion(id, content, user.id, changeSummary);
      return NextResponse.json({ versionId }, { status: 201 });
    } catch (error) {
      console.error('Error creating version:', error);
      return NextResponse.json(
        { error: 'Failed to create version' },
        { status: 500 }
      );
    }
  })(req);
}

