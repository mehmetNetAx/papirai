import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import connectDB from '@/lib/db/connection';
import HelpDocument from '@/lib/db/models/HelpDocument';
import { z } from 'zod';

// Validation schema
const helpDocumentSchema = z.object({
  module: z.string().min(1),
  title: z.string().min(1),
  content: z.string().min(1),
  order: z.number().default(0),
  isActive: z.boolean().default(true),
  images: z.array(z.string()).optional(),
  metadata: z.object({
    videoUrl: z.string().url().optional(),
    tags: z.array(z.string()).optional(),
    relatedModules: z.array(z.string()).optional(),
  }).optional(),
});

// GET - List help documents (optionally filtered by module)
export async function GET(req: NextRequest) {
  return requireAuth(async (req: NextRequest, user) => {
    try {
      await connectDB();

      const { searchParams } = new URL(req.url);
      const module = searchParams.get('module');
      const isActive = searchParams.get('isActive');

      const query: any = {};
      
      if (module) {
        query.module = module;
      }
      
      if (isActive !== null) {
        query.isActive = isActive === 'true';
      }

      const helpDocuments = await HelpDocument.find(query)
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email')
        .sort({ module: 1, order: 1, createdAt: -1 })
        .lean();

      return NextResponse.json({ helpDocuments });
    } catch (error: any) {
      console.error('Error fetching help documents:', error);
      return NextResponse.json(
        { error: 'Failed to fetch help documents' },
        { status: 500 }
      );
    }
  })(req);
}

// POST - Create help document (admin only)
export async function POST(req: NextRequest) {
  return requireAuth(async (req: NextRequest, user) => {
    try {
      // Check if user is admin
      if (!['system_admin', 'group_admin', 'company_admin'].includes(user.role)) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        );
      }

      await connectDB();

      const body = await req.json();
      const validatedData = helpDocumentSchema.parse(body);

      const helpDocument = await HelpDocument.create({
        ...validatedData,
        createdBy: user.id,
      });

      const populated = await HelpDocument.findById(helpDocument._id)
        .populate('createdBy', 'name email')
        .lean();

      return NextResponse.json({ helpDocument: populated }, { status: 201 });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return NextResponse.json(
          { error: 'Validation error', details: error.errors },
          { status: 400 }
        );
      }

      console.error('Error creating help document:', error);
      return NextResponse.json(
        { error: 'Failed to create help document' },
        { status: 500 }
      );
    }
  })(req);
}

