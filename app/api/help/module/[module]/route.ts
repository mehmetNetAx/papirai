import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import connectDB from '@/lib/db/connection';
import HelpDocument from '@/lib/db/models/HelpDocument';

// GET - Get help documents for a specific module
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ module: string }> }
) {
  return requireAuth(async (req: NextRequest, user) => {
    try {
      const { module } = await params;
      await connectDB();

      const helpDocuments = await HelpDocument.find({
        module: decodeURIComponent(module),
        isActive: true,
      })
        .populate('createdBy', 'name email')
        .sort({ order: 1, createdAt: -1 })
        .lean();

      return NextResponse.json({ helpDocuments });
    } catch (error: any) {
      console.error('Error fetching help documents for module:', error);
      return NextResponse.json(
        { error: 'Failed to fetch help documents' },
        { status: 500 }
      );
    }
  })(req);
}

