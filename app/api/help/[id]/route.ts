import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import connectDB from '@/lib/db/connection';
import HelpDocument from '@/lib/db/models/HelpDocument';
import { z } from 'zod';

// Validation schema for update
const updateHelpDocumentSchema = z.object({
  module: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  order: z.number().optional(),
  isActive: z.boolean().optional(),
  images: z.array(z.string()).optional(),
  metadata: z.object({
    videoUrl: z.string().url().optional(),
    tags: z.array(z.string()).optional(),
    relatedModules: z.array(z.string()).optional(),
  }).optional(),
});

// GET - Get single help document
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return requireAuth(async (req: NextRequest, user) => {
    try {
      const { id } = await params;
      await connectDB();

      const helpDocument = await HelpDocument.findById(id)
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email')
        .lean();

      if (!helpDocument) {
        return NextResponse.json(
          { error: 'Help document not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ helpDocument });
    } catch (error: any) {
      console.error('Error fetching help document:', error);
      return NextResponse.json(
        { error: 'Failed to fetch help document' },
        { status: 500 }
      );
    }
  })(req);
}

// PATCH - Update help document (admin only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return requireAuth(async (req: NextRequest, user) => {
    try {
      // Check if user is admin
      if (!['system_admin', 'group_admin', 'company_admin'].includes(user.role)) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        );
      }

      const { id } = await params;
      await connectDB();

      const body = await req.json();
      const validatedData = updateHelpDocumentSchema.parse(body);

      const helpDocument = await HelpDocument.findByIdAndUpdate(
        id,
        {
          ...validatedData,
          updatedBy: user.id,
        },
        { new: true, runValidators: true }
      )
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email')
        .lean();

      if (!helpDocument) {
        return NextResponse.json(
          { error: 'Help document not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ helpDocument });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return NextResponse.json(
          { error: 'Validation error', details: error.errors },
          { status: 400 }
        );
      }

      console.error('Error updating help document:', error);
      return NextResponse.json(
        { error: 'Failed to update help document' },
        { status: 500 }
      );
    }
  })(req);
}

// DELETE - Delete help document (admin only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return requireAuth(async (req: NextRequest, user) => {
    try {
      // Check if user is admin
      if (!['system_admin', 'group_admin', 'company_admin'].includes(user.role)) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        );
      }

      const { id } = await params;
      await connectDB();

      const helpDocument = await HelpDocument.findByIdAndDelete(id);

      if (!helpDocument) {
        return NextResponse.json(
          { error: 'Help document not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ message: 'Help document deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting help document:', error);
      return NextResponse.json(
        { error: 'Failed to delete help document' },
        { status: 500 }
      );
    }
  })(req);
}

