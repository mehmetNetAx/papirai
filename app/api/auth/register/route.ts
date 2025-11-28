import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import User from '@/lib/db/models/User';
import Company from '@/lib/db/models/Company';
import { registerSchema } from '@/lib/utils/validation';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const validatedData = registerSchema.parse(body);

    // Check if user already exists
    const existingUser = await User.findOne({ email: validatedData.email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // If no companyId provided, create a default company or use first available
    let companyId = validatedData.companyId;
    if (!companyId) {
      let defaultCompany = await Company.findOne({ type: 'group', isActive: true });
      if (!defaultCompany) {
        // Create a default company
        defaultCompany = await Company.create({
          name: 'Default Company',
          type: 'group',
          isActive: true,
        });
      }
      companyId = defaultCompany._id.toString();
    }

    // Create user with viewer role by default
    const user = await User.create({
      email: validatedData.email.toLowerCase(),
      password: validatedData.password,
      name: validatedData.name,
      role: 'viewer',
      companyId,
      isActive: true,
    });

    return NextResponse.json(
      {
        message: 'User created successfully',
        userId: user._id.toString(),
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}

