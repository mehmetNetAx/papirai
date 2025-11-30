import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import { requireAuth } from '@/lib/auth/middleware';
import { importDocument } from '@/lib/services/import';

// POST - Import contract
export async function POST(req: NextRequest) {
  return requireAuth(async (req: NextRequest, user) => {
    try {
      await connectDB();

      const formData = await req.formData();
      const file = formData.get('file') as File;
      const title = formData.get('title') as string;
      const workspaceId = formData.get('workspaceId') as string;
      const useAI = formData.get('useAI') !== 'false'; // Default to true

      if (!file || !title || !workspaceId) {
        return NextResponse.json(
          { error: 'File, title, and workspace ID are required' },
          { status: 400 }
        );
      }

      // Validate file type
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      const allowedExtensions = ['pdf', 'doc', 'docx', 'txt'];
      if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
        return NextResponse.json(
          { error: 'Invalid file type. Only PDF, Word (DOC/DOCX), and TXT files are allowed.' },
          { status: 400 }
        );
      }

      const contractId = await importDocument(
        file, 
        file.name, 
        {
          title,
          workspaceId,
          companyId: user.companyId,
          createdBy: user.id,
        },
        { useAI: useAI === true || useAI === 'true' }
      );

      return NextResponse.json({ contractId }, { status: 201 });
    } catch (error: any) {
      console.error('Error importing contract:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to import contract' },
        { status: 500 }
      );
    }
  })(req);
}

