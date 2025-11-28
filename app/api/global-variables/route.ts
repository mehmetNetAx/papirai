import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import GlobalVariable from '@/lib/db/models/GlobalVariable';
import { requireAuth } from '@/lib/auth/middleware';

// GET - List all active global variables
export async function GET(req: NextRequest) {
  return requireAuth(async (req: NextRequest, user) => {
    try {
      await connectDB();

      const { searchParams } = new URL(req.url);
      const category = searchParams.get('category');
      const search = searchParams.get('search');

      const query: any = { isActive: true };

      if (category) {
        query.category = category;
      }

      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
        ];
      }

      const variables = await GlobalVariable.find(query)
        .populate('createdBy', 'name')
        .sort({ category: 1, name: 1 })
        .lean();

      return NextResponse.json({ variables });
    } catch (error) {
      console.error('Error fetching global variables:', error);
      return NextResponse.json(
        { error: 'Failed to fetch global variables' },
        { status: 500 }
      );
    }
  })(req);
}

// POST - Create a new global variable
export async function POST(req: NextRequest) {
  return requireAuth(async (req: NextRequest, user) => {
    try {
      await connectDB();

      const body = await req.json();
      const { name, type, defaultValue, description, category, metadata } = body;

      if (!name || !type) {
        return NextResponse.json(
          { error: 'Name and type are required' },
          { status: 400 }
        );
      }

      // Check if variable with same name already exists
      const existing = await GlobalVariable.findOne({ name, isActive: true });
      if (existing) {
        return NextResponse.json(
          { error: 'A global variable with this name already exists' },
          { status: 409 }
        );
      }

      const variable = await GlobalVariable.create({
        name,
        type,
        defaultValue,
        description,
        category,
        metadata,
        createdBy: user.id,
      });

      return NextResponse.json({ variable }, { status: 201 });
    } catch (error: any) {
      console.error('Error creating global variable:', error);
      return NextResponse.json(
        { error: 'Failed to create global variable' },
        { status: 500 }
      );
    }
  })(req);
}

