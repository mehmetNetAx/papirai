import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import Contract from '@/lib/db/models/Contract';
import { requireAuth } from '@/lib/auth/middleware';
import { exportToWord, exportToPDF } from '@/lib/services/export';
import mongoose from 'mongoose';

// GET - Export contract
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return requireAuth(async (req: NextRequest, user) => {
    try {
      const { id } = await params;
      const { searchParams } = new URL(req.url);
      const format = searchParams.get('format') || 'pdf';

      await connectDB();

      const contract = await Contract.findById(id);
      if (!contract || !contract.isActive) {
        return NextResponse.json(
          { error: 'Contract not found' },
          { status: 404 }
        );
      }

      // Check access permission
      const { canAccessCompany } = await import('@/lib/utils/permissions');
      const contractCompanyId = contract.companyId instanceof mongoose.Types.ObjectId
        ? contract.companyId.toString()
        : String(contract.companyId);
      
      if (!canAccessCompany(user, contractCompanyId)) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        );
      }

      let buffer: Buffer;
      let contentType: string;
      let filename: string;

      if (format === 'word' || format === 'docx') {
        buffer = await exportToWord(id);
        contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        filename = `${contract.title}.docx`;
      } else {
        buffer = await exportToPDF(id);
        contentType = 'application/pdf';
        filename = `${contract.title}.pdf`;
      }

      // Encode filename for Content-Disposition header (RFC 5987)
      // Create a safe ASCII filename for compatibility
      const safeFilename = filename
        .replace(/[^\x20-\x7E]/g, '_') // Replace non-ASCII characters with underscore
        .replace(/[<>:"/\\|?*]/g, '_') // Replace invalid filename characters
        .substring(0, 200); // Limit length
      
      // Use RFC 5987 encoding for proper UTF-8 support
      // encodeURIComponent handles Turkish characters correctly
      const encodedFilename = encodeURIComponent(filename);
      const contentDisposition = `attachment; filename="${safeFilename}"; filename*=UTF-8''${encodedFilename}`;

      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': contentDisposition,
        },
      });
    } catch (error: any) {
      console.error('Error exporting contract:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to export contract' },
        { status: 500 }
      );
    }
  })(req);
}

