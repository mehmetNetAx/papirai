import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import User from '@/lib/db/models/User';
import Company from '@/lib/db/models/Company';
import { registerSchema } from '@/lib/utils/validation';
import mongoose from 'mongoose';

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
    let companyId: mongoose.Types.ObjectId;
    if (validatedData.companyId) {
      // Validate that the company exists
      const company = await Company.findById(validatedData.companyId);
      if (!company) {
        return NextResponse.json(
          { error: 'Company not found' },
          { status: 400 }
        );
      }
      companyId = new mongoose.Types.ObjectId(validatedData.companyId);
    } else {
      let defaultCompany = await Company.findOne({ type: 'group', isActive: true });
      if (!defaultCompany) {
        // Create a default company
        defaultCompany = await Company.create({
          name: 'Default Company',
          type: 'group',
          isActive: true,
        });
      }
      companyId = defaultCompany._id;
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

    // Handle MongoDB duplicate key error
    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Handle MongoDB validation errors
    if (error.name === 'ValidationError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.message },
        { status: 400 }
      );
    }

    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Failed to create user', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}

